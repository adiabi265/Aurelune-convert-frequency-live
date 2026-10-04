// Solfeggio & tuning presets. Descriptions reflect traditional / spiritual attributions.
const FREQUENCIES = [
  { hz: 432, name: 'Natürliche Stimmung', tag: 'Harmonie', emoji: '🎻', color: '#f5b971',
    desc: 'Die „Verdi-Stimmung“ (A = 432 Hz). Klingt für viele wärmer, weicher und entspannter – ideal zum Musikhören, Abschalten und für ruhige Abende.' },
  { hz: 174, name: 'Erdung', tag: 'Entspannung', emoji: '🌿', color: '#8fbf6a',
    desc: 'Die tiefste Solfeggio-Frequenz. Wird mit Sicherheit, Geborgenheit und tiefer körperlicher Entspannung verbunden – gut zum Runterkommen und für Schmerz-Entlastung.' },
  { hz: 285, name: 'Regeneration', tag: 'Erholung', emoji: '🌱', color: '#5fc29b',
    desc: 'Gilt als Frequenz der Erneuerung von Körper und Energie. Passend für Erholungsphasen, Power-Naps und nach dem Sport.' },
  { hz: 396, name: 'Befreiung', tag: 'Loslassen', emoji: '🕊️', color: '#e07a7a',
    desc: 'Soll helfen, Angst, Schuldgefühle und inneren Druck loszulassen. Schön für Journaling, Abendroutine und wenn der Kopf voll ist.' },
  { hz: 417, name: 'Wandel', tag: 'Neuanfang', emoji: '🔄', color: '#f09a5b',
    desc: 'Wird mit Veränderung und dem Lösen von Blockaden verbunden. Gut für Neuanfänge, Ausmisten und frische Motivation.' },
  { hz: 528, name: 'Liebe & Wunder', tag: 'Kreativität', emoji: '💚', color: '#6fd17a',
    desc: 'Die bekannteste Solfeggio-Frequenz („Love Frequency“). Steht für Transformation, gute Laune und Kreativität – perfekt für kreatives Arbeiten und positive Stimmung.' },
  { hz: 639, name: 'Verbindung', tag: 'Beziehungen', emoji: '🤝', color: '#ef8fc0',
    desc: 'Steht für Harmonie in Beziehungen, Empathie und gute Kommunikation. Passend für gemeinsame Zeit, Gespräche und Familie.' },
  { hz: 741, name: 'Klarheit', tag: 'Fokus', emoji: '🎯', color: '#5fb6f0',
    desc: 'Wird mit klarem Denken, Ausdruck und Problemlösung verbunden. Ideal zum Lernen, Programmieren und für Deep Work.' },
  { hz: 852, name: 'Intuition', tag: 'Achtsamkeit', emoji: '👁️', color: '#8f8cf2',
    desc: 'Soll die Intuition und innere Ordnung stärken. Schön für Achtsamkeit, Reflexion und ruhige Konzentration.' },
  { hz: 963, name: 'Einheit', tag: 'Meditation', emoji: '✨', color: '#c79bf7',
    desc: 'Die „Frequenz der Götter“. Wird mit Bewusstsein, Einheit und Spiritualität verbunden – für Meditation, Yoga und Stille.' }
];

const NOTE_NAMES = ['A', 'A♯', 'H', 'C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯'];
// Retune music so that `hz` becomes an actual note (smallest possible shift).
function tuningFor(hz, ref = 440) {
  const n = Math.round(12 * Math.log2(hz / ref));
  const note = ref * Math.pow(2, n / 12);
  const ratio = hz / note;
  const idx = ((n % 12) + 12) % 12;
  const octave = 4 + Math.floor((n + 9) / 12);
  return { source: note, target: hz, ratio, a4: ref * ratio, cents: 1200 * Math.log2(ratio), noteName: NOTE_NAMES[idx] + octave };
}
