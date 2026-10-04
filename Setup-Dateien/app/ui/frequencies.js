// Tuning presets. Descriptions reflect traditional / spiritual attributions (no medical claims).
const FREQUENCIES = [
  { hz: 432, emoji: '🎻', color: '#f5b971',
    en: { name: 'Natural Tuning', tag: 'Harmony', desc: 'The “Verdi tuning” (A = 432 Hz). Many people perceive it as warmer, softer and more relaxed – great for listening, winding down and calm evenings.' },
    de: { name: 'Natürliche Stimmung', tag: 'Harmonie', desc: 'Die „Verdi-Stimmung“ (A = 432 Hz). Klingt für viele wärmer, weicher und entspannter – ideal zum Musikhören, Abschalten und für ruhige Abende.' } },
  { hz: 174, emoji: '🌿', color: '#8fbf6a',
    en: { name: 'Grounding', tag: 'Relaxation', desc: 'The lowest Solfeggio frequency. Associated with safety, comfort and deep physical relaxation – good for slowing down.' },
    de: { name: 'Erdung', tag: 'Entspannung', desc: 'Die tiefste Solfeggio-Frequenz. Wird mit Sicherheit, Geborgenheit und tiefer körperlicher Entspannung verbunden – gut zum Runterkommen.' } },
  { hz: 285, emoji: '🌱', color: '#5fc29b',
    en: { name: 'Regeneration', tag: 'Recovery', desc: 'Considered the frequency of renewal of body and energy. Fits recovery phases, power naps and after sports.' },
    de: { name: 'Regeneration', tag: 'Erholung', desc: 'Gilt als Frequenz der Erneuerung von Körper und Energie. Passend für Erholungsphasen, Power-Naps und nach dem Sport.' } },
  { hz: 396, emoji: '🕊️', color: '#e07a7a',
    en: { name: 'Liberation', tag: 'Letting go', desc: 'Said to help release fear, guilt and inner pressure. Nice for journaling, evening routines and when your head is full.' },
    de: { name: 'Befreiung', tag: 'Loslassen', desc: 'Soll helfen, Angst, Schuldgefühle und inneren Druck loszulassen. Schön für Journaling, Abendroutine und wenn der Kopf voll ist.' } },
  { hz: 417, emoji: '🔄', color: '#f09a5b',
    en: { name: 'Change', tag: 'New start', desc: 'Associated with change and releasing blockages. Good for fresh starts, decluttering and new motivation.' },
    de: { name: 'Wandel', tag: 'Neuanfang', desc: 'Wird mit Veränderung und dem Lösen von Blockaden verbunden. Gut für Neuanfänge, Ausmisten und frische Motivation.' } },
  { hz: 528, emoji: '💚', color: '#6fd17a',
    en: { name: 'Love & Miracles', tag: 'Creativity', desc: 'The best-known Solfeggio frequency (“love frequency”). Stands for transformation, good mood and creativity.' },
    de: { name: 'Liebe & Wunder', tag: 'Kreativität', desc: 'Die bekannteste Solfeggio-Frequenz („Love Frequency“). Steht für Transformation, gute Laune und Kreativität.' } },
  { hz: 639, emoji: '🤝', color: '#ef8fc0',
    en: { name: 'Connection', tag: 'Relationships', desc: 'Stands for harmony in relationships, empathy and good communication. Fits time together, conversations and family.' },
    de: { name: 'Verbindung', tag: 'Beziehungen', desc: 'Steht für Harmonie in Beziehungen, Empathie und gute Kommunikation. Passend für gemeinsame Zeit, Gespräche und Familie.' } },
  { hz: 741, emoji: '🎯', color: '#5fb6f0',
    en: { name: 'Clarity', tag: 'Focus', desc: 'Associated with clear thinking, expression and problem solving. Ideal for studying, coding and deep work.' },
    de: { name: 'Klarheit', tag: 'Fokus', desc: 'Wird mit klarem Denken, Ausdruck und Problemlösung verbunden. Ideal zum Lernen, Programmieren und für Deep Work.' } },
  { hz: 852, emoji: '👁️', color: '#8f8cf2',
    en: { name: 'Intuition', tag: 'Mindfulness', desc: 'Said to strengthen intuition and inner order. Nice for mindfulness, reflection and calm concentration.' },
    de: { name: 'Intuition', tag: 'Achtsamkeit', desc: 'Soll die Intuition und innere Ordnung stärken. Schön für Achtsamkeit, Reflexion und ruhige Konzentration.' } },
  { hz: 963, emoji: '✨', color: '#c79bf7',
    en: { name: 'Unity', tag: 'Meditation', desc: 'The “frequency of the gods”. Associated with awareness, unity and spirituality – for meditation, yoga and silence.' },
    de: { name: 'Einheit', tag: 'Meditation', desc: 'Die „Frequenz der Götter“. Wird mit Bewusstsein, Einheit und Spiritualität verbunden – für Meditation, Yoga und Stille.' } },
];

const NOTE_NAMES = { en: ['A', 'A♯', 'B', 'C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯'], de: ['A', 'A♯', 'H', 'C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯'] };
function noteName(n, lang) { const idx = ((n % 12) + 12) % 12; return (NOTE_NAMES[lang] || NOTE_NAMES.en)[idx] + (4 + Math.floor((n + 9) / 12)); }
// Retune music so that `hz` becomes an actual note (smallest possible shift).
function tuningFor(hz, ref = 440, lang = 'en') {
  const n = Math.round(12 * Math.log2(hz / ref));
  const note = ref * Math.pow(2, n / 12);
  const ratio = hz / note;
  return { source: note, target: hz, ratio, a4: ref * ratio, cents: 1200 * Math.log2(ratio), n, noteName: noteName(n, lang) };
}
