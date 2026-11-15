import React from 'react';
import { useActiveTrack, usePlayhead, useIsPlaying, useSelection } from '@/store/useJukebox';
import { placeName, formatCoordinates } from '@/data/series';

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
      className="p-4 bg-slate-900/90 border-2 border-dashed border-purple-500 rounded-xl"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <span className="text-xs font-mono uppercase tracking-wider text-purple-400">
          Captions (aria-live region)
        </span>
      </div>

      <div
        aria-live="polite"
        aria-atomic="true"
        className="text-xs text-slate-300 font-mono"
      >
        <p>{message}</p>
      </div>
    </div>
  );
};

export default Captions;
