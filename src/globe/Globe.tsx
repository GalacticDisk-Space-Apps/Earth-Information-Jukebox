import React from 'react';
import { useActiveTrack, usePlayhead, useCursor } from '@/store/useJukebox';

export const Globe: React.FC = () => {
  const activeTrack = useActiveTrack();
  const playhead = usePlayhead();
  const cursor = useCursor();

  return (
    <div
      data-testid="globe-container"
      className="relative flex flex-col items-center justify-center w-full h-full min-h-[400px] bg-slate-900 border-2 border-dashed border-teal-500 rounded-xl p-6 text-center overflow-hidden"
    >
      <div className="absolute top-3 left-3 px-2 py-1 bg-teal-950/80 border border-teal-700/60 rounded text-xs font-mono text-teal-300">
        Globe Component (React Three Fiber)
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="w-48 h-48 rounded-full border-4 border-teal-400/40 bg-teal-950/40 flex items-center justify-center shadow-lg shadow-teal-500/10">
          <span className="text-sm font-semibold text-teal-200">
            3D Globe Mesh
          </span>
        </div>
        <p className="text-xs text-slate-400 max-w-sm">
          Active Layer: <span className="text-slate-200 font-medium">{activeTrack?.title ?? 'None'}</span>
        </p>
        <p className="text-xs font-mono text-slate-500">
          Scan-Line Longitude: {Math.round(-180 + playhead * 360)}°
        </p>
        {cursor && (
          <p className="text-xs font-mono text-teal-400">
            Cursor: {cursor.lat.toFixed(1)}°N, {cursor.lon.toFixed(1)}°E
          </p>
        )}
      </div>
    </div>
  );
};
