import * as Tone from 'tone';
import { useJukebox } from '@/store/useJukebox';

/**
 * Creates and plays a soft rising wind "whoosh" sound using Tone.js filtered noise.
 * Synced to the cloud rush acceleration, fading out smoothly upon arrival.
 * Respects user mute setting and automatically disposes of all audio nodes.
 */
export function playTransitionWhoosh(durationSeconds = 2.4): () => void {
  const store = useJukebox.getState();
  if (store.muted) {
    return () => {};
  }

  try {
    // Pink noise produces a warm, organic wind gust
    const noise = new Tone.Noise('pink');

    // Resonant lowpass filter to simulate wind rushing across aerodynamic surfaces
    const filter = new Tone.Filter({
      type: 'lowpass',
      frequency: 220,
      rolloff: -24,
      Q: 1.2,
    });

    const gain = new Tone.Gain(0);

    // Wire: Noise -> Filter -> Gain -> Destination
    noise.connect(filter);
    filter.connect(gain);
    gain.toDestination();

    noise.start();

    const now = Tone.now();

    // 1. Gain envelope: quiet start, gentle ramp up, then smooth fade out on arrival
    gain.gain.setValueAtTime(0.001, now);
    // Peak volume at cloud rush climax (~1.4s)
    gain.gain.exponentialRampToValueAtTime(0.16, now + 1.4);
    // Smooth fade to silence before arrival
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

    // 2. Frequency sweep: sweeps up from 220Hz up to 2600Hz, then descends
    filter.frequency.setValueAtTime(220, now);
    filter.frequency.exponentialRampToValueAtTime(2600, now + 1.5);
    filter.frequency.exponentialRampToValueAtTime(320, now + durationSeconds);

    // Cleanup when done
    const timer = setTimeout(() => {
      try {
        noise.stop();
        noise.dispose();
        filter.dispose();
        gain.dispose();
      } catch {
        // Safe disposal
      }
    }, (durationSeconds + 0.3) * 1000);

    return () => {
      clearTimeout(timer);
      try {
        noise.stop();
        noise.dispose();
        filter.dispose();
        gain.dispose();
      } catch {
        // Safe disposal
      }
    };
  } catch (err) {
    console.warn('Transition whoosh sound skipped:', err);
    return () => {};
  }
}
