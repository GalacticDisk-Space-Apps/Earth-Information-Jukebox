import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadTrackMeta,
  loadValueGrid,
  loadTrendData,
  getFrameTextureUrl,
  clearDataCache,
} from './loadTrack';

describe('loadTrack Client Loader', () => {
  beforeEach(() => {
    clearDataCache();
    vi.restoreAllMocks();
  });

  it('generates correct frame texture URL', () => {
    const url = getFrameTextureUrl('ocean-fever', '2024-08-01');
    expect(url).toBe('/data/ocean-fever/2024-08-01.png');
  });

  it('loads and caches track metadata from /data/<track>/meta.json', async () => {
    const mockMeta = {
      id: 'ocean-fever',
      title: 'Ocean Fever',
      dataset: 'GHRSST MUR SST',
      source: 'NASA JPL',
      unit: '°C',
      min: -2,
      max: 35,
      frames: ['2004-08-01', '2024-08-01'],
      instrument: 'pad' as const,
      story: 'Ocean warming trends',
    };

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockMeta,
    });
    vi.stubGlobal('fetch', fetchSpy);

    const meta = await loadTrackMeta('ocean-fever');
    expect(meta.id).toBe('ocean-fever');
    expect(meta.title).toBe('Ocean Fever');
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Second call should hit the cache, not call fetch again
    const cachedMeta = await loadTrackMeta('ocean-fever');
    expect(cachedMeta.id).toBe('ocean-fever');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('falls back to fake generator when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network offline')));

    const meta = await loadTrackMeta('ocean-fever');
    expect(meta.id).toBe('ocean-fever');
    expect(meta.frames.length).toBeGreaterThan(0);
  });

  it('loads and caches value grid', async () => {
    const mockGrid = {
      w: 180,
      h: 90,
      values: [21.5, null, 22.0],
    };

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockGrid,
    });
    vi.stubGlobal('fetch', fetchSpy);

    const grid = await loadValueGrid('ocean-fever', '2024-08-01');
    expect(grid.w).toBe(180);
    expect(grid.h).toBe(90);
    expect(grid.values[0]).toBe(21.5);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Cached check
    const cachedGrid = await loadValueGrid('ocean-fever', '2024-08-01');
    expect(cachedGrid.values[0]).toBe(21.5);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('loads trend.json data', async () => {
    const mockTrend = [
      { date: '2004-08-01', year: '2004', mean: 17.91, min: -0.1, max: 32.1, sampleCount: 9576 },
      { date: '2024-08-01', year: '2024', mean: 17.61, min: -0.1, max: 32.1, sampleCount: 10147 },
    ];

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTrend,
    });
    vi.stubGlobal('fetch', fetchSpy);

    const trend = await loadTrendData('ocean-fever');
    expect(trend).toHaveLength(2);
    expect(trend[0].year).toBe('2004');
    expect(trend[1].mean).toBe(17.61);
  });
});
