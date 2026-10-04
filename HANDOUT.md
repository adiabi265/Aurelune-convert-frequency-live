# Aurelune – Handout für neue Chats

> **Lies das zuerst.** Dieses Dokument beschreibt Prinzip, Aufbau, Stand und Arbeitsweise des Projekts,
> damit ein neuer Chat (oder Entwickler) ohne Vorwissen direkt weitermachen kann.
> Bei jeder neuen Version: Abschnitt **„Versionsverlauf“** und **„Offene Punkte“** mit aktualisieren.

Stand: **Aurelune Studio 3.16.0** · Repo: `adiabi265/Aurelune-convert-frequency-live` · Branch: `main`
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

## 3c. Wellness (seit 3.14, `wellness.py` + `ui/v314.js` + `v314.css`)

- Eigener Reiter „Wellness“. Audio läuft in der Engine **nach** der Beweis-Messung (`Wellness.process` in `engine._work`), danach `Wellness.guard` (Gehörschutz) und Limiter.
- **Sitzungen** (`SESSIONS` in `wellness.py`, UI holt sie über `api.well_info()`): Schritte `(Sekunden, Beat von, Beat bis)`, erster Schritt = Vorlauf 10 Hz.
  focus 30 min (10→16, Fokus-Modulation an), relax 20, meditate 25, nap 20 (endet mit 14 Hz zum Aufwachen), sleep 45 (10→6→2,5→1,5, Tiefschlaf-Rauschen an), gamma 30 (40 Hz isochron).
  `settings.session = {id, t0, mode}`; ist sie vorbei, setzt die Engine `session = None` und `status.well.done`.
- **Fokus-Modulation**: AM der Musik selbst (focus 16 / calm 10 / deep 6 Hz), Tiefe max. 60 %, Lautheit ausgeglichen.
- **Atem-Coach**: `breath_t0` + `breath_bpm`; Kurve 40 % ein / 60 % aus (`breath_shape`, identisch in `breathV()` in v314.js). Engine rechnet mit `time.time() + play_lag`, damit Orb und Ton synchron sind. Resonanz-Test = subjektiv (6,5 → 4,5/min je 1 min, Bewertung 1–5).
- **Takt** (`BeatGenerator`): isochron (Lautsprecher ok), monaural (Lautsprecher ok), binaural (Kopfhörer). Träger = Ziel-A4/2 (bzw. A4 bei ≥20 Hz isochron). Pegel automatisch ~14 dB unter der Musik.
- **40 Hz**: Sitzung `gamma`; Licht-Flackern nur nach Epilepsie-Warnung + Häkchen, misst die Bildschirm-Hz (60 Hz → 30 Hz Flackern, ehrlich angezeigt), max. 30 min.
- **Tiefschlaf** (Experiment): rosa/braunes Rauschen; Impulse = 5× 50 ms (+6 dB) im 1-s-Abstand, dann 6 s Pause, ab `sleep_delay` min nach `sleep_t0`. Open-loop, keine Wirkungsversprechen.
- **8D**: Mitte des Mixes kreist (ILD + ITD 0,6 ms + dunkler hinten), 35 % Stereo-Breite bleibt.
- **Klangschalen/Gongs**: `api.strike(hz, kind)` → Modalsynthese in der Engine nach dem Pitch-Shifter (exakt). Ist Aurelune aus, spielt die UI sie per Web Audio direkt.
- **Gehörschutz** (`EarGuard`, Standard an): Sprünge > +6 dB über dem 10-s-Mittel werden gedämpft, RMS-Obergrenze `ear_max_db` (Standard −10 dBFS).
- **Tagesroutinen**: `settings.json` → `routines {on, items:[{t:'08:00', a:'focus'}]}`; Thread `_routine_loop` in `app.py` (alle 15 s). Änderungen von außen (Routine, Tray) erhöhen `status.rev` → UI lädt neu.
- **Tray** (`pystray` + `Pillow`, in requirements): Ein/Aus, Frequenz, Sitzungen, Fokus-Modulation, Mini-Player, Beenden. Fehlt das Paket, läuft alles ohne Tray.
- **Mini-Player**: `api.mini(on)` → Fenster 380×236 + immer oben; `body.mini` zeigt nur `#miniBar`. `min_size` deshalb (360, 220).
- **Medientasten**: für Playlists über `navigator.mediaSession` + stilles `<audio>`.
- **3D-Cymatics**: Vollbild (⛶ am Orb), 7000 Partikel wandern auf die Knotenlinien der Chladni-Platte (n, m aus der Frequenz).
- **Niedrige Verzögerung**: `low_latency` → Puffer 15 statt 40 ms (Neustart der Engine). Anzeige der Anteile in den Einstellungen (`status.lat_parts`).
- Profil „voice“ jetzt 2048/8 statt 2048/4.

## 3d. Brainwave-Player + Gateway-Meditation (seit 3.15, `gateway.py` + `ui/v315.js` + `v315.css`)

- **Player-Leiste wie Spotify** (immer unten): Cover, Titel, Live-Hz, ⏮ ▶/⏸ ⏭, Fortschritt (bei Reisen spulbar), Lautstärke (`gw_level`), Titelliste. Auch im Mini-Player (▶/⏸ oben rechts), im Tray und über Medientasten (wenn keine Playlist läuft).
- **Ein Play-Knopf für alles** (`api.bw_toggle`): pausiert/startet, was gerade läuft – Gateway-Reise (`settings.gw.paused`, Position eingefroren) → Sitzung (`session.paused_at`, Zeit wird beim Weiterspielen nachgeschoben) → Brainwave-Schichten (`binaural`) → Takt (`beat_on`). Läuft nichts, startet die zuletzt genutzte Quelle (`cfg.bw_last`) bzw. die Gateway-Meditation. Schaltet Aurelune bei Bedarf ein.
- **Skip** (`api.bw_skip(±1)`): Reise = nächster/voriger Abschnitt (zurück: erst Anfang des Abschnitts, wenn > 5 s), Sitzung = nächster Schritt, Schichten = nächstes Preset, Takt = nächste Frequenz. `api.bw_seek(sek)`, `api.bw_play(id, track, pos)`, `api.bw_stop()`, `api.bw_info()`.
- **Reisen** (`JOURNEYS`): `gateway` 52 min (Einstimmung 10 Hz → Focus 3 → Focus 10 (Theta 4 + Delta 1,5) → Focus 12 (+Gamma 40) → Focus 15 → Focus 21 → Rückkehr 12 Hz), `gateway_short` 25 min, `focus10` 30 min.
- **7 Schichten gleichzeitig** (`SLOTS`, Träger = Obertöne von 27 Hz): Delta 108, Theta 162, Alpha 216, Ziel binaural 135, **Ziel isochron 270** (gleicher Beat wie Ziel binaural), Schumann/Beta 189, Gamma 324 Hz. Darunter rosa „Brandung“ (Welle alle 10 s, `gw_surf`). Beats/Anteile gleiten (τ 5 s), Pause/Play blendet 1,5 s.
- `gw_phones` an = binaural (Kopfhörer), aus = monaural (Lautsprecher, beide Töne auf beiden Ohren). Pegel: Boden −40…−12 dBFS RMS über `gw_level`, mit Musik ~14 dB darunter.
- Engine: nach `Wellness.process`, vor Gehörschutz/Limiter; am Ende setzt die Engine `gw = None`. Status: `status.gw = {now:{id,track,pos,dur,paused}, master, layers:[{key,kind,left,right,beat,share}]}` → Live-Tabelle im Reiter „Meditation“.
- Ehrlich: Monroe veröffentlicht die genauen Hemi-Sync-Mischungen nicht; Abschnitte folgen den veröffentlichten Bereichen. Wirkung nicht garantiert, kein Medizinprodukt (steht so auch in der App).
- Getestet (Sandbox): Frequenzen per FFT exakt (z. B. 107,25 / 108,75 Hz bei Delta 1,5), Skip ohne Knacken, ~0,3 ms CPU pro 21-ms-Block, API-Abläufe (Pause/Weiter/Skip/Seek/Sitzung/Schichten), UI ohne JS-Fehler.

## 3e. UI-Redesign (seit 3.16, `ui/v316.css` + `ui/v316.js`)

- `v316.css` definiert Design-Tokens (`--bg-app`, `--bg-surface`, `--text-*`, `--accent-gold`, `--accent-violet` …) und mappt die alten Variablen (`--bg`, `--card`, `--acc` …) darauf → alle älteren Dateien folgen automatisch. Ein Button-System (`.btn` = Primär gold, `.btn.ghost`/`.btn-secondary`, `.btn-ghost`, `.btn-icon`), Buttons nie mehr 100 % breit, Segmented Controls (`.seg`) inhaltsbreit, Slider max. ~300 px, Selects max. 620 px.
- `v316.js` **verschiebt nur** vorhandene Elemente (alle IDs/Events bleiben): Seitenköpfe (`.page-header`), Sidebar-Fuß mit DE/EN-Umschalter (`#langSeg2`, ruft `setLang`) + kompakter Statuszeile (`#chip`).
  - **Live**: Orb 290 px, Button „Aurelune starten/stoppen“ (`#powerBtn` → klickt `#orb`), Box „Zielfrequenz“ mit nur 432/528/963/Eigene (+ gewählte), „Alle Frequenzen ›“; Karte „Live-Messung“ mit Leerzustand (`#measEmpty`); Gehirnwellen kompakt (Zusammenfassung `#binSum`, Rest in `<details id="binAdv">` „Anpassen“).
  - **Frequenzen**: Filter Alle/Solfeggio/Stimmungen (`#freqFilter`, CSS über `data-filter`), Raster 3/2/1 Spalten.
  - **Playlists**: zweispaltig (`#plLayout`: Liste links, Player rechts), Erklärung in „Wie funktioniert das?“.
  - **Wellness**: Unterreiter (`#wellNav`): Sitzungen (+40 Hz/Licht) · Fokus & Atmung (+Takt) · Schlaf & Raumklang · Routinen & Schutz (+Klangschalen). Gewählter Reiter in `localStorage aur.wellPane`.
  - **Einstellungen**: Unterreiter (`#setNav`): Audio · Verarbeitung (Auto-Stimmung, Profil, 432-Lock, Low Latency) · App (Sprache, Autostart, Tray, Updates, Fenster) · Diagnose (Key-Value-Liste `#diagKV`, Log öffnen, Diagnose kopieren).
- Responsive: ≤1179 px 2-Spalten-Raster, ≤1100 px Live einspaltig, ≤900 px alles einspaltig; `prefers-reduced-motion` schaltet Animationen ab; `:focus-visible` 2 px gold.
- QA (Sandbox, Mock-API): 1160×780, 1366×768, 1024×700, 820×700, Mini-Player, DE + EN – keine JS-Fehler, keine horizontale Scrollbar, keine Buttons > 430 px; Klicktests für Frequenz, Eigene, Filter, Presets, Schichten, Sprache, Playlists, Naturklänge, Sitzung, Routinen, Klangschalen, Resonanz, Updates, Diagnose, Log, Profil.

## 3f. Optimaler Mix + neue 3D-Kymatik (seit 3.17, `mixer.py` + `ui/v317.js` + `v317.css`)

- **Signalweg**: `engine.py` sammelt alle Zusatzklänge getrennt (`adds`: `bin` Brainwave-Schichten, `beat` Takt/Sitzung, `pad` Atem-Ton, `sleep` Schlaf-Rauschen, `bowls` Klangschalen, `gw` Gateway-Reise). Dafür liefert `Wellness.process_split()` (Musik, {Quelle: Signal}); `Wellness.process()` gibt es weiter (summiert). Danach `AutoMix.process(musik, adds, s)` → Gehörschutz → Limiter.
- **`mixer.py` / `AutoMix`**: misst jede Quelle (RMS, 0,4 s geglättet) + Ausgang; Musik-Langzeitpegel (steigt in 1,5 s, fällt in 8 s). **Auto-Mix** (`mix_auto`, Standard an): alle Zusatzklänge zusammen höchstens `mix_gap_db` (Standard 6 dB; UI: Dezent 10 / Normal 6 / Deutlich 3) unter der Musik; ohne Musik (< −45 dBFS) höchstens −18 dBFS, absolut nie über −14 dBFS. Regelung nur auf den Zusatzklängen (Angriff 0,3 s, Freigabe 2,5 s) – die Musik selbst wird nie leiser gemacht. Status `mix` = {`db` je Quelle, `adds_db`, `out_db`, `cap_db`, `auto`, `auto_red_db`, `music`, `gap_db`}.
- **`app.py mix_optimize()`** (Knopf „✨ Optimal mischen“): misst, was gerade läuft, und setzt `beat_level` (Ziel −18 dB unter Musik bzw. −30 dBFS ohne), `sleep_level` (−14 dB bzw. −24 dBFS), `gw_level` 0,5 / 0,57, `gw_surf` 0,4, `bin_auto`, `mix_auto`, Gehörschutz an (max. −10 dBFS). Antwort enthält `changes` + Empfehlung für Playlist-Musik/Natur (`pl` 80 % / 30–45 %), die die UI über `#plMv/#plNv` setzt. „Rückgängig“ stellt die alten Werte wieder her.
- **UI (`v317.js`)**: Knopf `#bwbMix` rechts in der Player-Leiste (roter Punkt = zu laut) → Popover `#mixPop`: je aktiver Quelle Live-Pegel (dB, grün/gelb/rot), Regler + %, „Auto“-Chip bei den Schichten, „Alle Quellen zeigen“, Summe (Ausgang, Zusatzklänge x dB unter der Musik, Auto-Mix-/Gehörschutz-/Limiter-Absenkung), Schalter Auto-Mix, Abstand zur Musik.
- **3D-Kymatik** (`AureluneV317.cymatics`, ersetzt `AureluneWellness.immerse`, Knöpfe `fsGo/fsGo2` + „✨ 3D-Kymatik“ im Meditation-Kopf): 5 Ansichten – Platte 3D (Sand-Partikel wandern auf die Knotenlinien), Wasser (Faraday-Wellen als 3D-Oberfläche), Kugel (Kugelflächenfunktion), Mandala (Wasser von oben, CymaScope-artig, n-fach symmetrisch), Sand (Chladni von oben). Optionen (`localStorage aur.cym`): 7 Farbschemata, Frequenz Live (lautester Ausgangston) oder fest (Eingabe + Solfeggio-Chips), Qualität, Auto-Drehen + Tempo, Klang-Reaktion, Lichtspuren, Info. Maus ziehen = drehen, Rad = Zoom, Doppelklick = zurücksetzen, Tasten 1–5, ←/→ Halbton, Leertaste Pause, H ausblenden, Esc schließen, Bild speichern (PNG). Gleiche Frequenz = immer gleiche Figur (`modes(hz)`). Canvas 2D, Partikel in 8 Helligkeitsstufen gebündelt gezeichnet.

## 4. Dateien (Studio)

| Datei | Inhalt |
|---|---|
| `Setup-Dateien/app/app.py` | Hauptprogramm, API für die UI (`get_state`, `set_settings`, `status`, `update_*` …), Fenster, Einstellungen (`%USERPROFILE%\.aurelune\settings.json`) |
| `engine.py` | Echtzeit-Engine (Streams, Look-ahead, Korrektur, Clock-Drift, Status/Beweis) |
| `dsp.py` | DSP: `TuningDetector`, `CenteredTuning`, `PhaseLockedPitchShifter`, `SpectrumProbe`, `SincResampler`, `Limiter`, `BinauralGenerator`, `bin_layers` |
| `winaudio.py`, `AudioSwitch.cs` | Windows-Standard-Audiogerät lesen/setzen |
| `guard.py` | Ton-Schutz bei Absturz |
| `mixer.py` | 3.17: Pegel aller Quellen + Auto-Mix (Zusatzklänge unter der Musik) |
| `gateway.py` | 3.15: Gateway-/SeptaSync-Reisen, 7 Schichten, Brainwave-Player |
| `wellness.py` | 3.14: Sitzungen, Fokus-Modulation, Atem, Takt, Tiefschlaf, 8D, Klangschalen, Gehörschutz |
| `updater.py` | In-App-Updates von GitHub (`version.txt` vergleichen, ZIP laden, `installer/update.ps1` starten) |
| `version.txt`, `CHANGELOG.txt` | Version + Änderungen (die App liest beide von GitHub!) |
| `ui/index.html`, `app.js`, `style.css`, `desk.css`, `i18n.js`, `frequencies.js`, `update.js` | Oberfläche |
| `ui/v38.js` … `v317.js` (+ `v38.css` … `v317.css`; v314 = Wellness, v315 = Brainwave-Player, v316 = Redesign, v317 = Mix + 3D-Kymatik) | Versions-Patches für die UI (Texte, neue Bedienelemente) – werden nach `app.js` geladen |
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

- **3.17.0** – „Mix“-Knopf in der Player-Leiste: alle Lautstärken mit Live-Pegeln, „✨ Optimal mischen“ + Rückgängig, Auto-Mix (Zusatzklänge bleiben unter der Musik, `mixer.py`); neue 3D-Kymatik mit 5 Ansichten (Platte, Wasser, Kugel, Mandala, Sand), Farben, Qualität, Drehen/Zoom, Live/feste Frequenz, Bild speichern.
- **3.16.0** – UI-Redesign: Design-Tokens, ruhigere Flächen, ein Button-System, kompakte Live-Ansicht (Start-Button, Zielfrequenz-Box, Live-Messung mit Leerzustand, Gehirnwellen einklappbar), Frequenz-Filter, Playlists zweispaltig, Wellness- und Einstellungs-Unterreiter, Diagnose-Liste, DE/EN-Umschalter in der Seitenleiste, Barrierefreiheit (Fokus, reduzierte Bewegung).
- **3.15.0** – Brainwave-Player wie Spotify (⏮ ▶/⏸ ⏭, Fortschritt, Lautstärke; ein Play-Knopf für Reise/Sitzung/Schichten/Takt), Reiter „Meditation“ mit Gateway-Reisen (7 Schichten, Isochron + Binaural auf derselben Zielfrequenz, Brandung) und Live-Frequenz-Tabelle.
- **3.14.0** – Wellness-Reiter: Sitzungen mit Ablauf, Fokus-Modulation, Atem-Coach + Resonanz-Test, Isochron/Monaural, 40 Hz + Licht-Flackern, Tiefschlaf-Rauschen, 8D, Klangschalen/Gongs, Tagesroutinen, Gehörschutz; 3D-Cymatics-Vollbild, Mini-Player, Tray, Medientasten, Song-Zeile 440 → 432, Low-Latency.

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

## 9. Offene Punkte / Ideen

Erledigt in 3.14: Abläufe mit Frequenzverlauf, Isochron/Monaural, 40 Hz, braunes Rauschen, Klangschalen, Sleep mit Ausblenden.
Bewusst **nicht** gebaut (Adrians Wunsch): Wirkungs-Tagebuch.

1. 3.16-Redesign im echten WebView2-Fenster ansehen (Abstände, Schrift). 3.15 auf Adrians PC prüfen: Player-Leiste, Gateway-Reise mit Kopfhörern, Medientasten. 3.14 prüfen: Tray (pystray), Mini-Player-Größe, Medientasten in WebView2, 8D-Klang mit echter Musik.
2. **Eigener Mix**: Beats/Träger/Anzahl frei wählen und speichern; eigene Sitzungen bauen.
3. Gehirnwellen + Sitzungen in die Mobile-App (Web Audio).
4. Lizenz-Geheimwort der Mobile-App ändern (siehe oben).
5. Playlists: mehr Stücke/Instrumente (Gitarre, Flöte), eigene Playlists.
6. Echte Resonanz-Messung (HRV) wäre nur mit Pulssensor/Kamera möglich.
