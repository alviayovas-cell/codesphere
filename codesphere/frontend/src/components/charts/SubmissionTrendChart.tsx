import { useState } from 'react'
import type { SubmissionTrendPoint } from '../../types'

interface SubmissionTrendChartProps {
  points: SubmissionTrendPoint[]
}

const PLOT_TOP = 10
const PLOT_BOTTOM = 140
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP
const SEGMENT_GAP = 2

function formatShortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatFullDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function SubmissionTrendChart({ points }: SubmissionTrendChartProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  const maxTotal = Math.max(...points.map((p) => p.accepted + p.other), 1)
  // Round the scale up to a clean step so the gridlines read as round numbers.
  const step = maxTotal <= 5 ? 1 : maxTotal <= 20 ? 5 : maxTotal <= 100 ? 20 : 50
  const scaleMax = Math.max(step, Math.ceil(maxTotal / step) * step)

  const slotWidth = 560 / points.length
  const barWidth = Math.min(20, slotWidth * 0.5)

  const hoveredPoint = hovered !== null ? points[hovered] : null

  return (
    <div>
      <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary-500 dark:bg-primary-400" /> Accepted
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-zinc-300 dark:bg-zinc-600" /> Other
        </span>
      </div>

      <div className="relative mt-2">
        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs shadow-md dark:border-zinc-700 dark:bg-zinc-800"
            style={{ left: `${((hovered! + 0.5) / points.length) * 100}%`, top: `${(PLOT_TOP / 170) * 100}%` }}
          >
            <p className="font-medium text-zinc-900 dark:text-white">{formatFullDate(hoveredPoint.date)}</p>
            <p className="mt-0.5 text-zinc-600 dark:text-zinc-300">
              <span className="font-semibold">{hoveredPoint.accepted}</span> accepted ·{' '}
              <span className="font-semibold">{hoveredPoint.other}</span> other
            </p>
          </div>
        )}

        <svg viewBox="0 0 560 170" className="w-full" role="img" aria-label="Submissions over the last 14 days, split by accepted and other verdicts">
          {/* recessive gridlines at 0 / half / max */}
          {[0, 0.5, 1].map((frac) => {
            const y = PLOT_BOTTOM - frac * PLOT_HEIGHT
            return (
              <g key={frac}>
                <line x1={0} x2={560} y1={y} y2={y} className="stroke-zinc-100 dark:stroke-zinc-800" strokeWidth={1} />
                <text x={0} y={y - 3} className="fill-zinc-400 text-[8px] dark:fill-zinc-500">
                  {Math.round(frac * scaleMax)}
                </text>
              </g>
            )
          })}

          {points.map((point, i) => {
            const total = point.accepted + point.other
            const acceptedHeight = (point.accepted / scaleMax) * PLOT_HEIGHT
            const otherHeight = (point.other / scaleMax) * PLOT_HEIGHT
            const slotX = i * slotWidth + (slotWidth - barWidth) / 2
            const acceptedTopmost = point.other === 0

            return (
              <g
                key={point.date}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered((h) => (h === i ? null : h))}
                tabIndex={total > 0 ? 0 : -1}
                className="cursor-pointer outline-none"
              >
                {/* wide, low-opacity hit target - easier to hover than the thin bar itself */}
                <rect x={i * slotWidth} y={PLOT_TOP} width={slotWidth} height={PLOT_HEIGHT} fill="transparent" />

                {point.accepted > 0 && (
                  <rect
                    x={slotX}
                    y={PLOT_BOTTOM - acceptedHeight}
                    width={barWidth}
                    height={acceptedHeight}
                    rx={acceptedTopmost ? 3 : 0}
                    className="fill-primary-500 dark:fill-primary-400"
                    opacity={hovered === null || hovered === i ? 1 : 0.4}
                  />
                )}
                {point.other > 0 && (
                  <rect
                    x={slotX}
                    y={PLOT_BOTTOM - acceptedHeight - SEGMENT_GAP - otherHeight}
                    width={barWidth}
                    height={otherHeight}
                    rx={3}
                    className="fill-zinc-300 dark:fill-zinc-600"
                    opacity={hovered === null || hovered === i ? 1 : 0.4}
                  />
                )}

                {(i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2)) && (
                  <text
                    x={i * slotWidth + slotWidth / 2}
                    y={PLOT_BOTTOM + 14}
                    textAnchor="middle"
                    className="fill-zinc-400 text-[8px] dark:fill-zinc-500"
                  >
                    {formatShortDate(point.date)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
          View as table
        </summary>
        <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="px-2 py-1.5 font-medium">Date</th>
                <th className="px-2 py-1.5 font-medium">Accepted</th>
                <th className="px-2 py-1.5 font-medium">Other</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {points.map((point) => (
                <tr key={point.date}>
                  <td className="px-2 py-1.5">{formatFullDate(point.date)}</td>
                  <td className="px-2 py-1.5">{point.accepted}</td>
                  <td className="px-2 py-1.5">{point.other}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
