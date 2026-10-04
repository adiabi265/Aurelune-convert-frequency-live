# Aurelune Mobile – 432 Hz & Solfeggio für iPhone und Android

Aurelune Mobile ist eine Web-App (PWA). Du installierst sie direkt vom Browser auf den
Home-Bildschirm. Danach läuft sie wie eine normale App, im Vollbild und offline.

## Was die App kann
- **Musik:** eigene Songs (MP3, M4A, WAV, FLAC …) importieren. Aurelune misst die Original-Stimmung
  jedes Songs (z. B. 440 oder 443 Hz) und spielt ihn exakt in 432 Hz ab.
  - **Rein:** verlustfrei durch Resampling, läuft auch bei gesperrtem Bildschirm und im Hintergrund.
    Das Tempo ist dabei ca. 2 % langsamer.
  - **Pitch-Shift:** Tonhöhe ändert sich, Tempo bleibt gleich. Funktioniert nur, solange die App geöffnet ist.
- **Live:** Mikrofon → gewählte Frequenz → Kopfhörer (Instrumente, Stimme, Lautsprecher im Raum).
- **Frequenzen:** 432 Hz gratis. **Premium:** 174, 285, 396, 417, 528, 639, 741, 852, 963 Hz und eigene Frequenzen.

## Wichtige Einschränkung
iOS und Android lassen keine App den Ton **anderer** Apps verändern (Spotify, YouTube, Anrufe).
Ohne Root oder Jailbreak geht das technisch nicht. Aurelune spielt deshalb deine eigene Musik ab
und bietet den Live-Modus. Für den kompletten PC-Sound gibt es **Aurelune Studio** (Windows/Mac).

## 1. Online stellen (kostenlos, 2 Minuten)
Die App braucht HTTPS. Am einfachsten geht es so:
- **Netlify Drop:** https://app.netlify.com/drop öffnen und den Ordner `aurelune-mobile` hineinziehen.
  Du bekommst sofort eine Adresse wie `https://dein-name.netlify.app`.
- Alternativ: **GitHub Pages**, **Cloudflare Pages** oder **Vercel** (Ordner als statische Seite hochladen).

## 2. Auf dem Handy installieren
- **iPhone (Safari):** Adresse öffnen → Teilen-Symbol → „Zum Home-Bildschirm“.
- **Android (Chrome):** Adresse öffnen → „App installieren“ (oder Menü ⋮ → „Zum Startbildschirm hinzufügen“).
- In der App: **Musik → „+ Musik hinzufügen“** → Songs aus „Dateien“ bzw. dem Download-Ordner wählen.

## 3. Premium einrichten (für dich als Anbieter)
1. In `config.js`:
   - `licenseSecret` auf ein eigenes, langes Geheimwort ändern (**wichtig**).
   - `checkoutUrl` auf deinen Bezahllink setzen (Stripe Payment Link, PayPal.me, Gumroad, Ko-fi …).
   - `premiumPrice` anpassen.
2. `tools/lizenz-generator.html` **lokal** öffnen (nicht mit hochladen). Dasselbe Geheimwort eintragen
   und Codes erzeugen (Format `AUR-XXXXX-XXXXX`).
3. Nach jedem Kauf schickst du dem Kunden einen Code. Er gibt ihn unter **Premium → Code einlösen** ein.

Hinweis: Diese Offline-Lizenz ist bewusst einfach gehalten. Wer den Quelltext liest, kann sie umgehen.
Für echten Verkauf in großem Stil eignet sich ein Server-Check oder ein Store-Kauf (siehe unten).

## 4. Optional: In den App Store / Play Store
Mit **Capacitor** (https://capacitorjs.com) lässt sich der Ordner als native App verpacken:
```
npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init Aurelune com.deinname.aurelune --web-dir .
npx cap add android && npx cap add ios
npx cap open android   # bzw. ios (Mac + Xcode nötig)
```
Apple und Google verlangen für digitale Freischaltungen ihre eigenen In-App-Käufe
(z. B. Plugin `cordova-plugin-purchase` oder RevenueCat). Die Code-Lösung ersetzt du dann dadurch.
Konten: Apple Developer 99 $/Jahr, Google Play einmalig 25 $.

## Dateien
| Datei | Zweck |
|---|---|
| `index.html`, `style.css`, `app.js` | Oberfläche und Logik |
| `pitch-processor.js` | Phase-Vocoder (AudioWorklet) für Pitch-Shift und Live |
| `frequencies.js` | Frequenzen und Beschreibungen |
| `config.js` | Preis, Bezahllink, Lizenz-Geheimwort |
| `manifest.webmanifest`, `sw.js`, `icons/` | Installierbarkeit und Offline-Betrieb |
| `tools/lizenz-generator.html` | Codes erzeugen (nicht hochladen) |
