import React from 'react';
import { useActiveTrack } from '@/store/useJukebox';

export const Legend: React.FC = () => {
  const activeTrack = useActiveTrack();

  return (
    <div
      data-testid="legend-container"
      className="flex flex-col gap-3 p-4 bg-slate-900/90 border-2 border-dashed border-amber-500 rounded-xl"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-mono uppercase tracking-wider text-amber-400">
          Legend Panel (ReferenceTones, TrendChart)
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-slate-950/60 rounded border border-slate-800">
          <p className="font-semibold text-slate-200 mb-1">Calibration Reference Tones</p>
          <p className="text-slate-400">
            Min: {activeTrack?.min ?? 0} {activeTrack?.unit ?? ''} | Max: {activeTrack?.max ?? 100} {activeTrack?.unit ?? ''}
          </p>
        </div>
        <div className="p-3 bg-slate-950/60 rounded border border-slate-800">
          <p className="font-semibold text-slate-200 mb-1">Historical Trend Chart</p>
          <p className="text-slate-400">Decadal baseline deviation indicator</p>
        </div>
      </div>
    </div>
  );
};
