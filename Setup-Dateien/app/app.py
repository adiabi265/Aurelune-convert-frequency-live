"""Aurelune Studio – system-wide 432 Hz / Solfeggio tuner."""
import functools
import json
import logging
import os
import subprocess
import sys
import threading
import time
import traceback

APP_DIR = os.path.join(os.path.expanduser('~'), '.aurelune')
os.makedirs(APP_DIR, exist_ok=True)
LOG = os.path.join(APP_DIR, 'aurelune.log')
logging.basicConfig(filename=LOG, level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s', encoding='utf-8')
log = logging.getLogger('aurelune')

try:  # native crashes (e.g. WinForms/.NET) leave no Python traceback - dump them here
    import faulthandler
    _CRASH_FH = open(os.path.join(APP_DIR, 'crash.log'), 'a', encoding='utf-8')
    faulthandler.enable(file=_CRASH_FH, all_threads=True)
except Exception:
    _CRASH_FH = None

import engine as eng  # noqa: E402
import winaudio       # noqa: E402

CFG = os.path.join(APP_DIR, 'settings.json')
HERE = os.path.dirname(os.path.abspath(__file__))
def _read_version():
    try:
        with open(os.path.join(HERE, 'version.txt'), encoding='utf-8') as f:
            return f.read().strip() or '0'
    except Exception:
        return '0'


VERSION = _read_version()
IS_WIN = sys.platform.startswith('win')
TITLE = 'Aurelune Studio'


def resource(rel):
    return os.path.join(getattr(sys, '_MEIPASS', HERE), rel)


def load_cfg():
    try:
        with open(CFG, encoding='utf-8-sig') as f:
            return json.load(f)
    except Exception:
        return {}


def save_cfg(cfg):
    tmp = CFG + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)
    os.replace(tmp, CFG)


def safe(fn):
    """Never let an exception reach the UI silently – log it and return an error object."""
    @functools.wraps(fn)
    def wrap(*a, **k):
        try:
            return fn(*a, **k)
        except Exception as e:
            log.error('%s failed: %s\n%s', fn.__name__, e, traceback.format_exc())
            return {'ok': False, 'code': str(e) if str(e).startswith('E_') else 'E_GENERIC', 'error': str(e)}
    return wrap


class Api:
    def __init__(self):
        self._engine = eng.Engine()
        self._cfg = load_cfg()
        self._engine.update(self._cfg.get('settings', {}))
        self._engine.settings['enabled'] = True
        self._lock = threading.RLock()
        self._real_dev = None
        self._switched = False
        self._app_routed = None
        self._last_poll = time.time()
        self._window = None
        self._watch_gen = 0
        self._rev = 0                      # 3.14: bumped when tray / routines change settings -> UI reloads
        self._mini = False
        st = self._engine.settings          # a session never survives a restart
        st['session'] = None
        st['gw'] = None
        st['sleep_t0'] = time.time() if st.get('sleep_on') else 0.0
        st['breath_t0'] = time.time()
        threading.Thread(target=self._routine_loop, daemon=True).start()

    def _route_apps(self):
        value = self._cfg.get('route_apps')
        if isinstance(value, list):
            return list(dict.fromkeys(str(x).strip().lower() for x in value if str(x).strip()))
        legacy = str(self._cfg.get('route_app', '')).strip().lower()
        return [] if legacy in ('', 'all') else [legacy]

    # ---------- info ----------
    @safe
    def get_state(self):
        devs = eng.list_devices(refresh=not self._engine.running)
        outs = [d for d in devs['outputs'] if not d['virtual']]
        auto = self._auto_output_name(outs)
        return {
            'ok': True, 'version': VERSION, 'platform': sys.platform, 'lang': self._cfg.get('lang', 'en'),
            'devices': devs, 'outputs': [d['name'] for d in outs], 'auto_out': auto,
            'out_choice': self._cfg.get('out_choice', 'auto'),
            'settings': self._engine.settings, 'ui': self._cfg.get('ui', {}),
            'auto_switch': winaudio.available(),
            'route_apps': self._route_apps(), 'audio_apps': winaudio.list_apps(),
            'manual_in': self._cfg.get('manual_in'), 'device_mode': self._cfg.get('device_mode', 'auto'),
            'autostart': self.get_autostart(), 'power': bool(self._cfg.get('power', False)),
            'check': winaudio.cable_check(), 'log': LOG,
        }

    @safe
    def system_check(self):
        c = winaudio.cable_check()
        c['ok'] = True
        c['running'] = self._engine.running
        c['devices'] = list(self._engine.devices) if self._engine.running else None
        return c

    @safe
    def fix_cable(self):
        was = self._engine.running
        if was:
            self.power_off(remember=False)
        chk = winaudio.cable_check()
        vb = None
        if not chk['installed']:
            for root, _, files in os.walk(os.path.join(HERE, 'vbcable')):
                for f in files:
                    if f.lower() == 'vbcable_setup_x64.exe':
                        vb = os.path.join(root, f)
            if not vb:
                self.open_url('https://vb-audio.com/Cable/')
                return {'ok': False, 'code': 'E_NO_CABLE_SETUP'}
        ok = winaudio.fix_cable(vb)
        time.sleep(1.5)
        eng.refresh_portaudio()
        res = winaudio.cable_check()
        res['ok'] = bool(ok)
        if was and res['active']:
            self.power_on()
        return res

    # ---------- updates ----------
    def _updater(self):
        if getattr(self, '_upd', None) is None:
            import updater
            self._upd = updater.Updater(VERSION, self._cfg.get('update_repo'), self._cfg.get('update_branch'))
        return self._upd

    @safe
    def update_check(self, force=False):
        auto = self._cfg.get('auto_update', True)
        u = self._updater()
        fresh = u.state.get('checked') and time.time() - u.state['checked'] < 3600
        r = dict(u.state) if (not force and (not auto or fresh)) else u.check()
        r.update(ok=True, auto=auto)
        return r

    @safe
    def update_status(self):
        r = dict(self._updater().state)
        r.update(ok=True, auto=self._cfg.get('auto_update', True))
        return r

    @safe
    def set_auto_update(self, on):
        self._cfg['auto_update'] = bool(on)
        save_cfg(self._cfg)
        return {'ok': True, 'auto': bool(on)}

    @safe
    def update_install(self):
        def before():
            try:
                self.power_off(remember=False)
            except Exception:
                log.exception('power_off before update failed')

        def after():
            def quit_later():
                time.sleep(2.0)
                try:
                    if self._window:
                        self._window.destroy()
                except Exception:
                    pass
                time.sleep(4.0)
                os._exit(0)
            threading.Thread(target=quit_later, daemon=True).start()
        r = self._updater().install(before, after)
        r['ok'] = True
        return r

    # ---------- devices ----------
    def _auto_output_name(self, outs=None):
        """Main speaker = the device Windows used before Aurelune (e.g. "SteelSeries Sonar - Gaming")."""
        if outs is None:
            outs = [d for d in eng.list_devices()['outputs'] if not d['virtual']]
        names = [d['name'] for d in outs]
        real = self._real_windows_device()
        if real:
            m = next((n for n in names if winaudio.name_match(n, real['name'])), None)
            if m:
                return m
        sonar = next((n for n in names if 'sonar' in n.lower() and 'gaming' in n.lower()), None)
        return sonar or (names[0] if names else None)

    def _real_windows_device(self):
        if not winaudio.available():
            return None
        cur = winaudio.get_default()
        if cur and not winaudio.is_virtual(cur['name']):
            return cur
        saved = self._cfg.get('real_out')
        cands = [d for d in winaudio.list_outputs() if not winaudio.is_virtual(d['name'])]
        hit = next((d for d in cands if saved and d['id'] == saved.get('id')), None)
        if hit:
            return hit
        sonar = next((d for d in cands if 'sonar' in d['name'].lower() and 'gaming' in d['name'].lower()), None)
        return sonar or (cands[0] if cands else None)

    def _pick_devices(self):
        devs = eng.list_devices(refresh=True)
        ins, outs = devs['inputs'], [d for d in devs['outputs'] if not d['virtual']]
        if self._cfg.get('device_mode', 'auto') == 'manual' and self._cfg.get('manual_in'):
            cable_in = next((d for d in ins if d['name'] == self._cfg.get('manual_in')), None)
        else:
            cable_in = next((d for d in ins if d['virtual'] and 'output' in d['name'].lower()), None) \
                or next((d for d in ins if d['virtual']), None)
        if not cable_in:
            chk = winaudio.cable_check()
            if chk['disabled']:
                raise RuntimeError('E_CABLE_DISABLED')
            if chk['installed']:
                raise RuntimeError('E_REBOOT')
            raise RuntimeError('E_NO_CABLE')
        choice = self._cfg.get('out_choice', 'auto')
        name = choice if choice != 'auto' else self._auto_output_name(outs)
        out = next((d for d in outs if d['name'] == name), None) or (outs[0] if outs else None)
        if not out:
            raise RuntimeError('E_NO_OUTPUT')
        real = None
        if winaudio.available():
            real = next((d for d in winaudio.list_outputs() if winaudio.name_match(d['name'], out['name'])), None) \
                or self._real_windows_device()
        return cable_in, out, real

    # ---------- power ----------
    @safe
    def power_on(self):
        with self._lock:
            try:
                i, o, real = self._pick_devices()
                log.info('power on: in=%s out=%s real=%s', i['name'], o['name'], real and real['name'])
                self._engine.start(i['index'], o['index'])
                if real and winaudio.available():
                    self._real_dev = real
                    self._cfg['real_out'] = real
                    winaudio.remember_real(real)
                    cable = winaudio.find_cable_output()
                    routes = self._route_apps()
                    if sys.platform.startswith('win') and '*' not in routes:
                        # Windows stays on the normal speaker; only selected apps enter VB-CABLE.
                        cur = winaudio.get_default()
                        if cur and winaudio.is_virtual(cur['name']):
                            winaudio.set_default(real)
                        self._app_routed = routes
                        for route in routes:
                            if not cable or not winaudio.route_app(route, cable):
                                log.info('selected app is not running yet: %s', route)
                    elif cable and winaudio.set_default(cable):
                        self._switched = True
                    else:
                        log.warning('could not switch default device to CABLE Input')
                self._cfg['power'] = True
                save_cfg(self._cfg)
                if self._switched or self._app_routed:
                    self._watch_gen += 1
                    target = self._watchdog if self._switched else self._app_watchdog
                    threading.Thread(target=target, args=(self._watch_gen,), daemon=True).start()
                return {'ok': True, 'devices': list(self._engine.devices), 'switched': self._switched}
            except Exception:
                self._engine.stop()
                raise

    def _app_watchdog(self, gen):
        """Apply the selected per-app route when the app starts or spawns a new audio process."""
        while gen == self._watch_gen and self._engine.running and self._app_routed:
            try:
                cable = winaudio.find_cable_output()
                if cable:
                    for route in list(self._app_routed):
                        winaudio.route_app(route, cable)
            except Exception as e:
                log.warning('app route watchdog: %s', e)
            time.sleep(3)

    def _watchdog(self, gen):
        """Keeps the routing intact while Aurelune is on. Some tools (e.g. SteelSeries Sonar) set themselves
        as default device again – then we switch back to CABLE Input. If the user picks another real device,
        it becomes the new main speaker automatically."""
        while gen == self._watch_gen and self._engine.running and self._switched:
            time.sleep(3)
            if gen != self._watch_gen or not self._engine.running:
                return
            try:
                cur = winaudio.get_default()
                if not cur or winaudio.is_virtual(cur['name']):
                    continue
                with self._lock:
                    if gen != self._watch_gen or not self._engine.running:
                        return
                    same = self._real_dev and cur['id'] == self._real_dev.get('id')
                    log.info('default device changed to %s (same as main: %s)', cur['name'], same)
                    if not same and self._cfg.get('out_choice', 'auto') == 'auto':
                        self._real_dev = cur
                        self._cfg['real_out'] = cur
                        save_cfg(self._cfg)
                        self._switched = False      # restart on the new speaker
                        self._engine.stop()
                        r = self.power_on()
                        log.info('restarted on new main speaker: %s', r)
                        return                      # power_on started a new watchdog
                    cable = winaudio.find_cable_output()
                    if cable:
                        winaudio.set_default(cable)
            except Exception as e:
                log.warning('watchdog: %s', e)

    @safe
    def power_off(self, remember=True):
        with self._lock:
            self._watch_gen += 1
            if self._app_routed:
                for route in list(self._app_routed):
                    try:
                        winaudio.route_app(route, None)
                    except Exception:
                        pass
                self._app_routed = None
            if self._switched and self._real_dev:
                try:
                    winaudio.set_default(self._real_dev)
                except Exception:
                    pass
                self._switched = False
            self._engine.stop()
            if remember:
                self._cfg['power'] = False
                save_cfg(self._cfg)
            return {'ok': True}

    @safe
    def reset_sound(self):
        """Emergency: route sound back to the real speakers."""
        self.power_off()
        dev = self._real_windows_device()
        if dev and winaudio.set_default(dev):
            return {'ok': True, 'device': dev['name']}
        return {'ok': False, 'code': 'E_RESET'}

    # ---------- settings ----------
    @safe
    def set_settings(self, patch, ui=None):
        restart = self._engine.running and any(k in patch and patch[k] != self._engine.settings.get(k) for k in ('quality', 'precision', 'lock_s', 'low_latency'))
        self._engine.update(patch)
        self._cfg['settings'] = {k: v for k, v in self._engine.settings.items() if k != 'enabled'}
        if ui:
            self._cfg['ui'] = {**self._cfg.get('ui', {}), **ui}
        save_cfg(self._cfg)
        if restart:
            self.power_off(remember=False)
            self.power_on()
        return self._engine.settings

    @safe
    def set_lang(self, lang):
        self._cfg['lang'] = 'de' if lang == 'de' else 'en'
        save_cfg(self._cfg)
        return self._cfg['lang']

    @safe
    def bypass(self, on):
        self._engine.update({'enabled': not on})
        return True

    @safe
    def set_output(self, name):
        self._cfg['out_choice'] = name or 'auto'
        save_cfg(self._cfg)
        if self._engine.running:
            self.power_off(remember=False)
            return self.power_on()
        return {'ok': True}

    @safe
    def set_route_apps(self, names):
        if not isinstance(names, list):
            names = [names] if names else []
        clean = list(dict.fromkeys(str(x).strip().lower() for x in names if str(x).strip()))
        if '*' in clean:
            clean = ['*']
        self._cfg['route_apps'] = clean
        self._cfg.pop('route_app', None)
        save_cfg(self._cfg)
        if self._engine.running:
            self.power_off(remember=False)
            result = self.power_on()
        else:
            result = {'ok': True}
        result['route_apps'] = clean
        result['audio_apps'] = winaudio.list_apps()
        return result

    @safe
    def set_route_app(self, name):
        # Compatibility for older UI code.
        return self.set_route_apps([name] if name and name != 'all' else [])

    @safe
    def set_devices(self, mode, in_name=None):
        self._cfg['device_mode'] = mode
        if in_name is not None:
            self._cfg['manual_in'] = in_name
        save_cfg(self._cfg)
        if self._engine.running:
            self.power_off(remember=False)
            return self.power_on()
        return {'ok': True}

    @safe
    def remeasure(self):
        if self._engine.running:
            self._engine.shifter.detector.reset()
            self._engine.probe_out.detector.reset()
        return True

    def status(self):
        self._last_poll = time.time()
        try:
            r = self._engine.status()
        except Exception as e:
            r = {'running': False, 'error': str(e)}
        r['rev'] = self._rev
        return r

    # ---------- 3.14 wellness ----------
    def _apply(self, patch, ui=None):
        """Settings change from outside the window (tray, routines) -> UI reloads its state."""
        r = self.set_settings(patch, ui)
        self._rev += 1
        return r

    @safe
    def well_info(self):
        import wellness
        return {'ok': True, 'sessions': wellness.session_info(), 'routines': self._routines(), 'tray': self._cfg.get('tray', True)}

    @safe
    def start_session(self, sid, mode=None, external=False):
        import wellness
        if sid not in wellness.SESSIONS:
            return {'ok': False, 'code': 'E_GENERIC', 'error': 'unknown session'}
        if not self._engine.running:
            r = self.power_on()
            if not r or r.get('ok') is False:
                return r
        patch = {'session': {'id': sid, 't0': time.time(), 'mode': mode or self._engine.settings.get('beat_mode', 'isochronic')},
                 'binaural': False}
        if sid == 'sleep' and self._cfg.get('sleep_with_noise', True):
            patch.update(sleep_on=True, sleep_t0=time.time())
        (self._apply if external else self.set_settings)(patch)
        return {'ok': True, 'session': self._engine.settings['session']}

    @safe
    def stop_session(self, external=False):
        (self._apply if external else self.set_settings)({'session': None})
        return {'ok': True}

    @safe
    def strike(self, freq, kind='bowl', level=0.6):
        """Singing bowl / gong through the engine (after the pitch shifter -> exact Hz). Off -> UI plays it itself."""
        if not self._engine.running:
            return {'ok': False, 'code': 'E_OFF'}
        threading.Thread(target=self._engine.well.bowls.strike, args=(float(freq), kind, float(level)), daemon=True).start()
        return {'ok': True}

    # ---------- 3.15 brainwave player (Spotify-like: play/pause, skip, seek) ----------
    def _bw_playing(self):
        st = self._engine.settings
        g, ses = st.get('gw'), st.get('session')
        if isinstance(g, dict):
            return not g.get('paused')
        if isinstance(ses, dict):
            return not ses.get('paused_at')
        return bool(st.get('binaural') or st.get('beat_on'))

    @safe
    def bw_info(self):
        import gateway
        return {'ok': True, **gateway.info(), 'last': self._cfg.get('bw_last')}

    def _bw_set(self, patch, external=False):
        (self._apply if external else self.set_settings)(patch)
        return {'ok': True, 'settings': self._engine.settings}

    def _gw_pos(self, g):
        return float(g.get('pos0', 0.0)) + (0.0 if g.get('paused') else time.time() - float(g.get('t0') or time.time()))

    @safe
    def bw_play(self, jid='gateway', track=0, pos=0.0, external=False):
        import gateway
        if jid not in gateway.JOURNEYS:
            return {'ok': False, 'code': 'E_GENERIC', 'error': 'unknown journey'}
        if not self._engine.running:
            r = self.power_on()
            if not r or r.get('ok') is False:
                return r
        n = len(gateway.JOURNEYS[jid]['tracks'])
        track = min(max(0, int(track or 0)), n - 1)
        self._cfg['bw_last'] = {'src': 'gw', 'id': jid}
        return self._bw_set({'gw': {'id': jid, 'track': track, 'pos0': max(0.0, float(pos or 0)), 't0': time.time(), 'paused': False},
                             'session': None, 'binaural': False, 'beat_on': False}, external)

    @safe
    def bw_toggle(self, external=False):
        """The one play/pause button: pauses / resumes whatever brainwave sound is playing right now."""
        st = self._engine.settings
        now = time.time()
        g = st.get('gw')
        if isinstance(g, dict):
            if g.get('paused'):
                if not self._engine.running:
                    self.power_on()
                return self._bw_set({'gw': {**g, 'paused': False, 't0': now}}, external)
            return self._bw_set({'gw': {**g, 'paused': True, 'pos0': self._gw_pos(g)}}, external)
        ses = st.get('session')
        if isinstance(ses, dict):
            if ses.get('paused_at'):
                ns = {k: v for k, v in ses.items() if k != 'paused_at'}
                ns['t0'] = float(ses.get('t0') or now) + now - float(ses['paused_at'])
                return self._bw_set({'session': ns}, external)
            return self._bw_set({'session': {**ses, 'paused_at': now}}, external)
        if st.get('binaural'):
            self._cfg['bw_last'] = {'src': 'layers'}
            return self._bw_set({'binaural': False}, external)
        if st.get('beat_on'):
            self._cfg['bw_last'] = {'src': 'beat'}
            return self._bw_set({'beat_on': False}, external)
        last = self._cfg.get('bw_last') or {}
        if not self._engine.running:
            r = self.power_on()
            if not r or r.get('ok') is False:
                return r
        if last.get('src') == 'layers':
            return self._bw_set({'binaural': True}, external)
        if last.get('src') == 'beat':
            return self._bw_set({'beat_on': True}, external)
        return self.bw_play(last.get('id') or 'gateway', 0, 0.0, external)

    @safe
    def bw_skip(self, d=1, external=False):
        """Next / previous: journey track, session step, layer preset or beat frequency."""
        import gateway
        import wellness
        st = self._engine.settings
        d = 1 if int(d or 1) > 0 else -1
        now = time.time()
        g = st.get('gw')
        if isinstance(g, dict) and g.get('id') in gateway.JOURNEYS:
            n = len(gateway.JOURNEYS[g['id']]['tracks'])
            tr = int(g.get('track', 0))
            if d < 0 and self._gw_pos(g) > 5:
                pass                                   # like Spotify: first press = back to the start of the track
            else:
                tr += d
            if tr >= n:
                return self._bw_set({'gw': None}, external)
            return self._bw_set({'gw': {**g, 'track': max(0, tr), 'pos0': 0.0, 't0': now}}, external)
        ses = st.get('session')
        if isinstance(ses, dict) and ses.get('id') in wellness.SESSIONS:
            steps = [x[0] for x in wellness.SESSIONS[ses['id']]['steps']]
            ref = float(ses.get('paused_at') or now)
            el = ref - float(ses.get('t0') or now)
            starts = [sum(steps[:i]) for i in range(len(steps))]
            i = max(i for i, a in enumerate(starts) if a <= el + 0.01)
            if d < 0 and el - starts[i] > 5:
                tgt = starts[i]
            else:
                j = i + d
                if j >= len(steps):
                    return self._bw_set({'session': None}, external)
                tgt = starts[max(0, j)]
            return self._bw_set({'session': {**ses, 't0': ref - tgt}}, external)
        if st.get('binaural'):
            order = ['delta', 'theta', 'alpha', 'gateway', 'septa']
            cur = st.get('bin_preset') if st.get('bin_preset') in order else 'gateway'
            return self._bw_set({'bin_preset': order[(order.index(cur) + d) % len(order)]}, external)
        if st.get('beat_on'):
            order = [2.0, 4.0, 6.0, 7.83, 10.0, 16.0, 40.0]
            cur = float(st.get('beat_hz', 10.0))
            i = min(range(len(order)), key=lambda k: abs(order[k] - cur))
            return self._bw_set({'beat_hz': order[(i + d) % len(order)]}, external)
        return self.bw_play('gateway', 0 if d > 0 else 0, 0.0, external)

    @safe
    def bw_seek(self, pos, track=None):
        g = self._engine.settings.get('gw')
        if not isinstance(g, dict):
            return {'ok': False}
        ng = {**g, 'pos0': max(0.0, float(pos)), 't0': time.time()}
        if track is not None:
            ng['track'] = int(track)
        return self._bw_set({'gw': ng})

    @safe
    def bw_stop(self, external=False):
        return self._bw_set({'gw': None}, external)

    @safe
    def mix_optimize(self):
        """3.17 one-click optimal mix: measures what plays right now and sets every added sound to a level that sits
        clearly under the music (or, without music, at a calm listening level). Auto-Mix + ear guard stay on."""
        e, s = self._engine, self._engine.settings
        mx = getattr(e, 'mix', None) if e.running else None
        music = bool(mx and mx.music_present())
        mus = mx.mus_long if music else 0.0
        meas = dict(mx.rms) if mx else {}
        patch, ch = {'mix_auto': True, 'mix_gap_db': 6.0, 'bin_auto': True, 'ear_on': True, 'ear_tame': True}, []

        def lin(db):
            return 10 ** (db / 20)

        def scale(key, src, rel, ab, lo, hi, default):
            cur = float(s.get(key, default))
            want = mus * lin(rel) if music else lin(ab)
            m = meas.get(src, 0.0)
            if m > 1e-5 and cur > 0:
                patch[key] = round(min(hi, max(lo, cur * want / m)), 3)
            else:
                patch[key] = default
        scale('beat_level', 'beat', -18, -30, 0.05, 1.0, 0.35)
        scale('sleep_level', 'sleep', -14, -24, 0.05, 1.0, 0.25 if music else 0.35)
        patch['gw_level'] = 0.5 if music else 0.57
        patch['gw_surf'] = 0.4
        if float(s.get('ear_max_db', -10.0)) > -10.0:
            patch['ear_max_db'] = -10.0
        for k, v in patch.items():
            if s.get(k) != v:
                ch.append({'key': k, 'old': s.get(k), 'new': v})
        st = self.set_settings(patch)
        log.info('mix_optimize music=%s changes=%s', music, [(c['key'], c['new']) for c in ch])
        return {'ok': True, 'settings': st, 'changes': ch, 'music': music,
                'music_db': (20 * __import__('math').log10(mus) if music else None), 'pl': {'mv': 0.8, 'nv': 0.3 if music else 0.45}}

    def _routines(self):
        r = self._cfg.get('routines')
        if not isinstance(r, dict):
            r = {'on': False, 'items': [{'t': '08:00', 'a': 'focus'}, {'t': '13:30', 'a': 'relax'}, {'t': '22:00', 'a': 'sleep'}]}
        return r

    @safe
    def set_routines(self, r):
        items = [{'t': str(i.get('t', '08:00'))[:5], 'a': i.get('a', 'focus')} for i in (r or {}).get('items', [])][:12]
        self._cfg['routines'] = {'on': bool((r or {}).get('on')), 'items': items}
        save_cfg(self._cfg)
        return {'ok': True, 'routines': self._cfg['routines']}

    def run_routine(self, action):
        log.info('routine: %s', action)
        if action in ('focus', 'relax', 'meditate', 'sleep', 'nap', 'gamma'):
            return self.start_session(action, external=True)
        if action == 'off':
            return self._apply({'session': None, 'mod_on': False, 'sleep_on': False, 'beat_on': False, 'breath_on': False})
        return {'ok': False}

    def _routine_loop(self):
        done = set()
        while True:
            time.sleep(15)
            try:
                r = self._routines()
                if not r.get('on'):
                    continue
                now = time.strftime('%H:%M')
                day = time.strftime('%Y-%m-%d')
                for it in r.get('items', []):
                    key = (day, it.get('t'), it.get('a'))
                    if it.get('t') == now and key not in done:
                        done.add(key)
                        self.run_routine(it.get('a'))
                        self._routine_msg = it.get('a')
            except Exception as e:
                log.warning('routine: %s', e)

    @safe
    def set_tray(self, on):
        self._cfg['tray'] = bool(on)
        save_cfg(self._cfg)
        if on:
            start_tray(self)
        else:
            stop_tray()
        return {'ok': True, 'tray': bool(on)}

    @safe
    def mini(self, on):
        """Mini player: small window that stays on top."""
        self._mini = bool(on)
        w = self._window
        if w is not None:
            try:
                w.on_top = self._mini
            except Exception:
                pass
            if self._mini:
                w.resize(380, 236)
            else:
                w.resize(1180, 780)
        return {'ok': True, 'mini': self._mini}

    def show_window(self):
        w = self._window
        if w is not None:
            try:
                w.restore()
            except Exception:
                pass
            try:
                w.show()
            except Exception:
                pass

    # ---------- system ----------
    def _launch_cmd(self):
        exe = sys.executable
        if exe.lower().endswith('python.exe'):
            exe = exe[:-10] + 'pythonw.exe'
        return f'"{exe}" "{os.path.join(HERE, "app.py")}" --minimized'

    def get_autostart(self):
        if not IS_WIN:
            return False
        try:
            import winreg
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r'Software\Microsoft\Windows\CurrentVersion\Run') as k:
                winreg.QueryValueEx(k, 'AureluneStudio')
                return True
        except Exception:
            return False

    @safe
    def set_autostart(self, on):
        if not IS_WIN:
            return False
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r'Software\Microsoft\Windows\CurrentVersion\Run', 0, winreg.KEY_SET_VALUE) as k:
            if on:
                winreg.SetValueEx(k, 'AureluneStudio', 0, winreg.REG_SZ, self._launch_cmd())
            else:
                try:
                    winreg.DeleteValue(k, 'AureluneStudio')
                except FileNotFoundError:
                    pass
        return self.get_autostart()

    @safe
    def open_sound_settings(self):
        if IS_WIN:
            subprocess.Popen(['control', 'mmsys.cpl', 'sounds'])
        elif sys.platform == 'darwin':
            subprocess.Popen(['open', '-b', 'com.apple.audio.AudioMIDISetup'])
        return True

    @safe
    def open_log(self):
        if IS_WIN:
            os.startfile(LOG)
        return LOG

    @safe
    def open_url(self, url):
        import webbrowser
        webbrowser.open(url)
        return True


# ---------------- Windows helpers ----------------
def win_app_id():
    if IS_WIN:
        try:
            import ctypes
            ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID('Aurelune.Studio')
        except Exception:
            pass


def win_set_icon(title=TITLE, tries=60):
    """pywebview shows the Python icon on Windows -> set the Aurelune icon (title bar + taskbar)."""
    if not IS_WIN:
        return
    import ctypes
    from ctypes import wintypes
    u = ctypes.windll.user32
    u.FindWindowW.restype = wintypes.HWND
    u.FindWindowW.argtypes = [wintypes.LPCWSTR, wintypes.LPCWSTR]
    u.LoadImageW.restype = wintypes.HANDLE
    u.LoadImageW.argtypes = [wintypes.HINSTANCE, wintypes.LPCWSTR, wintypes.UINT, ctypes.c_int, ctypes.c_int, wintypes.UINT]
    u.SendMessageW.restype = ctypes.c_ssize_t
    u.SendMessageW.argtypes = [wintypes.HWND, wintypes.UINT, ctypes.c_size_t, ctypes.c_ssize_t]
    ico = resource('aurelune.ico')
    if not os.path.exists(ico):
        return
    for _ in range(tries):
        hwnd = u.FindWindowW(None, title)
        if hwnd:
            small = u.LoadImageW(None, ico, 1, 16, 16, 0x10)   # IMAGE_ICON, LR_LOADFROMFILE
            big = u.LoadImageW(None, ico, 1, 48, 48, 0x10)
            if small:
                u.SendMessageW(hwnd, 0x80, 0, small)            # WM_SETICON, ICON_SMALL
            if big:
                u.SendMessageW(hwnd, 0x80, 1, big)              # ICON_BIG (taskbar / Alt+Tab)
            return
        time.sleep(0.25)


def single_instance():
    """Second start -> bring the existing window to the front instead of running two engines."""
    if not IS_WIN:
        return True
    import ctypes
    k = ctypes.windll.kernel32
    single_instance.mutex = k.CreateMutexW(None, False, 'Local\\AureluneStudioSingleInstance')
    if k.GetLastError() == 183:  # ERROR_ALREADY_EXISTS
        u = ctypes.windll.user32
        hwnd = u.FindWindowW(None, TITLE)
        if hwnd:
            u.ShowWindow(hwnd, 9)
            u.SetForegroundWindow(hwnd)
        return False
    return True


def webview2_installed():
    if not IS_WIN:
        return True
    import winreg
    gid = '{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
    for hive, path in ((winreg.HKEY_LOCAL_MACHINE, rf'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{gid}'),
                       (winreg.HKEY_LOCAL_MACHINE, rf'SOFTWARE\Microsoft\EdgeUpdate\Clients\{gid}'),
                       (winreg.HKEY_CURRENT_USER, rf'Software\Microsoft\EdgeUpdate\Clients\{gid}')):
        try:
            with winreg.OpenKey(hive, path) as k:
                pv = winreg.QueryValueEx(k, 'pv')[0]
                if pv and pv != '0.0.0.0':
                    return True
        except OSError:
            pass
    return False


# ---------------- fallback UI (Edge app window, always modern Chromium) ----------------
def run_browser_ui(api):
    import http.server
    import socketserver
    ui_dir = resource('ui')
    api._last_poll = time.time()

    class H(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=ui_dir, **k)

        def log_message(self, *a):
            pass

        def do_POST(self):
            name = self.path.strip('/').split('/')[-1]
            args = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))) or b'[]')
            fn = getattr(api, name, None)
            res = fn(*args) if callable(fn) and not name.startswith('_') else None
            body = json.dumps(res, default=float).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(body)

    class S(socketserver.ThreadingMixIn, http.server.HTTPServer):
        daemon_threads = True

    srv = S(('127.0.0.1', 0), H)
    url = f'http://127.0.0.1:{srv.server_address[1]}/index.html?bridge=http'
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    log.info('browser UI at %s', url)
    opened = False
    if IS_WIN:
        for p in (r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe', r'C:\Program Files\Microsoft\Edge\Application\msedge.exe'):
            if os.path.exists(p):
                prof = os.path.join(APP_DIR, 'edge-profile')
                subprocess.Popen([p, f'--app={url}', '--window-size=1180,780', f'--user-data-dir={prof}', '--no-first-run'])
                opened = True
                break
    if not opened:
        import webbrowser
        webbrowser.open(url)
    while time.time() - api._last_poll < 10:  # window closed -> no more polling
        time.sleep(1)
    api.power_off(remember=False)
    srv.shutdown()


_TRAY = {'icon': None}


def _tuning_a4(hz):
    import math
    n = round(12 * math.log2(hz / 440.0))
    return hz / 2 ** (n / 12) * 1.0 if hz != 432 else 432.0


def start_tray(api):
    """3.14: quick menu in the taskbar notification area (pystray). Never fatal."""
    if _TRAY['icon'] is not None or not IS_WIN:
        return
    try:
        import pystray
        from PIL import Image
    except Exception as e:
        log.warning('tray unavailable: %s', e)
        return
    de = api._cfg.get('lang') == 'de'
    L = (lambda d, e: d if de else e)

    def freq(hz):
        def f(icon, item):
            api._apply({'target_a4': _tuning_a4(hz)}, {'presetHz': hz})
        return f

    def ses(sid):
        def f(icon, item):
            api.start_session(sid, external=True)
        return f

    def power(icon, item):
        (api.power_off if api._engine.running else api.power_on)()
        api._rev += 1

    def modt(icon, item):
        api._apply({'mod_on': not api._engine.settings.get('mod_on')})

    def quit_app(icon, item):
        api.power_off()
        stop_tray()
        try:
            api._window.destroy()
        except Exception:
            os._exit(0)
    M, I = pystray.Menu, pystray.MenuItem
    menu = M(
        I(L('Aurelune öffnen', 'Open Aurelune'), lambda i, it: api.show_window(), default=True),
        I(lambda it: L('Ausschalten', 'Turn off') if api._engine.running else L('Einschalten', 'Turn on'), power),
        I(L('Frequenz', 'Frequency'), M(*[I('%s Hz' % hz, freq(hz), checked=lambda it, hz=hz: (api._cfg.get('ui') or {}).get('presetHz', 432) == hz, radio=True)
                                       for hz in (432, 528, 639, 741, 852, 963, 396, 417, 174)])),
        I(L('Sitzung starten', 'Start session'), M(I(L('🎯 Fokus', '🎯 Focus'), ses('focus')), I(L('🌿 Entspannen', '🌿 Relax'), ses('relax')),
                                                     I(L('🧘 Meditation', '🧘 Meditation'), ses('meditate')), I(L('🌙 Einschlafen', '🌙 Fall asleep'), ses('sleep')),
                                                     I(L('⏹ Sitzung beenden', '⏹ Stop session'), lambda i, it: api.stop_session(external=True)))),
        I(lambda it: L('⏸ Brainwave pausieren', '⏸ Pause brainwave') if api._bw_playing() else L('▶ Brainwave abspielen', '▶ Play brainwave'),
          lambda i, it: api.bw_toggle(external=True)),
        I(L('⏭ Nächster Abschnitt', '⏭ Next part'), lambda i, it: api.bw_skip(1, external=True)),
        I(L('🌀 Gateway-Meditation starten', '🌀 Start Gateway meditation'), lambda i, it: api.bw_play('gateway', 0, 0.0, external=True)),
        I(L('Fokus-Modulation', 'Focus modulation'), modt, checked=lambda it: bool(api._engine.settings.get('mod_on'))),
        I(L('Mini-Player', 'Mini player'), lambda i, it: (api.show_window(), api.mini(not api._mini))),
        M.SEPARATOR,
        I(L('Beenden', 'Quit'), quit_app))
    try:
        img = Image.open(os.path.join(HERE, 'aurelune.ico'))
        icon = pystray.Icon('AureluneStudio', img, 'Aurelune Studio', menu)
        icon.run_detached()
        _TRAY['icon'] = icon
    except Exception as e:
        log.warning('tray failed: %s', e)


def stop_tray():
    ic = _TRAY.get('icon')
    _TRAY['icon'] = None
    if ic is not None:
        try:
            ic.stop()
        except Exception:
            pass


def start_guard():
    """Detached watchdog process: restores a real speaker if this process dies while on CABLE."""
    if not IS_WIN:
        return
    try:
        script = os.path.join(HERE, 'guard.py')
        if not os.path.exists(script):
            return
        exe = sys.executable
        pyw = os.path.join(os.path.dirname(exe), 'pythonw.exe')
        if os.path.exists(pyw):
            exe = pyw
        flags = 0x00000008 | 0x00000200 | 0x08000000  # DETACHED_PROCESS | NEW_PROCESS_GROUP | NO_WINDOW
        subprocess.Popen([exe, script, str(os.getpid())], cwd=HERE, creationflags=flags, close_fds=True,
                         stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        log.warning('guard start failed: %s', e)


def main():
    log.info('Aurelune Studio %s starting (python %s)', VERSION, sys.version.split()[0])
    if not single_instance():
        return
    start_guard()
    win_app_id()
    api = Api()
    minimized = '--minimized' in sys.argv
    if api._cfg.get('power'):
        api._cfg['power'] = False
        save_cfg(api._cfg)
        log.info('previous power state cleared; waiting for manual start')
    if IS_WIN and winaudio.available():
        # never leave the user without sound: default still on CABLE after a crash -> switch back
        try:
            cur = winaudio.get_default()
            if cur and winaudio.is_virtual(cur['name']):
                dev = api._real_windows_device()
                if dev:
                    winaudio.set_default(dev)
        except Exception:
            pass
    use_webview = '--browser' not in sys.argv and webview2_installed()
    if use_webview:
        try:
            import webview
        except Exception as e:
            log.warning('pywebview unavailable: %s', e)
            use_webview = False
    if not use_webview:
        run_browser_ui(api)
        return
    try:
        window = webview.create_window(TITLE, resource(os.path.join('ui', 'index.html')), js_api=api,
                                       width=1180, height=780, min_size=(360, 220), background_color='#0e0c16',
                                       minimized=minimized)
        api._window = window
        if api._cfg.get('tray', True):
            threading.Thread(target=start_tray, args=(api,), daemon=True).start()
        window.events.closing += lambda: (api.power_off(remember=False), None)[1]  # pywebview needs a hashable return
        window.events.shown += lambda: threading.Thread(target=win_set_icon, daemon=True).start()
        # force the modern Chromium engine – the old IE fallback cannot run the UI
        import inspect
        kw = {'gui': 'edgechromium'} if IS_WIN else {}
        # WinForms backend can only load .ico - a PNG crashes the whole process natively.
        # On Windows the icon is set via win_set_icon() (WM_SETICON) instead.
        if not IS_WIN and 'icon' in inspect.signature(webview.start).parameters:
            kw['icon'] = resource(os.path.join('ui', 'icon.png'))
        webview.start(**kw)
        stop_tray()
    except Exception as e:
        log.error('webview failed (%s) – falling back to Edge app window\n%s', e, traceback.format_exc())
        run_browser_ui(api)
        return
    api.power_off(remember=False)


if __name__ == '__main__':
    try:
        main()
    except Exception:
        log.critical('fatal\n%s', traceback.format_exc())
        raise
