# Aurelune – Handout für neue Chats

> **Lies das zuerst.** Dieses Dokument beschreibt Prinzip, Aufbau, Stand und Arbeitsweise des Projekts,
> damit ein neuer Chat (oder Entwickler) ohne Vorwissen direkt weitermachen kann.
> Bei jeder neuen Version: Abschnitt **„Versionsverlauf“** und **„Offene Punkte“** mit aktualisieren.

Stand: **Aurelune Studio 3.13.1** · Repo: `adiabi265/Aurelune-convert-frequency-live` · Branch: `main`
Besitzer: Adrian (spricht Deutsch, App-Texte DE + EN).

---

## 1. Was ist Aurelune?

Aurelune stimmt **jeden Sound in Echtzeit** auf eine Zielfrequenz um – Standard **A4 = 432 Hz** statt 440 Hz
(außerdem Solfeggio 174 / 285 / 396 / 417 / 528 / 639 / 741 / 852 / 963 Hz und eigene Werte).
Zusätzlich: **Gehirnwellen-Schichten** (gestapelte binaurale Beats), **Cymatics-Visualizer**, Sleep-Timer und seit 3.12 **Playlists** (live erzeugte Musik + Naturklänge, schon auf die Zielfrequenz gestimmt).

Zwei Produkte im Repo:

| Teil | Ordner | Technik |
|---|---|---|
| **Aurelune Studio** (Windows-Desktop, Hauptprodukt) | `Setup-Dateien/` | Python-Audio-Engine + Web-UI (pywebview / Edge-App-Fenster) |
| **Aurelune Mobile** (PWA für iPhone/Android) | `Mobile-App/` | reines HTML/JS, Web Audio, offline-fähig |

## 2. Prinzip von Aurelune Studio (Signalweg)

```
Windows-Standardausgabe = VB-CABLE (virtuelles Kabel)
  -> InputStream "CABLE Output"
  -> [432-Lock: 0,75 s Look-ahead – Stimmung des Songs wird VOR dem Abspielen gemessen]
  -> Phase-Locked Pitch-Shifter (Phasenvocoder, 8192 FFT / 87,5 % Overlap im Lock-Modus)
  -> Beweis-Messung des Ergebnisses ("Du hörst", "Abweichung vom Ziel")
  -> + Gehirnwellen-Schichten (nach der Messung, damit sie den Beweis nicht verfälschen)
  -> Limiter (-0,3 dBFS) -> Sinc-Resampler (Samplerate + Clock-Drift)
  -> OutputStream = echte Lautsprecher/Kopfhörer (z. B. "SteelSeries Sonar - Gaming")
```

- **Stimmungsmessung:** zirkuläre Statistik der Teiltöne (Cent mod 100 relativ zu 440 Hz, amplitudengewichtet).
  Ergebnis = echte Stimmung des Songs (z. B. 440, 443 Hz). Korrektur-Faktor = Ziel / gemessene Stimmung.
- **432-Lock (Präzisionsmodus):** Audio wird 0,75 s verzögert. Ein symmetrisches Hann-Fenster (±0,75 s,
  `CenteredTuning` in `dsp.py`) misst die Stimmung genau um den gerade gespielten Moment -> Korrektur folgt dem
  Song Moment für Moment. Gesamtverzögerung ~0,9 s. „Aus“ = keine Verzögerung (für Videos/Games).
- **Seit 3.11 gibt es nur noch Aus / 0,75 s** (1,5 s und 3 s wurden entfernt – 0,75 s war mit echter Musik am genauesten).
- **Anzeige „Abweichung vom Ziel“:** Hauptwert = Song-Durchschnitt (τ 8 s), darunter „jetzt“ (τ 0,7 s).
  Der „jetzt“-Wert schwankt ±1–3 Cent, weil Sänger/Instrumente von Ton zu Ton natürlich leicht abweichen –
  das ist die Musik, kein Fehler (Hörschwelle ≈ 5 Cent).
- **Achtung Verwechslung:** Die großen Hz-Werte (Orb, „Original“, „Du hörst“) sind die **Stimmung (A4)**, nicht die
  Tonhöhe. Ein reiner 182-Hz-Testton = Stimmung A4 432,9 Hz (182 Hz liegt 28 Cent unter F#3@440) -> Aurelune
  verschiebt ihn auf 181,6 Hz. Das ist korrekt. Seit 3.11 zeigt die UI zusätzlich den echten lautesten Ton
  am Eingang und Ausgang („Eingang 182,0 Hz → du hörst 181,6 Hz“, `status.peak_in` / `peak_out`).
- **Sicherheit:** `guard.py` läuft separat und schaltet Windows zurück auf echte Lautsprecher, falls die App
  abstürzt – der Nutzer verliert nie den Ton. `AudioSwitch.cs` (vom Installer kompiliert) setzt das Standardgerät.

### Simulationsergebnis zur Abweichung (Okt. 2026, wichtig – nicht nochmal von vorn testen)
Mit synthetischer Musik bekannter Stimmung (Akkorde, Melodie mit Vibrato, ±3 Cent Intonation, Drums,
Tape-Schwankung, Songwechsel) durch die echte Engine gemessen. 3.10/3.11 erreicht: „jetzt“ RMS ≈ 0,7–0,8 Cent
(Spitzen ~3 Cent durch natürliche Intonation), Song-Durchschnitt ≈ 0,0–0,5 Cent.
Getestet und **verworfen** (kein Gewinn oder schlechter): Fenster 0,5 s / Dreieck / schief, schnelleres
Nachführen (glide 1.0), zentrierte Abweichungsmessung, prädiktive Rückkopplung auf den Messwert.
Die früher genannten „0,2 Cent“ stammten aus einem einfacheren Test ohne natürliche Intonation.

## 3. Gehirnwellen-Schichten (seit 3.11 stapelbar)

- Jede Schicht = 2 Sinustöne: links `Träger − Beat/2`, rechts `Träger + Beat/2` -> das Gehirn hört den Beat
  (nur mit **Stereo-Kopfhörern**).
- **Anzahl wählbar: 2, 4, 7, 8, 16, 32** (`bin_count`, Standard 4). Gesamtlautstärke bleibt gleich (RMS 0,354).
- **Träger = Obertöne von 27 Hz** (A0 im 432-System: 108, 135, 162 … Hz) -> konsonant auch bei 32 Tönen.
  Schroeder-Startphasen verhindern ein 27-Hz-Schnarren. Höhere Träger etwas leiser (Faktor k^-0,5).
- **Presets** (Regeln statt fester Tabellen, `BIN_PRESETS` in `dsp.py`):
  - `delta` Band 1–3 Hz, Träger 108–270 Hz
  - `theta` Band 4,5–7,5 Hz, Träger 135–324 Hz
  - `alpha` Band 8,5–12 Hz, Träger 216–540 Hz
  - `gateway` Anker 1,5 / 4 / 7 / 7,5 Hz (Focus-10-Idee), Träger 108–378 Hz
  - `septa` Anker 1,5 / 4 / 8 / 13 / 25 / 40 / 60 Hz, Träger 108–594 Hz – **SeptaSync-Prinzip**
    (7 Beats auf 14 Trägertönen gleichzeitig, eine pro Gehirnwellen-Band)
  - Bänder: Beats geometrisch verteilt. Anker: bei mehr Schichten als Ankern werden sie auf weiteren Trägern wiederholt.
- **Regel existiert doppelt:** `dsp.bin_layers()` (Python) und `binLayers()` in `ui/app.js` (Anzeige).
  **Beide müssen identisch bleiben** (wurde per Test geprüft – bei Änderungen beide anpassen).
- Auto-Lautstärke (Gateway-Prinzip): Beats ~16 dB unter der Musik, folgen deren Lautstärke. Optional rosa Rauschteppich.
- Wechsel von Preset/Anzahl blendet über Stille über (2 s Fades, keine Klicks).

## 3b. Playlists (seit 3.12, `ui/v312.js` + `v312.css`)

- Eigener Reiter „Playlists“ (wird per JS in Navigation + `main` eingefügt). 5 Playlists / 21 Stücke:
  `ambient` 🎹 Ambient Piano, `meditate` 🧘 Meditativ (Klangschalen, Atem 4 s ein / 6 s aus, Tanpura, Om, Lotus),
  `sleep` 🌙 Tiefschlaf, `celestial` ✨ Himmlische Klänge, `focus` 🎧 Fokus Flow. Katalog = `catalogue()` in `v312.js`.
- **Keine Audiodateien:** alles wird per Web Audio im App-Fenster live erzeugt (Generatoren pro Stil, Seed-Zufall,
  Akkordfolge `prog` auf Tonleiter `mode`). Jede Oszillator-Frequenz = `settings.target_a4 × 2^((m−69)/12) × Teilton`
  -> Musik ist **von Anfang an** auf der Zielfrequenz. Ändert sich das Ziel, gleiten alle klingenden Töne in ~0,5 s mit.
  Gemessen (Headless-Chromium, FFT): Teiltöne ±1 Cent auf dem 432- bzw. 440-Raster.
- Klangschalen: Grundton als Paar ±1,5 Cent (Schwebung, Mittelwert bleibt exakt). Klavier: Inharmonizität sehr klein (B = 0,00008).
- **Naturklänge** pro Playlist wählbar (mehrere gleichzeitig): `sea`, `forest`, `rain`, `stream`, `fire`, `wind`, `night`
  – aus erzeugtem weißem/rosa/braunem Rauschen + Filtern + zufälligen Ereignissen (Wellen, Tropfen, Vögel, Knistern, Grillen).
  Standard: Ambient → Regen, Meditativ → Wald, Tiefschlaf → Meer, Himmlisch → Wind, Fokus → Bach.
- Ein Stück läuft 7 min (`TRACK_LEN`), dann Überblendung zum nächsten. Scheduler-Takt kommt aus einem Web-Worker
  (läuft auch bei verstecktem Fenster), Look-ahead 1,6 s.
- Einstellungen (letzte Playlist, Lautstärke Musik/Natur, Naturauswahl) werden über `set_settings({}, {pl: …})` in
  `settings.json` unter `ui.pl` gespeichert (pywebview hat evtl. kein dauerhaftes localStorage).
- Ausgabe geht an das Windows-Standardgerät: ist Aurelune an (= VB-CABLE), läuft die Playlist durch die Engine – sie ist
  schon auf Ziel, also Korrektur ≈ 0. Ist Aurelune aus, direkt auf die Lautsprecher. Sleep-Timer blendet die Playlist in 8 s aus.
- Test-Hilfe: `window.AurelunePlaylists.play(id, index)` / `.pause()` / `._state()`.

## 4. Dateien (Studio)

| Datei | Inhalt |
|---|---|
| `Setup-Dateien/app/app.py` | Hauptprogramm, API für die UI (`get_state`, `set_settings`, `status`, `update_*` …), Fenster, Einstellungen (`%USERPROFILE%\.aurelune\settings.json`) |
| `engine.py` | Echtzeit-Engine (Streams, Look-ahead, Korrektur, Clock-Drift, Status/Beweis) |
| `dsp.py` | DSP: `TuningDetector`, `CenteredTuning`, `PhaseLockedPitchShifter`, `SpectrumProbe`, `SincResampler`, `Limiter`, `BinauralGenerator`, `bin_layers` |
| `winaudio.py`, `AudioSwitch.cs` | Windows-Standard-Audiogerät lesen/setzen |
| `guard.py` | Ton-Schutz bei Absturz |
| `updater.py` | In-App-Updates von GitHub (`version.txt` vergleichen, ZIP laden, `installer/update.ps1` starten) |
| `version.txt`, `CHANGELOG.txt` | Version + Änderungen (die App liest beide von GitHub!) |
| `ui/index.html`, `app.js`, `style.css`, `desk.css`, `i18n.js`, `frequencies.js`, `update.js` | Oberfläche |
| `ui/v38.js`, `v39.js`, `v310.js`, `v311.js`, `v312.js` (+ `v38.css`, `v311.css`, `v312.css`) | Versions-Patches für die UI (Texte, neue Bedienelemente) – werden nach `app.js` geladen |
| `Setup-Dateien/installer/*.ps1` | Setup (Python, WebView2, VB-CABLE), Update, Deinstallation |
| `Setup-Dateien/installer/autoupdate.ps1` + `.vbs` | Hintergrund-Updater (seit 3.13): startet unsichtbar bei der Windows-Anmeldung (HKCU Run `AureluneStudioUpdater`), prüft alle 3 min `version.txt` auf GitHub und startet `update.ps1 -Background` |
| `Setup-Dateien/installer/SetupStub.cs` | Quelltext der `Aurelune-Studio-Setup.exe` (Online-Setup, Build-Befehl steht im Kopf der Datei) |
| `Aurelune-Studio-Setup.exe`, `README.md` (Root) | Das Einzige, was Nutzer brauchen: EXE starten. Die EXE lädt immer die neueste Version von GitHub und startet `installer/setup.ps1` |

Installationsort beim Nutzer: `%LOCALAPPDATA%\Programs\Aurelune Studio` (eigene `.venv`). Log: `%USERPROFILE%\.aurelune\aurelune.log`.

## 5. Updates ausliefern (so kommen Änderungen auf Adrians PC)

1. Code ändern, **`Setup-Dateien/app/version.txt` hochzählen** und Zeile oben in `CHANGELOG.txt` ergänzen.
2. Auf `main` pushen.
3. **Ab 3.13 live:** der Hintergrund-Updater prüft **alle 3 Minuten** (auch wenn das Fenster zu ist), die offene App
   ebenfalls alle 3 Minuten und beim Zurückholen des Fensters. Neue Version = sofort installiert; war Aurelune offen,
   startet es neu, sonst läuft das Update unsichtbar. Fehlgeschlagene Version wird 6 h nicht erneut versucht
   (`%TEMP%\AureluneSetup\update-failed.txt`). Logs: `%TEMP%\AureluneSetup\autoupdate.log`, `update.log`.
   (3.11–3.12: beim Start und stündlich; davor alle 6 h.)
   - **Ab 3.11:** ist „Automatische Updates“ an, installiert sich eine neue Version **selbst** und Aurelune
     **startet automatisch neu** (einmal pro Version; bei Fehler bleibt der Knopf „Installieren“).
   - Bis einschließlich 3.10 musste man auf „Installieren“ klicken – das Update auf 3.11 brauchte deshalb einmal diesen Klick.
4. `update.ps1` sichert die alte Version, kopiert `app/`, installiert ggf. neue Python-Pakete und startet die App neu.
   Einstellungen, `.venv` und VB-CABLE bleiben erhalten.

Die `Aurelune-Studio-Setup.exe` ist seit 3.13 ein **Online-Setup** (lädt immer `main`) – sie muss praktisch nie neu gebaut werden.

**Regel für Chats:** Nach jeder neuen Version sofort pushen (über Adrians lokales Git in
`C:\Users\liket\PlazCodeWorkspace\Aurelune-repo`) **und danach Adrians installierte App updaten + neu starten**:
`powershell -NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File Aurelune-repo\Setup-Dateien\installer\update.ps1`
(im Workspace-Ordner), dann `installed-version.txt` im Installationsordner prüfen.

## 6. Arbeitsregeln für neue Chats

- Sprache mit Adrian: **Deutsch**, locker. App-Texte immer **DE + EN** (`I18N.de` / `I18N.en`).
- Neue UI-Funktionen als `ui/vXYZ.js` (+ ggf. `.css`) anlegen und in `index.html` nach den anderen einbinden.
- **Achtung JS-Falle:** `app.js` ruft Render-Funktionen sehr früh auf. Keine `const`/`let`-Tabellen auf oberster
  Ebene, die in Render-Funktionen benutzt werden (Temporal Dead Zone) – stattdessen Funktionen, die ein Objekt
  zurückgeben (siehe `binPresetTable()`).
- Engine-Änderungen offline prüfen: `sounddevice` stubben (`sys.modules['sounddevice'] = types.ModuleType(...)`),
  dann `engine`/`dsp` importieren. UI-Vorschau: `index.html` mit einem Mock für `window.pywebview.api` in
  Headless-Chromium öffnen (`get_state` braucht `settings`, `devices`, `outputs`, `auto_out`, `check`).
- Gesundheit: Keine Heilversprechen in Texten. Forschung zu binauralen Beats ist gemischt
  (Meta-Analyse Garcia-Argibay 2019: mittlerer Effekt auf Angst/Aufmerksamkeit), für 432 Hz/Solfeggio gibt es
  keine belastbaren Belege. Hinweis „nicht beim Autofahren, nicht bei Epilepsie“ beibehalten.

## 7. Aurelune Mobile (PWA)

- Eigene Songs importieren, Stimmung messen, in 432 Hz abspielen (Modus „Rein“ = Resampling, ~2 % langsamer,
  läuft im Hintergrund; „Pitch-Shift“ = Tempo bleibt, nur bei offener App). Live-Modus über Mikrofon.
- iOS/Android erlauben **nicht**, den Ton anderer Apps (Spotify, YouTube) zu ändern.
- Premium (andere Frequenzen) per Offline-Code `AUR-XXXXX-XXXXX`, Generator `Mobile-App/tools/lizenz-generator.html`.
- ⚠️ **Offen:** In `Mobile-App/config.js` steht noch `licenseSecret: 'AURELUNE-CHANGE-ME-2026'` und `checkoutUrl: ''`.
  Da das Repo öffentlich ist, kann jeder Codes erzeugen -> vor dem Verkauf ändern.
- Hat noch **keine** Gehirnwellen-Schichten.

## 8. Versionsverlauf (Kurz)

- **3.13.0** – Live-Updates: Hintergrund-Updater (alle 3 min, auch bei geschlossenem Fenster), App prüft alle 3 min; neues Online-Setup-EXE (`SetupStub.cs`), Root aufgeräumt (`README.md`, `Aurelune-Update.bat` entfernt).
- **3.12.0** – Playlists (5 Themen, 21 live erzeugte Stücke, schon auf Zielfrequenz gestimmt) + wählbare Naturklänge pro Playlist.
- **3.11.0** – Gehirnwellen stapelbar (2/4/7/8/16/32), Preset „Septa · 7 Wellen“ (SeptaSync-Prinzip), Träger als
  27-Hz-Obertöne; 432-Lock nur noch Aus / 0,75 s; Updates installieren sich selbst + Auto-Neustart, Prüfung stündlich.
- **3.10.0** – Lock-Standard 0,75 s, Abweichung zeigt Song-Durchschnitt + „jetzt“.
- **3.9.0** – schnellere Live-Messung (τ 0,7 s), „Original“ zeigt echte Song-Stimmung, Gateway-Auto-Lautstärke, Rauschteppich.
- **3.8.0** – Lock wählbar (Aus/0,75/1,5/3 s), symmetrisches Messfenster, neue Gehirnwellen-Presets.
- **3.7.0** – 432-Lock folgt der Stimmung Moment für Moment, standardmäßig an.
- **3.6.0** – Desktop-Layout. **3.5.0** – neue Startseite, Cymatics, Sleep-Timer. **3.4.x** – In-App-Updates.
  **3.3.1** – Präzisionsmodus, Cymatics, Gehirnwellen.

## 9. Offene Punkte / Ideen (recherchiert, priorisiert)

1. **Abläufe mit Frequenzverlauf** (z. B. Beat sinkt in 10 min von 10 auf 2 Hz; wie SBaGen/Gnaural-Zeitpläne)
   – Zeitplan aus (Zeit, Ziel-Beat), Generator gleitet phasenkontinuierlich.
2. **Isochrone + monaurale Töne** als Modus – funktionieren ohne Kopfhörer und mit Mono-Ausgang.
3. **40-Hz-Gamma-Preset** (MIT-GENUS-Forschung) als isochroner 40-Hz-Takt, optional Cymatics-Flackern (Epilepsie-Hinweis!).
4. **Eigener Mix**: Beats/Träger/Anzahl frei wählen und speichern.
5. Mehr Rauscharten (braun, grün), Regen, Klangschalen.
6. Sleep-Timer mit langsamem Ausblenden.
7. Gehirnwellen in die Mobile-App (Web Audio).
8. Lizenz-Geheimwort der Mobile-App ändern (siehe oben).
9. Playlists: mehr Stücke/Instrumente (Gitarre, Flöte), Playlists in die Mobile-App, eigene Playlists zusammenstellen.
