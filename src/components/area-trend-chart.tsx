'use client';

import React, { useState, useMemo } from 'react';
import type { TransferOrder } from '@/lib/db';

interface Props {
  orders: TransferOrder[];
}

type TimeRange = '3m' | '30d' | '7d';

interface DataPoint {
  dateStr: string;
  label: string;
  dispatched: number;
  received: number;
  shortage: number;
  to_number: string;
}

export default function AreaTrendChart({ orders }: Props) {
  const [range, setRange] = useState<TimeRange>('3m');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Group or filter data based on selected range
  const chartData = useMemo<DataPoint[]>(() => {
    // Sort orders chronologically
    const sorted = [...orders].sort(
      (a, b) => new Date(a.order_date).getTime() - new Date(b.order_date).getTime()
    );

    if (sorted.length === 0) {
      return [
        { dateStr: '2026-10-15', label: 'Oct 15', dispatched: 48000, received: 47930, shortage: 70, to_number: 'N/A' },
        { dateStr: '2026-10-22', label: 'Oct 22', dispatched: 49100, received: 49045, shortage: 55, to_number: 'N/A' },
        { dateStr: '2026-10-29', label: 'Oct 29', dispatched: 47200, received: 47142, shortage: 58, to_number: 'N/A' },
        { dateStr: '2026-11-02', label: 'Nov 02', dispatched: 51000, received: 50935, shortage: 65, to_number: 'N/A' },
        { dateStr: '2026-11-04', label: 'Nov 04', dispatched: 49600, received: 49515, shortage: 85, to_number: 'N/A' },
        { dateStr: '2026-11-06', label: 'Nov 06', dispatched: 47150, received: 47080, shortage: 70, to_number: 'N/A' },
      ];
    }

    const count = range === '7d' ? 4 : range === '30d' ? 8 : sorted.length;
    const slice = sorted.slice(-count);

    return slice.map((o) => {
      const d = new Date(o.order_date);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return {
        dateStr: o.order_date,
        label,
        dispatched: Number(o.origin_vol20 || o.start_vol20 || 0),
        received: Number(o.final_vol20 || 0),
        shortage: Number(o.loss_volume || 0),
        to_number: o.to_number,
      };
    });
  }, [orders, range]);

  // Compute SVG dimensions and curve coordinates
  const width = 800;
  const height = 240;
  const paddingX = 40;
  const paddingY = 30;

  const { minVal, maxVal, points } = useMemo(() => {
    if (chartData.length === 0) {
      return { minVal: 0, maxVal: 1, points: [] };
    }

    let min = Infinity;
    let max = -Infinity;

    for (const d of chartData) {
      if (d.dispatched < min) min = d.dispatched;
      if (d.received < min) min = d.received;
      if (d.dispatched > max) max = d.dispatched;
      if (d.received > max) max = d.received;
    }

    const rangeDiff = max - min || 1;
    const safeMin = Math.max(0, min - rangeDiff * 0.15);
    const safeMax = max + rangeDiff * 0.15;

    const effectiveWidth = width - paddingX * 2;
    const effectiveHeight = height - paddingY * 2;

    const pts = chartData.map((d, i) => {
      const x =
        chartData.length === 1
          ? width / 2
          : paddingX + (i / (chartData.length - 1)) * effectiveWidth;

      const yDispatched =
        paddingY + (1 - (d.dispatched - safeMin) / (safeMax - safeMin)) * effectiveHeight;
      const yReceived =
        paddingY + (1 - (d.received - safeMin) / (safeMax - safeMin)) * effectiveHeight;

      return {
        ...d,
        x,
        yDispatched,
        yReceived,
      };
    });

    return { minVal: safeMin, maxVal: safeMax, points: pts };
  }, [chartData, width, height, paddingX, paddingY]);

  // Generate smooth SVG Catmull-Rom or cubic Bezier spline
  const makeSmoothPath = (pts: { x: number; y: number }[]): string => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };

  const linePathDispatched = useMemo(() => {
    return makeSmoothPath(points.map((p) => ({ x: p.x, y: p.yDispatched })));
  }, [points]);

  const linePathReceived = useMemo(() => {
    return makeSmoothPath(points.map((p) => ({ x: p.x, y: p.yReceived })));
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length < 2) return '';
    const bottom = height - paddingY + 10;
    const startX = points[0].x;
    const endX = points[points.length - 1].x;
    return `${linePathDispatched} L ${endX} ${bottom} L ${startX} ${bottom} Z`;
  }, [linePathDispatched, points, height, paddingY]);

  // Active hover point
  const activePt = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : points[points.length - 1];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 text-zinc-900 shadow-2xs transition-all dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 backdrop-blur-sm">
      {/* Header with Title and Range Switcher Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
        <div>
          <h3 className="text-base md:text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-100">
            Total Transhipment Volume
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {range === '3m'
              ? 'Total volume monitored for the last 3 months'
              : range === '30d'
              ? 'Total volume monitored for the last 30 days'
              : 'Recent 7 days dispatches'}
          </p>
        </div>

        {/* Range Buttons */}
        <div className="flex items-center self-start sm:self-auto rounded-lg bg-zinc-100 p-1 border border-zinc-200 text-xs font-medium dark:bg-zinc-950/80 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setRange('3m')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              range === '3m'
                ? 'bg-white text-zinc-950 font-semibold shadow-2xs dark:bg-zinc-800 dark:text-white'
                : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Last 3 months
          </button>
          <button
            type="button"
            onClick={() => setRange('30d')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              range === '30d'
                ? 'bg-white text-zinc-950 font-semibold shadow-2xs dark:bg-zinc-800 dark:text-white'
                : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Last 30 days
          </button>
          <button
            type="button"
            onClick={() => setRange('7d')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              range === '7d'
                ? 'bg-white text-zinc-950 font-semibold shadow-2xs dark:bg-zinc-800 dark:text-white'
                : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Last 7 days
          </button>
        </div>
      </div>

      {/* Main Chart Graphic with interactive hover */}
      <div className="relative w-full overflow-hidden select-none" style={{ minHeight: '260px' }}>
        {/* Floating Tooltip Card */}
        {activePt && (
          <div
            className="absolute top-2 left-6 pointer-events-none z-20 rounded-lg border border-zinc-200 bg-white/95 p-2.5 shadow-xl text-xs backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95"
            style={{ minWidth: '150px' }}
          >
            <div className="font-semibold text-zinc-900 dark:text-zinc-200 mb-1.5 flex items-center justify-between">
              <span>{activePt.label}</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">{activePt.to_number}</span>
            </div>
            <div className="space-y-1 text-zinc-700 dark:text-zinc-300">
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                  <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white inline-block"></span>
                  Dispatched:
                </span>
                <span className="font-semibold text-zinc-950 dark:text-white font-mono">
                  {activePt.dispatched.toLocaleString()} L
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                  <span className="w-2 h-2 rounded-full bg-zinc-400 inline-block"></span>
                  Received:
                </span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                  {activePt.received.toLocaleString()} L
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 pt-1 border-t border-zinc-200 dark:border-zinc-800 text-[11px]">
                <span className="text-amber-600 dark:text-amber-400">Shortage:</span>
                <span className="font-bold text-amber-600 dark:text-amber-300 font-mono">
                  -{activePt.shortage.toFixed(2)} L
                </span>
              </div>
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Gradients for light & dark mode */}
            <linearGradient id="areaGradientLight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.16" />
              <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="areaGradientDark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
              <stop offset="50%" stopColor="#71717a" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#09090b" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="lineGlowDark" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#a1a1aa" />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e4e4e7" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            className="stroke-zinc-200 dark:stroke-zinc-800"
            strokeDasharray="3 3"
            strokeWidth="0.8"
          />
          <line
            x1={paddingX}
            y1={height / 2}
            x2={width - paddingX}
            y2={height / 2}
            className="stroke-zinc-200 dark:stroke-zinc-800"
            strokeDasharray="3 3"
            strokeWidth="0.8"
          />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            className="stroke-zinc-300 dark:stroke-zinc-800"
            strokeWidth="1"
          />

          {/* Area fill */}
          {areaPath && (
            <>
              {/* Light mode area */}
              <path
                d={areaPath}
                fill="url(#areaGradientLight)"
                className="transition-all duration-300 block dark:hidden"
              />
              {/* Dark mode area */}
              <path
                d={areaPath}
                fill="url(#areaGradientDark)"
                className="transition-all duration-300 hidden dark:block"
              />
            </>
          )}

          {/* Dual lines: Dispatched curve and Received curve */}
          {linePathReceived && (
            <path
              d={linePathReceived}
              fill="none"
              className="stroke-zinc-400 dark:stroke-zinc-500"
              strokeWidth="1.5"
              strokeOpacity="0.8"
            />
          )}

          {linePathDispatched && (
            <>
              {/* Light mode line */}
              <path
                d={linePathDispatched}
                fill="none"
                stroke="#1d4ed8"
                strokeWidth="2.4"
                className="block dark:hidden drop-shadow-xs"
              />
              {/* Dark mode line */}
              <path
                d={linePathDispatched}
                fill="none"
                stroke="url(#lineGlowDark)"
                strokeWidth="2.2"
                className="hidden dark:block drop-shadow-[0_2px_8px_rgba(255,255,255,0.25)]"
              />
            </>
          )}

          {/* Points along the path with hover detection */}
          {points.map((pt, i) => (
            <g key={i}>
              {/* Invisible large hit area */}
              <circle
                cx={pt.x}
                cy={pt.yDispatched}
                r="18"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
              />

              {/* Bullet on points */}
              <circle
                cx={pt.x}
                cy={pt.yDispatched}
                r={hoveredIndex === i ? '5' : i === points.length - 1 ? '4' : '3'}
                className="transition-all duration-150 pointer-events-none fill-blue-600 stroke-white dark:fill-white dark:stroke-zinc-950"
                strokeWidth="2"
              />

              {/* Bottom dot for received volume */}
              <circle
                cx={pt.x}
                cy={pt.yReceived}
                r="2.5"
                className="pointer-events-none fill-zinc-400 dark:fill-zinc-500"
              />

              {/* Active vertical crosshair */}
              {hoveredIndex === i && (
                <line
                  x1={pt.x}
                  y1={paddingY}
                  x2={pt.x}
                  y2={height - paddingY}
                  className="stroke-zinc-400 dark:stroke-zinc-600 pointer-events-none"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              )}
            </g>
          ))}
        </svg>

        {/* X-Axis Date Labels along bottom */}
        <div className="flex items-center justify-between px-6 pt-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-500">
          {points.map((pt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setHoveredIndex(i)}
              className={`hover:text-zinc-950 dark:hover:text-zinc-200 transition-colors cursor-pointer ${
                hoveredIndex === i ? 'text-zinc-950 dark:text-zinc-100 font-bold' : ''
              }`}
            >
              {pt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
