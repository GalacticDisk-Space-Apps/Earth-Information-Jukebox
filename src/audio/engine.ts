import * as Tone from 'tone';
import type { Instrument, LatLon, Mode, TrackMeta, ValueGrid } from '@/data/types';
import { makeFakeGrid, makeFakeTrack } from '@/data/fake';
import {
  columnToChord,
  computeGlobalMean,
  lonToPan,
  valueToNote,
} from './mappings';
import { createInstrument, type InstrumentVoice } from './instruments';

export class AudioEngine {
  private isStarted = false;
  private isPlaying = false;
  private currentMode: Mode = 'sweep';

  // Master audio nodes
  private masterVolume: Tone.Volume | null = null;
  private limiter: Tone.Limiter | null = null;
  private reverb: Tone.Reverb | null = null;
  private panner: Tone.Panner | null = null;
  private meter: Tone.Meter | null = null;

  // Active instruments and synths
  private activeInstrument: InstrumentVoice | null = null;
  private activeInstrumentType: Instrument | null = null;
  private touchSynth: Tone.MonoSynth | null = null;
  private isTouchActive = false;
  private leadSynth: Tone.Synth | null = null;
  private referenceSynth: Tone.Synth | null = null;

  // Transport state
  private transportEventId: number | null = null;
  private currentColumn = 0;
  private totalColumns = 180;
  private static readonly sweepDurationSeconds = 8.0;
  private readonly stepInterval = AudioEngine.sweepDurationSeconds / 180; // ~0.0444s per column (~22.5 Hz)

  // Current dataset & grid state
  private activeTrack: TrackMeta = makeFakeTrack('ocean-fever');
  private activeGrid: ValueGrid = makeFakeGrid(0);
  private currentGlobalMean: number | null = null;
  private currentFrameIndex = 0;

  // Optional external callbacks to inform React / Zustand
  public onPlayheadUpdate?: (playhead: number) => void;
  public onAdvanceFrame?: () => void;

  /**
   * Initializes the Tone.js audio graph and unlocks Web Audio context.
   * MUST be invoked directly from a user gesture (such as "Drop the needle" click).
   */
  public async start(): Promise<void> {
    if (this.isStarted) {
      if (Tone.context.state !== 'running') {
        await Tone.context.resume();
      }
      return;
    }

    // Unlock Web Audio context via user gesture
    await Tone.start();

    // 1. Build Master Chain: Panner -> Reverb -> Master Volume -> Limiter(-3dB) -> Meter -> Destination
    this.limiter = new Tone.Limiter(-3);
    this.limiter.toDestination();

    this.meter = new Tone.Meter({ normalRange: true });
    this.limiter.connect(this.meter);

    this.masterVolume = new Tone.Volume(0);
    this.masterVolume.connect(this.limiter);

    this.reverb = new Tone.Reverb({
      decay: 1.5,
      preDelay: 0.01,
      wet: 0.15,
    });
    this.reverb.connect(this.masterVolume);

    this.panner = new Tone.Panner(0);
    this.panner.connect(this.reverb);

    // 2. Initialize Touch Mode MonoSynth with smooth portamento glide
    this.touchSynth = new Tone.MonoSynth({
      portamento: 0.08,
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.05,
        decay: 0.2,
        sustain: 0.8,
        release: 0.3,
      },
      filterEnvelope: {
        attack: 0.06,
        decay: 0.2,
        sustain: 0.8,
        release: 0.3,
        baseFrequency: 300,
        octaves: 3,
      },
    });
    this.touchSynth.volume.value = -3;
    this.touchSynth.connect(this.panner);

    // 3. Initialize Global Mean Melodic Lead Synth for Time-lapse Mode
    this.leadSynth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.05,
        decay: 0.4,
        sustain: 0.5,
        release: 0.8,
      },
    });
    this.leadSynth.volume.value = -4;
    this.leadSynth.connect(this.reverb);

    // 4. Initialize Calibration Reference Tone Synth
    this.referenceSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.04,
        decay: 0.3,
        sustain: 0.8,
        release: 0.5,
      },
    });
    this.referenceSynth.volume.value = -2;
    this.referenceSynth.connect(this.masterVolume);

    // 5. Build active instrument for current track
    this.setupInstrument(this.activeTrack.instrument);

    // 6. Precalculate initial global mean
    this.updateGlobalMean();

    // 7. Schedule Transport loop for Sweep & Time-lapse modes
    this.scheduleTransportLoop();

    this.isStarted = true;
  }

  /**
   * Configures the active instrument voice matching the dataset category.
   */
  private setupInstrument(type: Instrument): void {
    if (!this.panner) return;

    if (this.activeInstrument && this.activeInstrumentType === type) {
      return;
    }

    if (this.activeInstrument) {
      this.activeInstrument.releaseAll();
      this.activeInstrument.dispose();
      this.activeInstrument = null;
    }

    this.activeInstrumentType = type;
    this.activeInstrument = createInstrument(type, this.panner);
  }

  /**
   * Configures the Transport repeat event running at ~22.5 Hz (180 columns / 8 seconds).
   */
  private scheduleTransportLoop(): void {
    if (this.transportEventId !== null) {
      Tone.Transport.clear(this.transportEventId);
    }

    this.transportEventId = Tone.Transport.scheduleRepeat((time) => {
      if (!this.isPlaying || this.currentMode === 'touch') {
        return;
      }

      const col = this.currentColumn;
      this.currentColumn = (this.currentColumn + 1) % this.totalColumns;

      // Update playhead (0..1)
      const playhead = col / this.totalColumns;
      if (this.onPlayheadUpdate) {
        this.onPlayheadUpdate(playhead);
      }

      // Compute longitude and pan stereo field (-1..+1)
      const lon = -180 + (col / this.totalColumns) * 360;
      const pan = lonToPan(lon);
      if (this.panner) {
        this.panner.pan.rampTo(pan, this.stepInterval * 0.8, time);
      }

      // Sample 5 latitude bands and trigger chord
      if (this.activeInstrument) {
        const chord = columnToChord(
          this.activeGrid,
          col,
          this.activeTrack.min,
          this.activeTrack.max,
          5
        );

        if (chord.length > 0) {
          this.activeInstrument.triggerChord(chord, this.stepInterval * 0.85, time);
        }
      }

      // Time-lapse Mode specific behavior
      if (this.currentMode === 'timelapse') {
        // Play melodic global mean note on every quarter-sweep (~every 2s / 45 columns)
        if (col % 45 === 0 && this.currentGlobalMean !== null && this.leadSynth) {
          const leadNote = valueToNote(
            this.currentGlobalMean,
            this.activeTrack.min,
            this.activeTrack.max
          );
          if (leadNote) {
            this.leadSynth.triggerAttackRelease(leadNote, '8n', time);
          }
        }

        // When a full 180-column sweep completes, advance to the next frame
        if (col === this.totalColumns - 1) {
          if (this.onAdvanceFrame) {
            this.onAdvanceFrame();
          }
        }
      }
    }, this.stepInterval);
  }

  /**
   * Starts playback.
   */
  public async play(): Promise<void> {
    if (!this.isStarted) {
      await this.start();
    }
    this.isPlaying = true;
    if (this.currentMode !== 'touch') {
      Tone.Transport.start();
    }
  }

  /**
   * Pauses playback and releases sounding voices.
   */
  public pause(): void {
    this.isPlaying = false;
    Tone.Transport.pause();
    this.releaseVoices();
  }

  /**
   * Toggles playback between play and pause.
   */
  public toggle(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Updates playback mode ('sweep' | 'timelapse' | 'touch').
   */
  public setMode(mode: Mode): void {
    if (this.currentMode === mode) return;

    this.releaseVoices();
    this.currentMode = mode;

    if (mode === 'touch') {
      Tone.Transport.pause();
    } else if (this.isPlaying) {
      Tone.Transport.start();
    }
  }

  /**
   * Handles touch/hover inspection coordinates over the 3D globe.
   * Glides a mono synth with portamento to the physical value under cursor.
   */
  public setCursor(cursor: LatLon | null): void {
    if (!this.touchSynth) return;

    if (this.currentMode !== 'touch' || !cursor) {
      if (this.isTouchActive) {
        this.touchSynth.triggerRelease();
        this.isTouchActive = false;
      }
      return;
    }

    // Pan to cursor longitude
    if (this.panner) {
      this.panner.pan.rampTo(lonToPan(cursor.lon), 0.05);
    }

    // Sample physical value from grid
    const normY = (90 - cursor.lat) / 180;
    const row = Math.max(0, Math.min(this.activeGrid.h - 1, Math.floor(normY * this.activeGrid.h)));
    const normX = (cursor.lon + 180) / 360;
    const col = Math.max(0, Math.min(this.activeGrid.w - 1, Math.floor(normX * this.activeGrid.w)));
    const idx = row * this.activeGrid.w + col;
    const val = this.activeGrid.values[idx];

    if (val === null || val === undefined || Number.isNaN(val)) {
      if (this.isTouchActive) {
        this.touchSynth.triggerRelease();
        this.isTouchActive = false;
      }
      return;
    }

    const note = valueToNote(val, this.activeTrack.min, this.activeTrack.max);
    if (!note) {
      if (this.isTouchActive) {
        this.touchSynth.triggerRelease();
        this.isTouchActive = false;
      }
      return;
    }

    if (!this.isTouchActive) {
      this.touchSynth.triggerAttack(note);
      this.isTouchActive = true;
    } else {
      this.touchSynth.setNote(note);
    }
  }

  /**
   * Sets the active track metadata and loads appropriate instrument.
   */
  public setTrack(track: TrackMeta, grid?: ValueGrid): void {
    this.activeTrack = track;
    this.setupInstrument(track.instrument);

    if (grid) {
      this.activeGrid = grid;
    } else {
      this.activeGrid = makeFakeGrid(this.currentFrameIndex);
    }

    this.updateGlobalMean();
  }

  /**
   * Sets the active annual frame index and updates current value grid.
   */
  public setFrame(frameIndex: number, grid?: ValueGrid): void {
    this.currentFrameIndex = frameIndex;
    if (grid) {
      this.activeGrid = grid;
    } else {
      this.activeGrid = makeFakeGrid(frameIndex);
    }
    this.updateGlobalMean();
  }

  /**
   * Updates master volume (0..1 range mapped to decibels with safety limits).
   */
  public setVolume(vol: number): void {
    if (!this.masterVolume) return;
    const clamped = Math.max(0, Math.min(1, vol));
    if (clamped <= 0.001) {
      this.masterVolume.volume.value = -Infinity;
    } else {
      // Maps 0..1 to -40dB..0dB
      const db = Tone.gainToDb(clamped);
      this.masterVolume.volume.rampTo(db, 0.05);
    }
  }

  /**
   * Toggles master mute.
   */
  public setMuted(muted: boolean): void {
    if (!this.masterVolume) return;
    if (muted) {
      this.masterVolume.mute = true;
    } else {
      this.masterVolume.mute = false;
    }
  }

  /**
   * Plays a reference tone for audio calibration (lowest or highest note of the dataset).
   */
  public playReferenceTone(type: 'min' | 'max'): void {
    if (!this.referenceSynth) return;

    const val = type === 'min' ? this.activeTrack.min : this.activeTrack.max;
    const note = valueToNote(val, this.activeTrack.min, this.activeTrack.max);
    if (note) {
      this.referenceSynth.triggerAttackRelease(note, '1.2');
    }
  }

  /**
   * Releases all active synth voices to ensure silence on pause/mode switch.
   */
  private releaseVoices(): void {
    if (this.activeInstrument) {
      this.activeInstrument.releaseAll();
    }
    if (this.touchSynth && this.isTouchActive) {
      this.touchSynth.triggerRelease();
      this.isTouchActive = false;
    }
  }

  /**
   * Recalculates the global mean of the current grid.
   */
  private updateGlobalMean(): void {
    this.currentGlobalMean = computeGlobalMean(this.activeGrid);
  }

  /**
   * Returns normalized audio output amplitude (0.0 to 1.0) for visual pulsing.
   */
  public getLevel(): number {
    if (!this.meter) return 0;
    const val = this.meter.getValue();
    if (typeof val === 'number') {
      return Math.max(0, Math.min(1, val));
    }
    if (Array.isArray(val) && val.length > 0) {
      return Math.max(0, Math.min(1, val[0]));
    }
    return 0;
  }

  /**
   * Cleans up and disposes all Web Audio nodes and scheduled events.
   */
  public dispose(): void {
    this.pause();
    if (this.transportEventId !== null) {
      Tone.Transport.clear(this.transportEventId);
      this.transportEventId = null;
    }
    if (this.activeInstrument) {
      this.activeInstrument.dispose();
      this.activeInstrument = null;
    }
    this.touchSynth?.dispose();
    this.leadSynth?.dispose();
    this.referenceSynth?.dispose();
    this.panner?.dispose();
    this.reverb?.dispose();
    this.masterVolume?.dispose();
    this.limiter?.dispose();
    this.meter?.dispose();
    this.isStarted = false;
  }
}

// Global engine singleton instance
export const engine = new AudioEngine();

// Convenience top-level exports matching blueprint requirements
export const start = () => engine.start();
export const play = () => engine.play();
export const pause = () => engine.pause();
export const toggle = () => engine.toggle();
export const setMode = (mode: Mode) => engine.setMode(mode);
export const setVolume = (vol: number) => engine.setVolume(vol);
export const setMuted = (muted: boolean) => engine.setMuted(muted);
export const setCursor = (cursor: LatLon | null) => engine.setCursor(cursor);
export const playReferenceTone = (type: 'min' | 'max') => engine.playReferenceTone(type);
export const getLevel = (): number => engine.getLevel();
