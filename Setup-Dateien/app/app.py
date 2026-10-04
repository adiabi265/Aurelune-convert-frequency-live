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
        self._last_poll = time.time()
        self._window = None
        self._watch_gen = 0
        self._rev = 0                      # 3.14: bumped when tray / routines change settings -> UI reloads
        self._mini = False
        st = self._engine.settings          # a session never survives a restart
        st['session'] = None
        st['sleep_t0'] = time.time() if st.get('sleep_on') else 0.0
        st['breath_t0'] = time.time()
        threading.Thread(target=self._routine_loop, daemon=True).start()

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
                    if cable and winaudio.set_default(cable):
                        self._switched = True
                    else:
                        log.warning('could not switch default device to CABLE Input')
                self._cfg['power'] = True
                save_cfg(self._cfg)
                if self._switched:
                    self._watch_gen += 1
                    threading.Thread(target=self._watchdog, args=(self._watch_gen,), daemon=True).start()
                return {'ok': True, 'devices': list(self._engine.devices), 'switched': self._switched}
            except Exception:
                self._engine.stop()
                raise

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
        api.power_off(remember=False)
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
        r = api.power_on()
        log.info('auto power on: %s', r)
    elif IS_WIN and winaudio.available():
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
