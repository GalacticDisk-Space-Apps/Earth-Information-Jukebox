import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useJukebox } from '@/store/useJukebox';
import { preloadMainApp } from '@/data/preload';
import { playTransitionWhoosh } from '@/audio/whoosh';

vi.mock('tone', () => {
  return {
    start: vi.fn().mockResolvedValue(undefined),
    context: {
      state: 'running',
      resume: vi.fn().mockResolvedValue(undefined),
    },
    now: vi.fn().mockReturnValue(0),
    Noise: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      dispose: vi.fn(),
    })),
    Filter: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      dispose: vi.fn(),
    })),
    Gain: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
      toDestination: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      dispose: vi.fn(),
    })),
  };
});

describe('Cinematic Cloud Transition & Audio Preload', () => {
  beforeEach(() => {
    useJukebox.setState({
      status: 'idle',
      tracks: [
        {
          id: 'ocean-fever',
          title: 'Ocean Surface Temperature',
          dataset: 'MODIS Aqua SST',
          source: 'NASA EIC',
          unit: '°C',
          min: -2,
          max: 35,
          frames: ['2004', '2005'],
          instrument: 'pad',
          story: 'Warming ocean baseline.',
        },
      ],
      trackId: 'ocean-fever',
      muted: false,
      reducedMotion: false,
    });
  });

  it('preloads first frame ValueGrid and image textures without crashing', async () => {
    await expect(preloadMainApp()).resolves.not.toThrow();
  });

  it('plays transition whoosh sound with Tone.js and disposes cleanly', () => {
    const cleanup = playTransitionWhoosh(0.1);
    expect(typeof cleanup).toBe('function');
    expect(() => cleanup()).not.toThrow();
  });

  it('skips transition whoosh sound when muted', () => {
    useJukebox.setState({ muted: true });
    const cleanup = playTransitionWhoosh(0.1);
    expect(() => cleanup()).not.toThrow();
  });

  it('unlocks audio synchronously in the store', () => {
    expect(useJukebox.getState().status).toBe('idle');
    useJukebox.getState().unlockAudio();
    expect(useJukebox.getState().status).toBe('ready');
  });

  it('handles prefers-reduced-motion flag properly in state', () => {
    useJukebox.getState().setReducedMotion(true);
    expect(useJukebox.getState().reducedMotion).toBe(true);

    useJukebox.getState().setReducedMotion(false);
    expect(useJukebox.getState().reducedMotion).toBe(false);
  });
});
