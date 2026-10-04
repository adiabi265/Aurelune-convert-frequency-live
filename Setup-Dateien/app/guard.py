"""Aurelune sound guard.

Started detached by app.py as `pythonw guard.py <pid>`. Waits until the app process ends (normally or by a
crash / kill). If no other Aurelune instance is running and Windows is still playing into the virtual
CABLE device, it switches the default playback device back to a real speaker so the user never loses sound.
"""
import ctypes
import logging
import os
import sys
import time

APP_DIR = os.path.join(os.path.expanduser('~'), '.aurelune')
os.makedirs(APP_DIR, exist_ok=True)
logging.basicConfig(filename=os.path.join(APP_DIR, 'aurelune.log'), level=logging.INFO,
                    format='%(asctime)s %(levelname)s %(message)s', encoding='utf-8')
log = logging.getLogger('aurelune.guard')

MUTEX = 'Local\\AureluneStudioSingleInstance'
SYNCHRONIZE = 0x00100000
INFINITE = 0xFFFFFFFF


def wait_for_exit(pid):
    k = ctypes.windll.kernel32
    h = k.OpenProcess(SYNCHRONIZE, False, pid)
    if not h:
        return  # already gone
    try:
        k.WaitForSingleObject(h, INFINITE)
    finally:
        k.CloseHandle(h)


def app_running():
    k = ctypes.windll.kernel32
    h = k.OpenMutexW(SYNCHRONIZE, False, MUTEX)
    if h:
        k.CloseHandle(h)
        return True
    return False


def pick_real(winaudio):
    cands = [d for d in winaudio.list_outputs() if not winaudio.is_virtual(d['name'])]
    if not cands:
        return None
    try:
        with open(os.path.join(APP_DIR, 'real_device.txt'), encoding='utf-8-sig') as f:
            saved = f.read().strip()
    except OSError:
        saved = ''
    hit = next((d for d in cands if saved and d['id'] == saved), None)
    if hit:
        return hit
    sonar = next((d for d in cands if 'sonar' in d['name'].lower() and 'gaming' in d['name'].lower()), None)
    return sonar or cands[0]


def restore_sound():
    import winaudio
    if not winaudio.available():
        return
    cur = winaudio.get_default()
    if not cur or not winaudio.is_virtual(cur['name']):
        return  # sound already on a real device – nothing to do
    dev = pick_real(winaudio)
    if not dev:
        log.warning('guard: default is %s but no real speaker found', cur['name'])
        return
    ok = winaudio.set_default(dev)
    log.warning('guard: app ended while default was %s -> restored %s (%s)', cur['name'], dev['name'], 'ok' if ok else 'FAILED')


def main():
    if not sys.platform.startswith('win') or len(sys.argv) < 2:
        return
    pid = int(sys.argv[1])
    log.info('guard: watching pid %s', pid)
    wait_for_exit(pid)
    time.sleep(1.0)  # let a normal shutdown finish its own restore
    if app_running():
        log.info('guard: another Aurelune instance is running – leaving sound as is')
        return
    restore_sound()


if __name__ == '__main__':
    try:
        main()
    except Exception:
        log.exception('guard failed')
