import * as Tone from 'tone';
import type { Instrument } from '@/data/types';

/**
 * Common playable interface for all sonification instruments.
 * Supports polyphonic chords (for latitude bands), single notes, and lifecycle management.
 */
export interface InstrumentVoice {
  readonly type: Instrument;
  triggerChord: (notes: string[], duration?: Tone.Unit.Time, time?: number) => void;
  triggerNote: (note: string, duration?: Tone.Unit.Time, time?: number) => void;
  releaseAll: () => void;
  dispose: () => void;
}

/**
 * Creates a soft FMSynth pad instrument (used for Ocean Fever / Sea Surface Temperature).
 * Uses frequency modulation with gentle envelopes to produce a warm, liquid ocean soundscape.
 */
export function createPadInstrument(destination: Tone.InputNode): InstrumentVoice {
  const synth = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 1,
    modulationIndex: 1.2,
    oscillator: { type: 'sine' },
    envelope: {
      attack: 0.08,
      decay: 0.3,
      sustain: 0.7,
      release: 0.8,
    },
    modulation: { type: 'sine' },
    modulationEnvelope: {
      attack: 0.1,
      decay: 0.3,
      sustain: 0.6,
      release: 0.8,
    },
  });
  synth.maxPolyphony = 8;

  const outputGain = new Tone.Gain(0.7);
  synth.connect(outputGain);
  outputGain.connect(destination);

  return {
    type: 'pad',
    triggerChord: (notes, duration = '8n', time) => {
      if (notes.length === 0) return;
      try {
        synth.triggerAttackRelease(notes, duration, time);
      } catch {
        // Guard against transient scheduling errors
      }
    },
    triggerNote: (note, duration = '8n', time) => {
      try {
        synth.triggerAttackRelease(note, duration, time);
      } catch {
        // Guard against transient scheduling errors
      }
    },
    releaseAll: () => {
      try {
        synth.releaseAll();
      } catch {
        // Guard
      }
    },
    dispose: () => {
      synth.dispose();
      outputGain.dispose();
    },
  };
}

/**
 * Creates a PluckSynth instrument (used for Breathing Planet / NDVI vegetation).
 * Maintains a 5-voice pool of Karplus-Strong string pluck synthesizers.
 */
export function createPluckInstrument(destination: Tone.InputNode): InstrumentVoice {
  const voiceCount = 5;
  const outputGain = new Tone.Gain(0.65);
  outputGain.connect(destination);

  const voices: Tone.PluckSynth[] = [];
  for (let i = 0; i < voiceCount; i++) {
    const pluck = new Tone.PluckSynth({
      attackNoise: 0.9,
      dampening: 3500,
      resonance: 0.92,
    });
    pluck.connect(outputGain);
    voices.push(pluck);
  }

  return {
    type: 'pluck',
    triggerChord: (notes, _duration, time) => {
      for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        const voice = voices[i % voiceCount];
        if (note && voice) {
          try {
            voice.triggerAttack(note, time);
          } catch {
            // Guard
          }
        }
      }
    },
    triggerNote: (note, _duration, time) => {
      try {
        voices[0].triggerAttack(note, time);
      } catch {
        // Guard
      }
    },
    releaseAll: () => {
      // PluckSynth is self-decaying (Karplus-Strong)
    },
    dispose: () => {
      for (const v of voices) v.dispose();
      outputGain.dispose();
    },
  };
}

/**
 * Creates a tuned MetalSynth bell instrument (used for Melting Crown / Polar Sea Ice).
 * Features metallic inharmonic resonance for crystal, glassy ice sonification.
 */
export function createBellInstrument(destination: Tone.InputNode): InstrumentVoice {
  const voiceCount = 5;
  const outputGain = new Tone.Gain(0.5);
  outputGain.connect(destination);

  const voices: Tone.MetalSynth[] = [];
  for (let i = 0; i < voiceCount; i++) {
    const bell = new Tone.MetalSynth({
      harmonicity: 3.1,
      modulationIndex: 16,
      resonance: 4000,
      octaves: 1.5,
      envelope: {
        attack: 0.005,
        decay: 1.2,
        release: 0.6,
      },
    });
    bell.connect(outputGain);
    voices.push(bell);
  }

  return {
    type: 'bell',
    triggerChord: (notes, duration = '8n', time) => {
      for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        const voice = voices[i % voiceCount];
        if (note && voice) {
          try {
            voice.triggerAttackRelease(note, duration, time);
          } catch {
            // Guard
          }
        }
      }
    },
    triggerNote: (note, duration = '8n', time) => {
      try {
        voices[0].triggerAttackRelease(note, duration, time);
      } catch {
        // Guard
      }
    },
    releaseAll: () => {
      // MetalSynth decays via envelope
    },
    dispose: () => {
      for (const v of voices) v.dispose();
      outputGain.dispose();
    },
  };
}

/**
 * Creates a filtered noise crackle instrument (used for Fire Season / Active Fires).
 * Simulates popping embers and burning biomass via filtered pink noise bursts.
 */
export function createNoiseInstrument(destination: Tone.InputNode): InstrumentVoice {
  const voiceCount = 5;
  const filter = new Tone.Filter({
    type: 'bandpass',
    frequency: 1400,
    Q: 2.5,
  });
  const outputGain = new Tone.Gain(0.45);

  filter.connect(outputGain);
  outputGain.connect(destination);

  const voices: Tone.NoiseSynth[] = [];
  for (let i = 0; i < voiceCount; i++) {
    const noise = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: {
        attack: 0.003,
        decay: 0.04,
        sustain: 0,
        release: 0.04,
      },
    });
    noise.connect(filter);
    voices.push(noise);
  }

  return {
    type: 'noise',
    triggerChord: (notes, duration = '16n', time) => {
      const activeCount = Math.min(notes.length, voiceCount);
      for (let i = 0; i < activeCount; i++) {
        const voice = voices[i];
        if (voice) {
          try {
            // Slightly stagger fire crackle bursts for natural asynchronous texture
            const stagger = (time ?? Tone.now()) + Math.random() * 0.02;
            voice.triggerAttackRelease(duration, stagger);
          } catch {
            // Guard
          }
        }
      }
    },
    triggerNote: (_note, duration = '16n', time) => {
      try {
        voices[0].triggerAttackRelease(duration, time);
      } catch {
        // Guard
      }
    },
    releaseAll: () => {
      // NoiseSynth self-decays
    },
    dispose: () => {
      for (const v of voices) v.dispose();
      filter.dispose();
      outputGain.dispose();
    },
  };
}

/**
 * Factory function creating an InstrumentVoice based on the dataset instrument category.
 */
export function createInstrument(type: Instrument, destination: Tone.InputNode): InstrumentVoice {
  switch (type) {
    case 'pluck':
      return createPluckInstrument(destination);
    case 'bell':
      return createBellInstrument(destination);
    case 'noise':
      return createNoiseInstrument(destination);
    case 'pad':
    default:
      return createPadInstrument(destination);
  }
}
