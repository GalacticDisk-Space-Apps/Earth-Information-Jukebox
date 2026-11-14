import React from 'react';
import { useJukebox, useStatus } from '@/store/useJukebox';

export const StartScreen: React.FC = () => {
  const status = useStatus();
  const unlockAudio = useJukebox((s) => s.unlockAudio);

  if (status !== 'idle') return null;

  return (
    <div
      data-testid="start-screen-container"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4"
    >
      <div className="flex flex-col items-center gap-4 p-8 max-w-md w-full bg-slate-900 border-2 border-dashed border-blue-500 rounded-2xl text-center shadow-2xl">
        <span className="text-xs font-mono uppercase tracking-wider text-blue-400">
          Start Screen Modal
        </span>
        <h1 className="text-xl font-bold text-slate-100">Earth Information Jukebox</h1>
        <p className="text-xs text-slate-400">
          Drop the needle on our planet: NASA Earth data you can see, hear, and explore.
        </p>
        <button
          type="button"
          onClick={unlockAudio}
          className="mt-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-lg shadow-blue-500/20 transition-all"
        >
          Drop the needle
        </button>
      </div>
    </div>
  );
};
