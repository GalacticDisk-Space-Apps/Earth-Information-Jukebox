import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bootstrap } from './bootstrap';
import { useJukebox } from '@/store/useJukebox';

describe('Application Bootstrap', () => {
  beforeEach(() => {
    useJukebox.setState({
      status: 'idle',
      tracks: [],
      trackId: null,
      reducedMotion: false,
    });
  });

  it('loads tracks and sets status to ready when setReady is true', async () => {
    await bootstrap({ setReady: true });
    const state = useJukebox.getState();
    expect(state.tracks.length).toBeGreaterThan(0);
    expect(state.trackId).toBe(state.tracks[0].id);
    expect(state.status).toBe('ready');
  });

  it('preserves idle status if setReady is false and status is idle', async () => {
    await bootstrap({ setReady: false });
    const state = useJukebox.getState();
    expect(state.tracks.length).toBeGreaterThan(0);
    expect(state.status).toBe('idle');
  });

  it('detects reduced motion setting if window.matchMedia is available', async () => {
    const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    vi.stubGlobal('window', { matchMedia: mockMatchMedia });

    await bootstrap({ setReady: true });
    expect(useJukebox.getState().reducedMotion).toBe(true);

    vi.unstubAllGlobals();
  });
});
