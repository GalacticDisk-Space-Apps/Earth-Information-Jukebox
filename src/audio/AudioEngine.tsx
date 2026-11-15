import React, { useEffect, useRef } from 'react';
import {
  useJukebox,
  useStatus,
  useIsPlaying,
  useMode,
  useCursor,
  useVolume,
  useIsMuted,
  useActiveTrack,
  useFrameIndex,
} from '@/store/useJukebox';
import { loadValueGrid } from '@/data/loadTrack';
import { engine } from './engine';

/**
 * Headless React bridge connecting the Zustand jukebox store to the Tone.js AudioEngine.
 * Synchronizes playback transport, modes, spatial coordinates, volume, and active frame matrices.
 * Renders null to operate purely as an audio controller.
 */
export const AudioEngine: React.FC = () => {
  const status = useStatus();
  const isPlaying = useIsPlaying();
  const mode = useMode();
  const cursor = useCursor();
  const volume = useVolume();
  const muted = useIsMuted();
  const activeTrack = useActiveTrack();
  const frameIndex = useFrameIndex();

  const setPlayhead = useJukebox((s) => s.setPlayhead);
  const nextFrame = useJukebox((s) => s.nextFrame);

  // Wire bidirectional callbacks between Tone.js Transport and Zustand store
  useEffect(() => {
    engine.onPlayheadUpdate = (pos: number) => {
      setPlayhead(pos);
    };

    engine.onAdvanceFrame = () => {
      nextFrame();
    };

    return () => {
      engine.onPlayheadUpdate = undefined;
      engine.onAdvanceFrame = undefined;
    };
  }, [setPlayhead, nextFrame]);

  // Audio Unlock on user gesture (e.g. StartScreen click)
  // Note: 'audioUnlocked' is no longer emitted — unlockAudio() now transitions
  // directly to 'ready'. Check kept for defensive safety on 'playing' fast-path.
  useEffect(() => {
    if (status === 'ready' || status === 'playing') {
      engine.start().catch((err) => {
        console.error('Failed to unlock Web Audio context:', err);
      });
    }
  }, [status]);

  // Track selection change
  useEffect(() => {
    if (activeTrack) {
      engine.setTrack(activeTrack);
    }
  }, [activeTrack]);

  // Frame index and real scientific ValueGrid synchronization
  useEffect(() => {
    let isCancelled = false;

    if (!activeTrack) {
      engine.setFrame(frameIndex);
      return;
    }

    const frameDate = activeTrack.frames[frameIndex];
    if (!frameDate) {
      engine.setFrame(frameIndex);
      return;
    }

    // Fetch Avidan's real decoded grid for the current track and frame
    loadValueGrid(activeTrack.id, frameDate, frameIndex)
      .then((grid) => {
        if (!isCancelled) {
          engine.setFrame(frameIndex, grid);
        }
      })
      .catch((err) => {
        console.warn(
          `[AudioEngine] Failed to load real grid for ${activeTrack.id}@${frameDate}:`,
          err
        );
        if (!isCancelled) {
          engine.setFrame(frameIndex);
        }
      });

    // Proactively preload the next frame for seamless playback
    if (frameIndex + 1 < activeTrack.frames.length) {
      const nextDate = activeTrack.frames[frameIndex + 1];
      loadValueGrid(activeTrack.id, nextDate, frameIndex + 1).catch(() => {});
    }

    return () => {
      isCancelled = true;
    };
  }, [activeTrack, frameIndex]);

  // Mode change
  useEffect(() => {
    engine.setMode(mode);
  }, [mode]);

  // Play / Pause transport toggle.
  // useRef is initialized to `true` so that on first mount (isPlaying is false)
  // the guard fires correctly and does NOT call engine.pause() redundantly.
  // On remount while already playing, the effect syncs the ref immediately.
  const prevPlayingRef = useRef<boolean | null>(null);
  useEffect(() => {
    // Sync ref on (re)mount so remounts don't trigger a spurious play/pause call.
    if (prevPlayingRef.current === null) {
      prevPlayingRef.current = isPlaying;
      return;
    }
    if (isPlaying !== prevPlayingRef.current) {
      prevPlayingRef.current = isPlaying;
      if (isPlaying) {
        engine.play().catch((err) => {
          console.error('AudioEngine play error:', err);
        });
      } else {
        engine.pause();
      }
    }
  }, [isPlaying]);

  // Cursor coordinate inspection (Touch mode)
  useEffect(() => {
    engine.setCursor(cursor);
  }, [cursor]);

  // Master volume change
  useEffect(() => {
    engine.setVolume(volume);
  }, [volume]);

  // Mute toggle
  useEffect(() => {
    engine.setMuted(muted);
  }, [muted]);

  return null;
};

export default AudioEngine;
