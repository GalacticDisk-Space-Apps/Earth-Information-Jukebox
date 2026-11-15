import React from 'react';
import { useActiveTrack } from '@/store/useJukebox';

export const Legend: React.FC = () => {
  const activeTrack = useActiveTrack();

  const minVal = activeTrack?.min ?? 0;
  const maxVal = activeTrack?.max ?? 100;
  const unit = activeTrack?.unit ?? '';
  const instrument = activeTrack?.instrument ?? 'synthesizer';

  return (
    <div
      data-testid="legend-container"
      className="flex flex-col gap-3.5 text-white h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/50">
          CALIBRATION &amp; LEGEND
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/40">
          TIMBRE: <span className="text-white/80 font-semibold">{instrument}</span>
        </span>
      </div>

      {/* Grid of Calibration & Trend Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs flex-1">
        {/* Calibration Reference Tones */}
        <div className="p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-xl flex flex-col justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/60 mb-1">
              Calibration Range
            </p>
            <p className="font-mono text-sm font-semibold text-white">
              {minVal} <span className="text-white/40 font-normal">{unit}</span>
              <span className="text-white/30 mx-2">→</span>
              {maxVal} <span className="text-white/40 font-normal">{unit}</span>
            </p>
          </div>

          {/* Visual gradient range bar */}
          <div className="mt-3">
            <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-[#1E5BD8] via-[#0E9F8A] to-[#FF6AD5] opacity-80" />
            <div className="flex justify-between items-center text-[10px] font-mono text-white/40 mt-1">
              <span>Low Pitch (130 Hz)</span>
              <span>High Pitch (880 Hz)</span>
            </div>
          </div>
        </div>

        {/* Historical Trend Chart Indicator */}
        <div className="p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-xl flex flex-col justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/60 mb-1">
              Historical Trend
            </p>
            <p className="text-xs text-white/80 leading-relaxed font-sans">
              Decadal baseline deviation indicator
            </p>
          </div>

          <div className="mt-2.5 flex items-center gap-2 text-[11px] font-mono text-white/50">
            <span className="w-2 h-2 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            <span>2004–2024 Calibrated Observation</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Legend;
