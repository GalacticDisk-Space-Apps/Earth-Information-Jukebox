import React, { useEffect, useRef, useState } from 'react';
import { useStatus } from '@/store/useJukebox';
import { bootstrap } from '@/app/bootstrap';
import { preloadMainApp } from '@/data/preload';
import { Layout } from '@/app/Layout';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { HelpDialog } from '@/app/HelpDialog';
import { useKeyboard } from '@/app/useKeyboard';
import { StartScreen } from '@/ui/StartScreen';
import { CloudTransition } from '@/ui/CloudTransition';
import { AudioEngine } from '@/audio/AudioEngine';
import { Captions } from '@/ui/Captions';

export const App: React.FC = () => {
  const status = useStatus();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Transition lifecycle flags
  const [isTransitionActive, setIsTransitionActive] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMainAppMounted, setIsMainAppMounted] = useState(status !== 'idle');
  const [isStartScreenMounted, setIsStartScreenMounted] = useState(status === 'idle');
  const [arrivalMessage, setArrivalMessage] = useState('');

  // Single trigger & StrictMode idempotent timestamp ref
  const transitionStartRef = useRef<number | null>(null);
  const hasFocusedRef = useRef(false);

  // Wire global keyboard shortcuts
  useKeyboard({
    isHelpOpen,
    onToggleHelp: () => setIsHelpOpen((prev) => !prev),
    onCloseHelp: () => setIsHelpOpen(false),
  });

  // Preload track catalog and main app assets immediately on mount
  useEffect(() => {
    bootstrap({ setReady: false }).then(() => {
      preloadMainApp().catch((err) => {
        console.warn('Preloading main app assets warning:', err);
      });
    });
  }, []);

  // Single trigger handler: started ONLY from click handler, never from store status effect
  const handleDropNeedle = () => {
    if (transitionStartRef.current !== null) return;
    transitionStartRef.current = performance.now();

    setIsTransitioning(true);
    setIsTransitionActive(true);
  };

  // Overlap phase: Mount main app underneath wash at p = 0.70
  const handleMountMainApp = () => {
    setIsMainAppMounted(true);
  };

  // Timeline completion: unmount transition and start screen at p = 1.0 (2.4s)
  const handleComplete = () => {
    setIsTransitionActive(false);
    setIsTransitioning(false);
    setIsStartScreenMounted(false);
    setIsMainAppMounted(true);
    focusMainControls();
  };

  const focusMainControls = () => {
    if (hasFocusedRef.current) return;
    hasFocusedRef.current = true;

    // Announce to screen-readers that application is ready
    setArrivalMessage('Earth Information Jukebox ready.');

    // Shift keyboard focus to primary controls
    requestAnimationFrame(() => {
      const playButton =
        document.getElementById('main-play-button') ||
        document.querySelector<HTMLElement>('[data-testid="deck-container"] button');
      playButton?.focus();
    });
  };

  return (
    <ErrorBoundary>
      {/* Headless AudioEngine is always mounted */}
      <AudioEngine />

      {/* Screen-reader accessible Captions live region is always mounted */}
      <Captions />

      {/* Accessible live region for screen-readers upon arrival */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {arrivalMessage}
      </div>

      {/* Main app Layout: mounted at p >= 0.70 underneath wash with no blank frame */}
      {isMainAppMounted && (
        <Layout
          isEntering={true}
          onOpenHelp={() => setIsHelpOpen(true)}
        />
      )}

      {/* Start screen: fades out over p 0.00 - 0.15 while clouds are already starting */}
      {isStartScreenMounted && (
        <StartScreen
          onDropNeedle={handleDropNeedle}
          isTransitioning={isTransitioning}
        />
      )}

      {/* Rendered ONCE at the App root outside screen switch with stable key; unmounted only when completed */}
      {isTransitionActive && (
        <CloudTransition
          key="app-cloud-transition"
          startTimeRef={transitionStartRef}
          onMountMainApp={handleMountMainApp}
          onComplete={handleComplete}
        />
      )}

      {/* Global accessible shortcuts modal */}
      <HelpDialog isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </ErrorBoundary>
  );
};

export default App;
