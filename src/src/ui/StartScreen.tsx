import React from 'react';
import { JukeboxTrack } from './types';

interface StartScreenProps {
  tracks: JukeboxTrack[];
  selectedTrackId: string;
  onSelectTrack: (trackId: string) => void;
  onLaunch: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  tracks,
  selectedTrackId,
  onSelectTrack,
  onLaunch,
}) => {
  return (
    <section
      aria-labelledby="eij-hero-title"
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 sm:p-6 text-slate-100"
    >
      <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/95 p-6 sm:p-10 shadow-2xl">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="inline-flex items-center rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">
            NASA Space Apps 2026 • GalacticDisk
          </span>
          <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-medium text-amber-300">
            Real-Time Browser Sonification
          </span>
        </div>

        <h1
          id="eij-hero-title"
          className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3"
        >
          Earth Information Jukebox
        </h1>

        <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-6">
          Hear the planet change. Every NASA Earth visualization is translated live
          into six latitude-band voices—mapping colour values to pitch, longitude to
          stereo pan, and visual motion to rhythm.
        </p>

        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Choose a starting visualization
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Starting track">
            {tracks.map((track) => {
              const isSelected = track.id === selectedTrackId;
              return (
                <button
                  key={track.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onSelectTrack(track.id)}
                  className={`text-left rounded-xl border p-4 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                    isSelected
                      ? 'border-cyan-400 bg-slate-800/90 shadow-lg shadow-cyan-950/40'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: track.accentColor }}
                      aria-hidden="true"
                    />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      {track.provenance === 'measured' ? 'Measured Data' : 'Image Estimate'}
                    </span>
                  </div>
                  <div className="font-semibold text-white text-sm">{track.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                    {track.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <p className="text-xs text-slate-400">
            Clicking start enables Web Audio synthesis. Use <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">Space</kbd> to play/pause and <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">M</kbd> to switch modes.
          </p>
          <button
            type="button"
            onClick={onLaunch}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 font-bold px-6 py-3 text-sm sm:text-base transition shadow-lg shadow-cyan-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-cyan-400 shrink-0"
          >
            <span aria-hidden="true">▶</span>
            Enable Audio &amp; Launch Deck
          </button>
        </div>
      </div>
    </section>
  );
};