"""Switch the system default playback device (Windows: AudioSwitch.exe, macOS: SwitchAudioSource)."""
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(sys.argv[0] if getattr(sys, 'frozen', False) else __file__))
SWITCH = os.path.join(HERE, 'AudioSwitch.exe')
STATE_DIR = os.path.join(os.path.expanduser('~'), '.aurelune')
IS_WIN = sys.platform.startswith('win')
IS_MAC = sys.platform == 'darwin'
STATES = {1: 'active', 2: 'disabled', 4: 'notpresent', 8: 'unplugged'}


def is_virtual(name):
    """True only for the VB-Audio cable / BlackHole. SteelSeries Sonar, Nahimic, Voicemeeter … count as
    normal speakers, so their EQ chain stays in use."""
    n = (name or '').lower()
    return ('cable' in n and ('vb-audio' in n or n.startswith('cable'))) or 'blackhole' in n


def _run(args):
    kw = {}
    if IS_WIN:
        kw['creationflags'] = 0x08000000  # CREATE_NO_WINDOW
    r = subprocess.run(args, capture_output=True, timeout=20, **kw)
    return r.returncode, r.stdout.decode('utf-8', 'replace')


def _mac_tool():
    for p in ('SwitchAudioSource', '/opt/homebrew/bin/SwitchAudioSource', '/usr/local/bin/SwitchAudioSource'):
        f = shutil.which(p) or (p if os.path.exists(p) else None)
        if f:
            return f
    return None


def available():
    return (IS_WIN and os.path.exists(SWITCH)) or (IS_MAC and _mac_tool() is not None)


def list_outputs():
    """[{id, name, default}]"""
    if IS_WIN:
        code, out = _run([SWITCH, 'list'])
        devs = []
        for line in out.splitlines():
            parts = line.split('\t')
            if len(parts) >= 3:
                devs.append({'id': parts[0], 'name': parts[1], 'default': parts[2].strip() == '1'})
        return devs
    if IS_MAC:
        tool = _mac_tool()
        _, cur = _run([tool, '-c', '-t', 'output'])
        _, out = _run([tool, '-a', '-t', 'output'])
        cur = cur.strip()
        return [{'id': n.strip(), 'name': n.strip(), 'default': n.strip() == cur} for n in out.splitlines() if n.strip()]
    return []


def get_default():
    for d in list_outputs():
        if d['default']:
            return d
    return None


def set_default(dev):
    if IS_WIN:
        return _run([SWITCH, 'set', dev['id']])[0] == 0
    if IS_MAC:
        return _run([_mac_tool(), '-t', 'output', '-s', dev['name']])[0] == 0
    return False


def find_cable_output():
    """The device apps should play into (CABLE Input / BlackHole)."""
    for d in list_outputs():
        n = d['name'].lower()
        if ('cable input' in n) or ('blackhole' in n):
            return d
    for d in list_outputs():
        if is_virtual(d['name']):
            return d
    return None


def remember_real(dev):
    os.makedirs(STATE_DIR, exist_ok=True)
    with open(os.path.join(STATE_DIR, 'real_device.txt'), 'w', encoding='utf-8') as f:
        f.write(dev['id'])


def name_match(a, b):
    a, b = (a or '').strip().lower(), (b or '').strip().lower()
    return bool(a and b) and (a == b or a.startswith(b) or b.startswith(a))


def list_all():
    """Every endpoint in every state (Windows): [{flow, state, default, cable, id, name}]"""
    if not IS_WIN or not os.path.exists(SWITCH):
        return []
    _, out = _run([SWITCH, 'devices'])
    res = []
    for line in out.splitlines():
        p = line.split('\t')
        if len(p) >= 6:
            res.append({'flow': p[0], 'state': STATES.get(int(p[1]), p[1]), 'default': p[2] == '1',
                        'cable': p[3] == '1', 'id': p[4], 'name': p[5].strip()})
    return res


def cable_formats():
    if not IS_WIN or not os.path.exists(SWITCH):
        return []
    _, out = _run([SWITCH, 'cable-status'])
    res = []
    for line in out.splitlines():
        p = line.split('\t')
        if len(p) >= 4:
            res.append({'flow': p[0], 'name': p[1], 'rate': int(p[2] or 0), 'bits': int(p[3] or 0)})
    return res


def driver_installed():
    """VB-CABLE driver present in Windows (even if endpoints are disabled)."""
    if not IS_WIN:
        return False
    try:
        import winreg
        base = r'SYSTEM\CurrentControlSet\Control\Class\{4d36e96c-e325-11ce-bfc1-08002be10318}'
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, base) as k:
            i = 0
            while True:
                try:
                    sub = winreg.EnumKey(k, i)
                except OSError:
                    break
                i += 1
                try:
                    with winreg.OpenKey(k, sub) as sk:
                        desc = winreg.QueryValueEx(sk, 'DriverDesc')[0]
                        if 'vb-audio' in desc.lower() and 'cable' in desc.lower():
                            return True
                except OSError:
                    pass
    except Exception:
        pass
    return False


def cable_check():
    """Full VB-CABLE health check for the UI."""
    r = {'supported': IS_WIN, 'tool': available(), 'installed': False, 'render': None, 'capture': None,
         'active': False, 'disabled': False, 'reboot': False, 'rates': [], 'format_ok': False,
         'default': None, 'default_is_cable': False}
    if IS_MAC:
        outs = list_outputs() if available() else []
        bh = any('blackhole' in d['name'].lower() for d in outs)
        r.update(installed=bh, active=bh, format_ok=True, render='active' if bh else None, capture='active' if bh else None)
        d = get_default() if available() else None
        r['default'] = d['name'] if d else None
        r['default_is_cable'] = bool(d and is_virtual(d['name']))
        return r
    if not IS_WIN:
        return r
    devs = list_all()
    cab = [d for d in devs if d['cable']]
    for flow in ('render', 'capture'):
        c = [d for d in cab if d['flow'] == flow]
        if c:
            best = next((d for d in c if d['state'] == 'active'), c[0])
            r[flow] = best['state']
    r['installed'] = bool(cab) or driver_installed()
    r['active'] = r['render'] == 'active' and r['capture'] == 'active'
    r['disabled'] = any(d['state'] == 'disabled' for d in cab)
    r['reboot'] = r['installed'] and not r['active'] and not r['disabled']
    fm = cable_formats()
    r['rates'] = sorted({f['rate'] for f in fm})
    r['format_ok'] = bool(fm) and all(f['rate'] == 48000 for f in fm)
    d = next((x for x in devs if x['flow'] == 'render' and x['default']), None)
    if d:
        r['default'] = d['name']
        r['default_is_cable'] = d['cable']
    return r


def fix_cable(vb_setup=None):
    """One admin prompt: (install,) enable endpoints, set 48 kHz, 100 % volume."""
    if not IS_WIN or not os.path.exists(SWITCH):
        return False
    import tempfile
    lines = ['@echo off', 'chcp 65001 >nul']
    if vb_setup and os.path.exists(vb_setup):
        lines.append(f'"{vb_setup}" -i -h')
        lines.append('timeout /t 4 /nobreak >nul')
    lines += [f'"{SWITCH}" enable-cable', f'"{SWITCH}" cable-format 48000', f'"{SWITCH}" cable-volume']
    bat = os.path.join(tempfile.gettempdir(), 'aurelune_fix_cable.cmd')
    with open(bat, 'w', encoding='utf-8') as f:
        f.write('\r\n'.join(lines) + '\r\n')
    ps = f"$p = Start-Process -FilePath '{bat}' -Verb RunAs -WindowStyle Hidden -PassThru -Wait; exit $p.ExitCode"
    try:
        psx = os.path.join(os.environ.get('SystemRoot', r'C:\Windows'), 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
        r = subprocess.run([psx if os.path.exists(psx) else 'powershell.exe', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps],
                           capture_output=True, timeout=240, creationflags=0x08000000)
        return r.returncode == 0
    except Exception:
        return False
