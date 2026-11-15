import * as Tone from 'tone';
import type { Instrument, TrackMeta } from '@/data/types';
import { useJukebox } from '@/store/useJukebox';

// Musical scale spanning 3 octaves for physical value mapping (C Major Pentatonic)
const PENTATONIC_SCALE = [
  'C3', 'D3', 'E3', 'G3', 'A3',
  'C4', 'D4', 'E4', 'G4', 'A4',
  'C5', 'D5', 'E5', 'G5', 'A5',
  'C6',
];

/**
 * Maps a continuous physical value to a musical note within the dataset range.
 * Returns null for missing/null values (musical rest).
 */
export function valueToNote(
  value: number | null,
  min: number,
  max: number,
  scale = PENTATONIC_SCALE
): string | null {
  if (value === null || Number.isNaN(value)) {
    return null;
  }
  const range = max - min;
  const clampedVal = Math.max(min, Math.min(max, value));
  const t = range > 0 ? (clampedVal - min) / range : 0.5;
  const index = Math.round(t * (scale.length - 1));
  return scale[index] ?? scale[0];
}

// Active phrase timeouts for phrase cancellation
let activePhraseTimeouts: ReturnType<typeof setTimeout>[] = [];

/**
 * Cancels any currently playing melody sequence or queued notes.
 */
export function cancelCurrentPhrase(): void {
  for (const timer of activePhraseTimeouts) {
    clearTimeout(timer);
  }
  activePhraseTimeouts = [];
}

/**
 * Ensures Web Audio context is started and store status is unlocked.
 */
async function ensureAudioUnlocked(): Promise<boolean> {
  try {
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }
    const store = useJukebox.getState();
    if (store.status === 'idle') {
      store.unlockAudio();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Configures master destination gain and checks mute state.
 */
function isAudioActive(): boolean {
  const store = useJukebox.getState();
  if (store.muted || store.volume <= 0.001) {
    return false;
  }
  try {
    Tone.Destination.volume.value = Tone.gainToDb(Math.max(0.01, store.volume));
  } catch {
    // Ignore volume setting if context is suspended
  }
  return true;
}

/**
 * Creates or configures a synth matching the track's instrument.
 */
function createInstrumentSynth(instrument: Instrument): Tone.Synth {
  switch (instrument) {
    case 'pluck':
      return new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.002, decay: 0.08, sustain: 0.0, release: 0.05 },
      });
    case 'bell':
      return new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.25, sustain: 0.05, release: 0.3 },
      });
    case 'noise':
      return new Tone.Synth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.003, decay: 0.06, sustain: 0.0, release: 0.04 },
      });
    case 'pad':
    default:
      return new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.03, decay: 0.15, sustain: 0.3, release: 0.15 },
      });
  }
}

/**
 * Plays a single clear "ping" note for a single year value, panned by longitude.
 */
export async function playPing(
  trackMeta: TrackMeta,
  value: number | null,
  lon = 0
): Promise<void> {
  const unlocked = await ensureAudioUnlocked();
  if (!unlocked || !isAudioActive()) return;

  const note = valueToNote(value, trackMeta.min, trackMeta.max);
  if (!note) return;

  try {
    const pan = Math.max(-1, Math.min(1, lon / 180));
    const panner = new Tone.Panner(pan).toDestination();

    const pingSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.2, sustain: 0.05, release: 0.35 },
    }).connect(panner);

    pingSynth.triggerAttackRelease(note, 0.18);

    // Clean up nodes after note decay
    setTimeout(() => {
      pingSynth.dispose();
      panner.dispose();
    }, 600);
  } catch {
    // Gracefully ignore audio failures
  }
}

/**
 * Plays an inspected point:
 * 1. Plays a clear "ping" note for the value at the current year (panned by longitude).
 * 2. 0.3s later, plays a short melody of that location's values across all years in order
 *    (~0.12s per year) using the track's instrument. Null values are rests.
 * 3. Calling it again cancels any active previous phrase.
 */
export async function playPoint(
  trackMeta: TrackMeta,
  series: { date: string; value: number | null }[],
  currentIndex = 0,
  lon = 0
): Promise<void> {
  // 1. Cancel previous phrase
  cancelCurrentPhrase();

  const unlocked = await ensureAudioUnlocked();
  if (!unlocked || !isAudioActive()) return;

  // 2. Play clear ping for the current year
  const currentValue = series[currentIndex]?.value ?? null;
  await playPing(trackMeta, currentValue, lon);

  // 3. Queue melody starting 0.3s later across all years
  const pan = Math.max(-1, Math.min(1, lon / 180));
  let panner: Tone.Panner | null = null;
  let melodySynth: Tone.Synth | null = null;

  try {
    panner = new Tone.Panner(pan).toDestination();
    melodySynth = createInstrumentSynth(trackMeta.instrument).connect(panner);
  } catch {
    return;
  }

  const synthRef = melodySynth;
  const pannerRef = panner;

  // Schedule each year's note (~0.12s per year)
  series.forEach((pt, i) => {
    const note = valueToNote(pt.value, trackMeta.min, trackMeta.max);
    const delayMs = 300 + i * 120; // 0.3s lead-in, then 0.12s per frame

    const timer = setTimeout(() => {
      if (!isAudioActive()) return;
      if (note && synthRef) {
        try {
          synthRef.triggerAttackRelease(note, 0.09);
        } catch {
          // Ignore transient note scheduling errors
        }
      }
    }, delayMs);

    activePhraseTimeouts.push(timer);
  });

  // Schedule disposal after melody concludes
  const totalDurationMs = 300 + series.length * 120 + 500;
  const cleanupTimer = setTimeout(() => {
    synthRef?.dispose();
    pannerRef?.dispose();
  }, totalDurationMs);

  activePhraseTimeouts.push(cleanupTimer);
}
