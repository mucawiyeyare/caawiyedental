import React from 'react';
import { MoreVertical } from 'lucide-react';

/**
 * CircularKpiCard
 * 
 * Matches modern UI card design featuring:
 * - Soft-tinted square icon badge (top-left)
 * - Three-dots menu icon (top-right)
 * - Large bold metric number + descriptive label (bottom-left)
 * - Clean circular progress donut gauge with percentage (bottom-right)
 */
const CircularKpiCard = ({
  icon,
  value,
  label,
  subText,
  percentage = 0,
  colorScheme = 'blue',
  onOptionsClick,
  className = ''
}) => {
  // Preset styling configurations matching reference image
  const schemes = {
    blue: {
      iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
      trackColor: '#e0f2fe',
      strokeColor: '#38bdf8',
      strokeGradientStart: '#38bdf8',
      strokeGradientEnd: '#2563eb',
      glowColor: 'rgba(37, 99, 235, 0.25)'
    },
    green: {
      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
      trackColor: '#dcfce7',
      strokeColor: '#4ade80',
      strokeGradientStart: '#4ade80',
      strokeGradientEnd: '#16a34a',
      glowColor: 'rgba(22, 163, 74, 0.25)'
    },
    red: {
      iconBg: 'bg-rose-50 text-rose-500 dark:bg-rose-950/50 dark:text-rose-400',
      trackColor: '#ffe4e6',
      strokeColor: '#fb7185',
      strokeGradientStart: '#fb7185',
      strokeGradientEnd: '#e11d48',
      glowColor: 'rgba(225, 29, 72, 0.25)'
    },
    amber: {
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
      trackColor: '#fef3c7',
      strokeColor: '#fbbf24',
      strokeGradientStart: '#fbbf24',
      strokeGradientEnd: '#d97706',
      glowColor: 'rgba(217, 119, 6, 0.25)'
    },
    purple: {
      iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400',
      trackColor: '#f3e8ff',
      strokeColor: '#c084fc',
      strokeGradientStart: '#c084fc',
      strokeGradientEnd: '#7c3aed',
      glowColor: 'rgba(124, 58, 237, 0.25)'
    }
  };

  const scheme = schemes[colorScheme] || schemes.blue;

  // SVG circular gauge geometry
  const size = 56;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;
  const gradientId = `kpi-grad-${colorScheme}-${label?.replace(/\s+/g, '-').toLowerCase() || 'stat'}`;

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100/90 dark:border-slate-800/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 flex flex-col justify-between ${className}`}
    >
      {/* Top Row: Icon Badge & Options Menu */}
      <div className="flex items-center justify-between mb-4">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-transform hover:scale-105 ${scheme.iconBg}`}>
          {icon}
        </div>

        <button
          type="button"
          onClick={onOptionsClick}
          aria-label="More options"
          className="text-slate-300 hover:text-slate-500 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Row: Metric Info & Donut Progress Gauge */}
      <div className="flex items-end justify-between gap-3">
        {/* Metric Value & Label */}
        <div className="min-w-0">
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none font-sans">
            {value}
          </div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1.5 truncate">
            {label}
          </p>
          {subText && (
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 truncate">
              {subText}
            </p>
          )}
        </div>

        {/* Circular Donut Progress Indicator */}
        <div className="relative shrink-0 flex items-center justify-center">
          <svg width={size} height={size} className="transform -rotate-90">
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={scheme.strokeGradientStart} />
                <stop offset="100%" stopColor={scheme.strokeGradientEnd} />
              </linearGradient>
            </defs>

            {/* Background Track Circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={scheme.trackColor}
              strokeWidth={strokeWidth}
              fill="transparent"
              className="dark:opacity-30"
            />

            {/* Progress Stroke Circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={`url(#${gradientId})`}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Centered Percentage Text */}
          <span className="absolute text-[11px] font-black text-slate-800 dark:text-slate-100 font-sans">
            {clampedPercent}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default CircularKpiCard;
