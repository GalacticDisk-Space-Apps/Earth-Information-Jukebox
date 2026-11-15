import React from 'react';
import { motion } from 'motion/react';
import {
  useJukebox,
  useActiveTrack,
  useIsPlaying,
  useMode,
  useFrameIndex,
  useReducedMotion,
} from '@/store/useJukebox';
import type { Mode } from '@/data/types';

const MODES: { id: Mode; label: string }[] = [
  { id: 'sweep', label: 'Sweep' },
  { id: 'timelapse', label: 'Timelapse' },
  { id: 'touch', label: 'Touch' },
];

export const Deck: React.FC = () => {
  const activeTrack = useActiveTrack();
  const isPlaying = useIsPlaying();
  const mode = useMode();
  const frameIndex = useFrameIndex();
  const reducedMotion = useReducedMotion();

  const toggle = useJukebox((s) => s.toggle);
  const nextFrame = useJukebox((s) => s.nextFrame);
  const prevFrame = useJukebox((s) => s.prevFrame);
  const setMode = useJukebox((s) => s.setMode);

  const currentYear = activeTrack?.frames[frameIndex] ?? '2004';
  const totalFrames = activeTrack?.frames.length ?? 0;

  return (
    <div
      data-testid="deck-container"
      className="flex flex-col gap-4 text-white"
    >
      {/* Top Header Row: Label & Active Mode Tag */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/50">
          DECK CONTROLS
        </span>
        <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-white/70">
          <span>MODE:</span>
          <span className="px-2 py-0.5 rounded-full bg-white/[0.08] border border-white/[0.12] text-accent-blue font-semibold">
            {mode}
          </span>
        </div>
      </div>

      {/* Track Info & Primary Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display font-medium text-base sm:text-lg text-white truncate">
            {activeTrack?.title ?? 'No Track Selected'}
          </h2>
          <p className="font-mono text-xs text-white/50 truncate mt-0.5">
            {activeTrack?.dataset ?? 'Select a dataset'}
          </p>
        </div>

        {/* Transport Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            id="main-play-button"
            type="button"
            onClick={toggle}
            whileHover={reducedMotion ? {} : { scale: 1.02 }}
            whileTap={reducedMotion ? {} : { scale: 0.98 }}
            className={`px-4 py-2 rounded-xl font-sans text-xs font-semibold tracking-wide transition-all shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EA8FF] ${
              isPlaying
                ? 'bg-white/10 text-white border border-white/20 hover:bg-white/15'
                : 'accent-gradient-bg text-white hover:brightness-110'
            }`}
            aria-label={isPlaying ? 'Pause sonification playback' : 'Start sonification playback'}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </motion.button>

          <motion.button
            type="button"
            onClick={prevFrame}
            whileHover={reducedMotion ? {} : { scale: 1.02 }}
            whileTap={reducedMotion ? {} : { scale: 0.98 }}
            className="px-3 py-2 bg-white/[0.05] hover:bg-white/[0.1] active:bg-white/[0.15] border border-white/[0.08] text-white/80 hover:text-white rounded-xl text-xs font-mono font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
            aria-label="Previous observation year"
          >
            Prev
          </motion.button>

          <motion.button
            type="button"
            onClick={nextFrame}
            whileHover={reducedMotion ? {} : { scale: 1.02 }}
            whileTap={reducedMotion ? {} : { scale: 0.98 }}
            className="px-3 py-2 bg-white/[0.05] hover:bg-white/[0.1] active:bg-white/[0.15] border border-white/[0.08] text-white/80 hover:text-white rounded-xl text-xs font-mono font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
            aria-label="Next observation year"
          >
            Next
          </motion.button>
        </div>
      </div>

      {/* Frame Year Display & Mode Segmented Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/[0.08]">
        <div className="flex items-center gap-2 font-mono text-xs text-white/60">
          <span className="uppercase tracking-[0.12em] text-white/40">YEAR FRAME:</span>
          <span className="text-white font-semibold">{currentYear}</span>
          <span className="text-white/30 text-[10px]">
            ({frameIndex + 1}/{totalFrames || 21})
          </span>
        </div>

        {/* Mode Selector (Sweep / Timelapse / Touch) */}
        <div
          role="radiogroup"
          aria-label="Sonification Mode Selection"
          className="flex items-center p-1 bg-white/[0.04] border border-white/[0.08] rounded-xl self-start sm:self-auto"
        >
          {MODES.map((m) => {
            const isActive = mode === m.id;
            return (
              <motion.button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setMode(m.id)}
                whileHover={reducedMotion ? {} : { scale: 1.02 }}
                whileTap={reducedMotion ? {} : { scale: 0.98 }}
                className={`relative px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/50 ${
                  isActive
                    ? 'text-white bg-white/[0.12] border border-white/[0.16] shadow-sm'
                    : 'text-white/50 hover:text-white/80 border border-transparent'
                }`}
              >
                {m.label}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Deck;
