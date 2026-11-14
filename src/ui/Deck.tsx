import React from 'react';
import {
  useJukebox,
  useActiveTrack,
  useIsPlaying,
  useMode,
  useFrameIndex,
} from '@/store/useJukebox';

export const Deck: React.FC = () => {
  const activeTrack = useActiveTrack();
  const isPlaying = useIsPlaying();
  const mode = useMode();
  const frameIndex = useFrameIndex();
  const toggle = useJukebox((s) => s.toggle);
  const nextFrame = useJukebox((s) => s.nextFrame);
  const prevFrame = useJukebox((s) => s.prevFrame);
  const setMode = useJukebox((s) => s.setMode);

  return (
    <div
      data-testid="deck-container"
      className="flex flex-col gap-4 p-5 bg-slate-900/90 border-2 border-dashed border-pink-500 rounded-xl"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-mono uppercase tracking-wider text-pink-400">
          Deck Controls (Track, Transport, ModeSwitch, YearSlider)
        </span>
        <span className="text-xs text-slate-400 font-mono">
          Mode: <strong className="text-pink-300">{mode}</strong>
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            {activeTrack?.title ?? 'No Track Selected'}
          </h3>
          <p className="text-xs text-slate-400">{activeTrack?.dataset ?? 'Select a dataset'}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-500 active:bg-pink-700 text-white rounded text-xs font-bold transition-colors"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            onClick={prevFrame}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium"
          >
            Previous Year
          </button>
          <button
            type="button"
            onClick={nextFrame}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium"
          >
            Next Year
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
        <span>Year Frame: {activeTrack?.frames[frameIndex] ?? '2004'}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('sweep')}
            className={`px-2 py-1 rounded text-xs ${mode === 'sweep' ? 'bg-pink-900/80 text-pink-200' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Sweep
          </button>
          <button
            type="button"
            onClick={() => setMode('timelapse')}
            className={`px-2 py-1 rounded text-xs ${mode === 'timelapse' ? 'bg-pink-900/80 text-pink-200' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Timelapse
          </button>
          <button
            type="button"
            onClick={() => setMode('touch')}
            className={`px-2 py-1 rounded text-xs ${mode === 'touch' ? 'bg-pink-900/80 text-pink-200' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Touch
          </button>
        </div>
      </div>
    </div>
  );
};
