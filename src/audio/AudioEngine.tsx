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
  useEffect(() => {
    if (status === 'audioUnlocked' || status === 'ready' || status === 'playing') {
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

  // Frame index (year) change
  useEffect(() => {
    engine.setFrame(frameIndex);
  }, [frameIndex]);

  // Mode change
  useEffect(() => {
    engine.setMode(mode);
  }, [mode]);

  // Play / Pause transport toggle
  const prevPlayingRef = useRef(isPlaying);
  useEffect(() => {
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
