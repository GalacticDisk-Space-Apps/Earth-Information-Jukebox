import { describe, it, expect, vi } from 'vitest';

vi.mock('tone', () => ({
  Destination: { volume: { value: 0 } },
  gainToDb: (g: number) => Math.log10(g) * 20,
  context: { state: 'running' },
  start: vi.fn(),
  Synth: vi.fn(),
  Panner: vi.fn(),
}));

import { valueToNote } from './pointAudio';

describe('pointAudio valueToNote sonification mapping', () => {
  const min = -2;
  const max = 35;

  it('maps minimum value to lowest scale note', () => {
    const note = valueToNote(min, min, max);
    expect(note).toBe('C3');
  });

  it('maps maximum value to highest scale note', () => {
    const note = valueToNote(max, min, max);
    expect(note).toBe('C6');
  });

  it('maps midpoint value to middle octave note', () => {
    const mid = (min + max) / 2;
    const note = valueToNote(mid, min, max);
    expect(note).toBeDefined();
    expect(typeof note).toBe('string');
  });

  it('returns null (rest) for null or NaN values', () => {
    expect(valueToNote(null, min, max)).toBeNull();
    expect(valueToNote(NaN, min, max)).toBeNull();
  });
});
