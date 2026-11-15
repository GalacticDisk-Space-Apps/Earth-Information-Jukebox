import React from 'react';
import { useActiveTrack, usePlayhead, useIsPlaying, useSelection } from '@/store/useJukebox';
import { placeName, formatCoordinates } from '@/data/series';

/**
 * Captions component providing real-time screen-reader accessible live regions
 * describing sonification playback, sweep longitude, and point inspection events.
 */
export const Captions: React.FC = () => {
  const activeTrack = useActiveTrack();
  const playhead = usePlayhead();
  const isPlaying = useIsPlaying();
  const selection = useSelection();

  const currentLon = Math.round(-180 + playhead * 360);

  let message = 'Playback paused. Ready to explore.';

  if (selection) {
    const name = placeName(selection.lat, selection.lon);
    const coords = formatCoordinates(selection.lat, selection.lon);
    message = `Inspecting ${name} (${coords}) on ${activeTrack?.title ?? 'dataset'}. Audio sonification active. Press Escape to close inspector.`;
  } else if (isPlaying) {
    message = `Scanning ${activeTrack?.title ?? 'dataset'} at longitude ${currentLon}°: active audio synthesis.`;
  }

  return (
    <div
      data-testid="captions-container"
      className="sr-only"
      aria-live="polite"
      aria-atomic="true"
    >
      <p>{message}</p>
    </div>
  );
};

export default Captions;
