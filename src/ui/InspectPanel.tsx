import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  useActiveTrack,
  useFrameIndex,
  useJukebox,
  useSelection,
  useShowDataLayer,
} from '@/store/useJukebox';
import { formatCoordinates, formatValue, getPointSeries, placeName } from '@/data/series';
import { playPing, playPoint } from '@/audio/pointAudio';

/**
 * InspectPanel component rendering detailed geographical and historical time-series data
 * for a selected point on the Earth globe.
 *
 * Anchored at the bottom-left of the globe canvas without obstructing the center view.
 */
export const InspectPanel: React.FC = () => {
  const selection = useSelection();
  const activeTrack = useActiveTrack();
  const frameIndex = useFrameIndex();
  const showDataLayer = useShowDataLayer();

  const clearSelection = useJukebox((s) => s.clearSelection);
  const toggleDataLayer = useJukebox((s) => s.toggleDataLayer);
  const setFrame = useJukebox((s) => s.setFrame);

  const panelRef = useRef<HTMLDivElement>(null);
  const isInitialSelectionPlayRef = useRef(false);

  const [series, setSeries] = useState<{ date: string; value: number | null }[]>([]);
  const [loading, setLoading] = useState(false);

  // Focus panel on open for screen-readers and keyboard accessibility
  useEffect(() => {
    if (selection) {
      panelRef.current?.focus();
    }
  }, [selection]);

  // Handle Escape key to dismiss panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [clearSelection]);

  // Load historical time-series data when point selection or track changes
  useEffect(() => {
    let isMounted = true;
    if (!selection || !activeTrack) {
      setSeries([]);
      return;
    }

    setLoading(true);
    isInitialSelectionPlayRef.current = true;
    const currentTrack = activeTrack;
    const initialFrame = frameIndex;

    getPointSeries(currentTrack.id, selection.lat, selection.lon).then((data) => {
      if (!isMounted) return;
      setSeries(data);
      setLoading(false);

      // Trigger ping and historical melody upon initial selection
      if (isInitialSelectionPlayRef.current) {
        isInitialSelectionPlayRef.current = false;
        playPoint(currentTrack, data, initialFrame, selection.lon);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selection, activeTrack, frameIndex]);

  // When the frame index (year) changes while panel is open, play ping note only
  const prevFrameIndexRef = useRef(frameIndex);
  useEffect(() => {
    if (prevFrameIndexRef.current !== frameIndex) {
      prevFrameIndexRef.current = frameIndex;
      if (selection && activeTrack && series.length > 0 && !isInitialSelectionPlayRef.current) {
        const currentVal = series[frameIndex]?.value ?? null;
        playPing(activeTrack, currentVal, selection.lon);
      }
    }
  }, [frameIndex, selection, activeTrack, series]);

  // Compute metrics
  const { locationName, coordsStr, currentVal, currentYear, changeText, isChangeWarm } =
    useMemo(() => {
      if (!selection || !activeTrack) {
        return {
          locationName: '',
          coordsStr: '',
          currentVal: null,
          currentYear: '2024',
          changeText: '',
          isChangeWarm: false,
        };
      }

      const name = placeName(selection.lat, selection.lon);
      const coords = formatCoordinates(selection.lat, selection.lon);
      const year = activeTrack.frames[frameIndex] ?? '2024';
      const val = series[frameIndex]?.value ?? null;

      // Change since first year
      const firstValidPoint = series.find((p) => p.value !== null);
      const firstVal = firstValidPoint?.value ?? null;
      const firstYear = firstValidPoint?.date ?? series[0]?.date ?? '2004';

      let diffStr = 'No historical comparison';
      let warm = false;

      if (val !== null && firstVal !== null) {
        const diff = val - firstVal;
        const sign = diff > 0 ? '+' : '';
        diffStr = `${sign}${diff.toFixed(1)} ${activeTrack.unit} since ${firstYear}`;
        warm = diff > 0;
      }

      return {
        locationName: name,
        coordsStr: coords,
        currentVal: val,
        currentYear: year,
        changeText: diffStr,
        isChangeWarm: warm,
      };
    }, [selection, activeTrack, frameIndex, series]);

  // Screen reader verbal announcement
  const announcement = useMemo(() => {
    if (!selection || !activeTrack) return '';
    const valText = formatValue(currentVal, activeTrack.unit);
    return `${locationName}. ${valText} in ${currentYear}, ${changeText}.`;
  }, [selection, activeTrack, locationName, currentVal, currentYear, changeText]);

  // Sparkline coordinates calculation (always called in the same hook order)
  const sparklineData = useMemo(() => {
    if (!selection || !activeTrack || series.length < 2) return null;
    const validVals = series
      .map((s) => s.value)
      .filter((v): v is number => v !== null && !Number.isNaN(v));

    if (validVals.length === 0) return null;

    const minV = Math.min(...validVals);
    const maxV = Math.max(...validVals);
    const range = maxV - minV || 1;

    const width = 240;
    const height = 40;
    const paddingX = 8;
    const paddingY = 6;
    const usableW = width - paddingX * 2;
    const usableH = height - paddingY * 2;

    const points: { x: number; y: number; val: number | null; index: number; year: string }[] = [];

    series.forEach((pt, idx) => {
      const x = paddingX + (idx / (series.length - 1)) * usableW;
      const y =
        pt.value !== null
          ? paddingY + (1 - (pt.value - minV) / range) * usableH
          : paddingY + usableH;
      points.push({ x, y, val: pt.value, index: idx, year: pt.date });
    });

    // Generate polyline string for connected valid data points
    const segments: string[] = [];
    let currentSegment: string[] = [];

    points.forEach((pt) => {
      if (pt.val !== null) {
        currentSegment.push(`${pt.x.toFixed(1)},${pt.y.toFixed(1)}`);
      } else {
        if (currentSegment.length > 0) {
          segments.push(currentSegment.join(' '));
          currentSegment = [];
        }
      }
    });
    if (currentSegment.length > 0) {
      segments.push(currentSegment.join(' '));
    }

    const currentPoint = points[frameIndex];

    return { width, height, segments, points, currentPoint };
  }, [selection, activeTrack, series, frameIndex]);

  if (!selection || !activeTrack) {
    return null;
  }

  return (
    <aside
      ref={panelRef}
      role="dialog"
      tabIndex={-1}
      aria-labelledby="inspect-panel-title"
      aria-describedby="inspect-panel-desc"
      className="absolute bottom-4 left-4 z-20 w-80 max-w-[calc(100vw-2rem)] rounded-xl border p-4 shadow-2xl backdrop-blur-md text-slate-100 outline-none animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{
        backgroundColor: 'rgba(15, 22, 38, 0.94)',
        borderColor: '#1E2A40',
      }}
    >
      {/* Hidden Live Region for Screen-Reader Announcements */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* Header with Place Name and Close button */}
      <div className="flex items-start justify-between gap-2 border-b pb-2 mb-3" style={{ borderColor: '#1E2A40' }}>
        <div>
          <h2
            id="inspect-panel-title"
            className="text-sm font-bold text-white tracking-tight leading-snug truncate"
          >
            {locationName}
          </h2>
          <p id="inspect-panel-desc" className="text-xs text-slate-400 font-mono mt-0.5">
            {coordsStr}
          </p>
        </div>

        <button
          type="button"
          onClick={clearSelection}
          aria-label="Close inspector (Escape)"
          className="px-2 py-0.5 rounded text-xs font-mono text-slate-400 hover:text-white transition-colors border"
          style={{
            backgroundColor: '#070B14',
            borderColor: '#1E2A40',
          }}
        >
          ✕
        </button>
      </div>

      {/* Big Value for Selected Year */}
      <div className="my-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tracking-tight text-white">
            {currentVal !== null ? currentVal.toFixed(1) : '—'}
          </span>
          <span className="text-sm font-medium text-slate-300">
            {activeTrack.unit}
          </span>
          <span className="text-xs font-mono text-slate-400">
            ({currentYear})
          </span>
        </div>

        {/* Change since first year */}
        <p
          className={`text-xs font-mono font-medium mt-1 ${
            isChangeWarm ? 'text-amber-400' : 'text-sky-400'
          }`}
        >
          {changeText}
        </p>
      </div>

      {/* Sparkline Visual Time-Series */}
      <div className="my-3">
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mb-1">
          <span>{series[0]?.date ?? '2004'}</span>
          <span className="text-slate-500">Historical Trend</span>
          <span>{series[series.length - 1]?.date ?? '2024'}</span>
        </div>

        <div
          className="relative h-10 w-full rounded border overflow-hidden flex items-center justify-center"
          style={{
            backgroundColor: '#070B14',
            borderColor: '#1E2A40',
          }}
        >
          {loading ? (
            <span className="text-[11px] text-slate-500 font-mono">Loading data...</span>
          ) : sparklineData ? (
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${sparklineData.width} ${sparklineData.height}`}
              className="overflow-visible select-none cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                const targetIdx = Math.round(ratio * (series.length - 1));
                setFrame(targetIdx);
              }}
            >
              {/* Trend Polyline Segments */}
              {sparklineData.segments.map((seg, i) => (
                <polyline
                  key={i}
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={seg}
                />
              ))}

              {/* Current Year Vertical Guide */}
              {sparklineData.currentPoint && (
                <>
                  <line
                    x1={sparklineData.currentPoint.x}
                    y1={2}
                    x2={sparklineData.currentPoint.x}
                    y2={sparklineData.height - 2}
                    stroke="#FBBF24"
                    strokeWidth="1.5"
                    strokeDasharray="2,2"
                  />
                  <circle
                    cx={sparklineData.currentPoint.x}
                    cy={sparklineData.currentPoint.y}
                    r="3.5"
                    fill="#FBBF24"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                </>
              )}
            </svg>
          ) : (
            <span className="text-[11px] text-slate-500 font-mono">No data points</span>
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="mt-3 pt-3 border-t flex flex-wrap gap-2 text-xs" style={{ borderColor: '#1E2A40' }}>
        {/* Play This Place */}
        <button
          type="button"
          onClick={() => playPoint(activeTrack, series, frameIndex, selection.lon)}
          className="flex-1 min-w-[100px] px-3 py-1.5 rounded font-medium text-white transition-colors text-center"
          style={{ backgroundColor: '#1E5BD8' }}
        >
          ▶ Play this place
        </button>

        {/* Show / Hide Data Layer Toggle */}
        <button
          type="button"
          onClick={toggleDataLayer}
          className="px-2.5 py-1.5 rounded font-mono border text-slate-300 hover:text-white transition-colors"
          style={{
            backgroundColor: '#070B14',
            borderColor: '#1E2A40',
          }}
        >
          {showDataLayer ? 'Hide overlay' : 'Show overlay'} (L)
        </button>

        {/* Close Button */}
        <button
          type="button"
          onClick={clearSelection}
          className="px-2.5 py-1.5 rounded font-mono border text-slate-400 hover:text-white transition-colors"
          style={{
            backgroundColor: '#070B14',
            borderColor: '#1E2A40',
          }}
        >
          Close
        </button>
      </div>
    </aside>
  );
};

export default InspectPanel;
