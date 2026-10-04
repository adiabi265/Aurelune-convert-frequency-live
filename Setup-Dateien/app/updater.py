"""Aurelune Studio - in-app updater (GitHub main branch of the public repo)."""
import logging
import os
import re
import shutil
import subprocess
import tempfile
import threading
import time
import urllib.request
import zipfile

log = logging.getLogger('aurelune')
REPO = 'adiabi265/Aurelune-convert-frequency-live'
BRANCH = 'main'
UA = {'User-Agent': 'AureluneStudio-Updater', 'Cache-Control': 'no-cache'}


def _get(url, timeout=10):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return r.read()


def vtuple(v):
    return tuple(int(x) for x in re.findall(r'\d+', v or '')[:4]) or (0,)


class Updater:
    def __init__(self, version, repo=None, branch=None):
        self.version = version
        self.repo = repo or REPO
        self.branch = branch or BRANCH
        self.state = {'state': 'idle', 'current': version, 'latest': None, 'available': False,
                      'notes': '', 'error': None, 'checked': 0, 'progress': 0}
        self._lock = threading.Lock()

    def _raw(self, path):
        return 'https://raw.githubusercontent.com/%s/%s/%s?t=%d' % (self.repo, self.branch, path, int(time.time()))

    def check(self):
        if self.state['state'] in ('downloading', 'launching'):
            return dict(self.state)
        try:
            latest = _get(self._raw('Setup-Dateien/app/version.txt')).decode('utf-8-sig').strip()
            notes = ''
            try:
                notes = _get(self._raw('Setup-Dateien/app/CHANGELOG.txt'), 6).decode('utf-8-sig', 'replace')[:1500]
            except Exception:
                pass
            avail = vtuple(latest) > vtuple(self.version)
            self.state.update(latest=latest, notes=notes, error=None, checked=time.time(), available=avail,
                              state='available' if avail else 'uptodate')
        except Exception as e:
            log.warning('update check failed: %s', e)
            self.state.update(state='error', error=str(e), checked=time.time())
        return dict(self.state)

    def install(self, before_launch=None, after_launch=None):
        with self._lock:
            if self.state['state'] in ('downloading', 'launching'):
                return dict(self.state)
            self.state.update(state='downloading', progress=0, error=None)
        threading.Thread(target=self._install, args=(before_launch, after_launch), daemon=True).start()
        return dict(self.state)

    def _install(self, before_launch, after_launch):
        try:
            tmp = os.path.join(tempfile.gettempdir(), 'AureluneUpdate')
            shutil.rmtree(tmp, ignore_errors=True)
            os.makedirs(tmp, exist_ok=True)
            zp = os.path.join(tmp, 'update.zip')
            url = 'https://codeload.github.com/%s/zip/refs/heads/%s' % (self.repo, self.branch)
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r, open(zp, 'wb') as f:
                total = int(r.headers.get('Content-Length') or 0)
                done = 0
                while True:
                    b = r.read(65536)
                    if not b:
                        break
                    f.write(b)
                    done += len(b)
                    self.state['progress'] = round(done / total if total else min(0.95, done / 4e6), 3)
            with zipfile.ZipFile(zp) as z:
                z.extractall(tmp)
            upd = None
            for root, _, files in os.walk(tmp):
                if 'update.ps1' in files and os.path.basename(root).lower() == 'installer' \
                        and os.path.isfile(os.path.join(os.path.dirname(root), 'app', 'version.txt')):
                    upd = os.path.join(root, 'update.ps1')
                    break
            if not upd:
                raise RuntimeError('E_UPDATE_PACKAGE')
            with open(os.path.join(os.path.dirname(os.path.dirname(upd)), 'app', 'version.txt'), encoding='utf-8-sig') as f:
                newv = f.read().strip()
            if vtuple(newv) <= vtuple(self.version):
                raise RuntimeError('E_UPDATE_NOT_NEWER')
            self.state.update(state='launching', progress=1, latest=newv)
            if before_launch:
                before_launch()
            ps = os.path.join(os.environ.get('SystemRoot', r'C:\Windows'), 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
            subprocess.Popen([ps, '-NoProfile', '-ExecutionPolicy', 'Bypass', '-STA', '-WindowStyle', 'Hidden', '-File', upd],
                             cwd=os.path.dirname(upd), creationflags=0x00000008 | 0x00000200, close_fds=True)
            log.info('update %s -> %s launched (%s)', self.version, newv, upd)
            if after_launch:
                after_launch()
        except Exception as e:
            log.error('update install failed: %s', e)
            self.state.update(state='error', error=str(e))
