import React from 'react';
import { JukeboxTrack, SonificationMode } from './types';

interface JukeboxDeckProps {
  tracks: JukeboxTrack[];
  activeTrack: JukeboxTrack;
  isPlaying: boolean;
  mode: SonificationMode;
  volume: number;
  speed: number;
  onSelectTrack: (trackId: string) => void;
  onTogglePlay: () => void;
  onChangeMode: (mode: SonificationMode) => void;
  onChangeVolume: (volume: number) => void;
  onChangeSpeed: (speed: number) => void;
  onPlayReferenceTone?: () => void;
}

const SPEED_OPTIONS = [0.5, 1, 2];

export const JukeboxDeck: React.FC<JukeboxDeckProps> = ({
  tracks,
  activeTrack,
  isPlaying,
  mode,
  volume,
  speed,
  onSelectTrack,
  onTogglePlay,
  onChangeMode,
  onChangeVolume,
  onChangeSpeed,
  onPlayReferenceTone,
}) => {
  const provenanceLabel =
    mode === 'creative'
      ? 'ARTISTIC MAPPING'
      : activeTrack.provenance === 'measured'
      ? 'MEASURED DATA'
      : 'IMAGE ESTIMATE';

  const provenanceBadgeStyle =
    mode === 'creative'
      ? 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40'
      : activeTrack.provenance === 'measured'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
      : 'bg-amber-500/15 text-amber-300 border-amber-500/40';

  return (
    <aside
      aria-label="Earth Jukebox Deck"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-1.5rem)] max-w-5xl rounded-2xl border border-slate-800/90 bg-slate-950/85 backdrop-blur-xl p-4 sm:p-5 text-slate-100 shadow-2xl"
    >
      {/* Top Row: Track Switcher + Provenance Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800/80">
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Visualization Tracks">
          {tracks.map((track, idx) => {
            const active = track.id === activeTrack.id;
            return (
              <button
                key={track.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectTrack(track.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  active
                    ? 'bg-slate-800 text-white border border-slate-600 shadow-sm'
                    : 'bg-slate-900/70 text-slate-400 border border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span className="font-mono text-[11px] text-slate-500">0{idx + 1}</span>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: track.accentColor }}
                  aria-hidden="true"
                />
                <span>{track.title}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-mono font-semibold tracking-wider ${provenanceBadgeStyle}`}
          >
            {provenanceLabel}
          </span>
        </div>
      </div>

      {/* Middle Row: Track Info & Credits */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-base sm:text-lg font-bold text-white">
              {activeTrack.title}
            </h2>
            <span className="text-xs text-slate-400">
              {activeTrack.subtitle} ({activeTrack.rangeLabel})
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
            {activeTrack.description}
          </p>
        </div>
        <span className="text-[11px] text-slate-500 shrink-0">
          Source: {activeTrack.credit}
        </span>
      </div>

      {/* Bottom Row: Transport, Mode Switcher, Speed, Volume */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Play/Pause + Reference Tone */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onTogglePlay}
            aria-pressed={isPlaying}
            aria-label={isPlaying ? 'Pause sonification' : 'Play sonification'}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 font-bold px-5 py-2.5 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <span aria-hidden="true">{isPlaying ? '❚❚' : '▶'}</span>
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          {onPlayReferenceTone && (
            <button
              type="button"
              onClick={onPlayReferenceTone}
              title="Play low-to-high calibration tone for current dataset range"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3.5 py-2.5 text-xs font-medium text-slate-200 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <span aria-hidden="true">♪</span>
              <span>Calibrate</span>
            </button>
          )}
        </div>

        {/* Center: Scientific vs Creative Mode Switch */}
        <div
          role="group"
          aria-label="Sonification Mode"
          className="inline-flex rounded-xl border border-slate-800 bg-slate-900 p-1"
        >
          <button
            type="button"
            aria-pressed={mode === 'scientific'}
            onClick={() => onChangeMode('scientific')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              mode === 'scientific'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Scientific
          </button>
          <button
            type="button"
            aria-pressed={mode === 'creative'}
            onClick={() => onChangeMode('creative')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 ${
              mode === 'creative'
                ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Creative
          </button>
        </div>

        {/* Right: Speed + Volume */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1" role="group" aria-label="Playback Speed">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 mr-1">
              Speed
            </span>
            {SPEED_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                aria-pressed={speed === opt}
                onClick={() => onChangeSpeed(opt)}
                className={`rounded-md px-2 py-1 text-xs font-mono transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  speed === opt
                    ? 'bg-slate-700 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt}x
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300">
            <span className="text-[11px] uppercase tracking-wider text-slate-500">
              Vol
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
              aria-label="Master Volume"
              className="w-20 sm:w-24 accent-cyan-400 cursor-pointer"
            />
            <span className="w-8 text-right font-mono text-[11px] text-slate-400">
              {Math.round(volume * 100)}%
            </span>
          </label>
        </div>
      </div>
    </aside>
  );
};