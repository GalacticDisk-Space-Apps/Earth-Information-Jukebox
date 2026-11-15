import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useJukebox, useReducedMotion, useStatus } from '@/store/useJukebox';
import { engine } from '@/audio/engine';
import { HeroGlobe } from './HeroGlobe';
import { preloadCloudTexture } from './CloudTransition';

const TITLE = 'Earth Information Jukebox';

export interface StartScreenProps {
  onDropNeedle?: () => void;
  isTransitioning?: boolean;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onDropNeedle,
  isTransitioning = false,
}) => {
  const status = useStatus();
  const unlockAudio = useJukebox((s) => s.unlockAudio);
  const reducedMotion = useReducedMotion();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const startedRef = useRef(false);

  // Auto-focus the primary start button on mount for immediate keyboard accessibility
  // and preload the cloud texture on mount so there is 0 hitch on click
  useEffect(() => {
    preloadCloudTexture();

    if (status === 'idle') {
      const timer = setTimeout(() => {
        buttonRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleStartClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    // Guard: transition must start exactly once
    if (startedRef.current) return;
    startedRef.current = true;

    // 1. FIRST call unlockAudio() and engine.start() synchronously inside click handler
    // for immediate browser Web Audio context unlocking via direct user gesture
    unlockAudio();
    engine.start().catch((err) => {
      console.error('Failed to unlock Web Audio context in gesture:', err);
    });

    // 2. THEN start the cinematic transition
    onDropNeedle?.();
  };

  const easeCurve: [number, number, number, number] = [0.22, 1, 0.36, 1];

  return (
    <motion.div
      data-testid="start-screen-container"
      role="main"
      aria-label="Welcome to Earth Information Jukebox"
      // Start screen fades out over p 0.00 - 0.15 (0.36s) while clouds start
      animate={
        isTransitioning && !reducedMotion
          ? { opacity: 0, filter: 'blur(8px)', pointerEvents: 'none' }
          : { opacity: 1, filter: 'blur(0px)' }
      }
      transition={{
        duration: isTransitioning ? 0.36 : 0.6,
        ease: 'easeOut',
      }}
      className="fixed inset-0 z-40 flex flex-col items-center justify-between overflow-hidden bg-black text-white px-4 py-8 sm:py-10 select-none"
    >
      {/* Background Atmosphere: Soft Drifting Auroras */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full aurora-glow-1" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full aurora-glow-2" />
        <div className="absolute inset-0 film-grain" />
      </div>

      {/* Top Header Section (Above Earth) */}
      <header className="relative z-10 flex flex-col items-center text-center max-w-3xl mt-2 sm:mt-4">
        {/* Mono Label */}
        <motion.p
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeCurve, delay: reducedMotion ? 0 : 0.3 }}
          className="font-mono text-xs sm:text-xs uppercase tracking-[0.14em] text-white/50 mb-3"
        >
          NASA SPACE APPS 2026 · TEAM GALACTICDISK
        </motion.p>

        {/* Hero Title with Unbounded Font & Staggered Reveal */}
        <h1
          aria-label={TITLE}
          className="font-display font-semibold text-3xl sm:text-5xl md:text-6xl tracking-tight leading-[1.1] flex flex-wrap justify-center gap-x-3"
        >
          {reducedMotion ? (
            <span className="accent-gradient-text">{TITLE}</span>
          ) : (
            TITLE.split(' ').map((word, wordIndex) => (
              <span key={wordIndex} className="inline-flex overflow-visible whitespace-nowrap">
                {word.split('').map((char, charIndex) => {
                  const globalIndex = wordIndex * 8 + charIndex;
                  return (
                    <motion.span
                      key={charIndex}
                      initial={{
                        opacity: 0,
                        y: 14,
                        filter: 'blur(8px)',
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        filter: 'blur(0px)',
                      }}
                      transition={{
                        duration: 0.55,
                        ease: easeCurve,
                        delay: 0.45 + globalIndex * 0.022,
                      }}
                      className="accent-gradient-text inline-block"
                    >
                      {char}
                    </motion.span>
                  );
                })}
              </span>
            ))
          )}
        </h1>

        {/* Subtitle */}
        <motion.p
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: easeCurve, delay: reducedMotion ? 0 : 1.05 }}
          className="text-white/60 font-sans text-sm sm:text-base font-normal max-w-xl mt-3 sm:mt-4 leading-relaxed"
        >
          Hear our changing planet. Real NASA data, turned into sound.
        </motion.p>
      </header>

      {/* Center 3D Earth Section: Scales up smoothly during p 0.00 - 0.15 (0.36s) */}
      <motion.div
        aria-hidden="true"
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
        animate={
          isTransitioning && !reducedMotion
            ? { scale: 2.3, opacity: 0.4 }
            : { opacity: 1, scale: 1 }
        }
        transition={
          isTransitioning
            ? { duration: 0.36, ease: 'easeIn' }
            : { duration: 1.1, ease: easeCurve, delay: reducedMotion ? 0 : 0.1 }
        }
        className="relative z-0 w-full flex-1 flex items-center justify-center my-2 max-h-[58vh] min-h-[260px] aspect-square"
      >
        <HeroGlobe className="w-full h-full max-w-[500px] max-h-[500px]" />
      </motion.div>

      {/* Bottom Action Section */}
      <motion.footer
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: easeCurve, delay: reducedMotion ? 0 : 1.35 }}
        className="relative z-10 flex flex-col items-center gap-3.5 mb-2 sm:mb-4"
      >
        {/* Primary Start Button */}
        <motion.button
          ref={buttonRef}
          type="button"
          onClick={handleStartClick}
          disabled={isTransitioning}
          whileHover={reducedMotion || isTransitioning ? {} : { scale: 1.025 }}
          whileTap={reducedMotion || isTransitioning ? {} : { scale: 0.975 }}
          className="relative group p-[1px] rounded-full accent-gradient-bg button-pulse-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EA8FF] focus-visible:ring-offset-4 focus-visible:ring-offset-black transition-transform cursor-pointer disabled:cursor-default disabled:opacity-50"
          aria-label="Drop the needle and launch the Earth Information Jukebox"
        >
          <span className="flex items-center justify-center gap-2 px-8 sm:px-10 py-3.5 sm:py-4 rounded-full bg-black font-sans font-medium text-sm sm:text-base text-white tracking-wide transition-colors group-hover:bg-black/90">
            <span>Drop the needle</span>
          </span>
        </motion.button>

        {/* Headphone Recommended Mono Readout */}
        <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-white/40">
          HEADPHONES RECOMMENDED
        </p>
      </motion.footer>
    </motion.div>
  );
};

export default StartScreen;
