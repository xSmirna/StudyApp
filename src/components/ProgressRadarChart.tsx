import type { ProgressStats } from '../services/statistics'

type Axis = {
  key: string
  label: string
  valueLabel: string
  ratio: number
}

type ProgressRadarChartProps = {
  progress: ProgressStats
  className?: string
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.min(1, value)
}

function buildAxes(progress: ProgressStats): Axis[] {
  const active = Math.max(progress.activeQuestions, 1)
  const answered = Math.max(
    progress.correctAttempts + progress.incorrectAttempts,
    1,
  )

  return [
    {
      key: 'attempted',
      label: 'Attempted',
      valueLabel: `${progress.attemptedQuestions}/${progress.activeQuestions}`,
      ratio: clampRatio(progress.attemptedQuestions / active),
    },
    {
      key: 'correct',
      label: 'Correct',
      valueLabel: String(progress.correctAttempts),
      ratio: clampRatio(progress.correctAttempts / answered),
    },
    {
      key: 'incorrect',
      label: 'Incorrect',
      valueLabel: String(progress.incorrectAttempts),
      ratio: clampRatio(progress.incorrectAttempts / answered),
    },
    {
      key: 'overdue',
      label: 'Overdue',
      valueLabel: String(progress.overdueQuestions),
      ratio: clampRatio(progress.overdueQuestions / active),
    },
  ]
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleIndex: number,
  total: number,
) {
  const angle = -Math.PI / 2 + (angleIndex * 2 * Math.PI) / total
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  }
}

export function ProgressRadarChart({
  progress,
  className,
}: ProgressRadarChartProps) {
  const axes = buildAxes(progress)
  const size = 260
  const cx = size / 2
  const cy = size / 2
  const maxRadius = 78
  const levels = [0.33, 0.66, 1]

  const gridPolygons = levels.map((level) =>
    axes
      .map((_, index) => {
        const point = polarToCartesian(cx, cy, maxRadius * level, index, axes.length)
        return `${point.x},${point.y}`
      })
      .join(' '),
  )

  const dataPoints = axes.map((axis, index) =>
    polarToCartesian(cx, cy, maxRadius * axis.ratio, index, axes.length),
  )
  const dataPolygon = dataPoints.map((point) => `${point.x},${point.y}`).join(' ')

  return (
    <div className={['progress-radar', className].filter(Boolean).join(' ')}>
      <svg
        className="progress-radar-svg"
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Progress radar chart"
      >
        {gridPolygons.map((points, index) => (
          <polygon
            key={`grid-${index}`}
            className="progress-radar-grid"
            points={points}
          />
        ))}

        {axes.map((_, index) => {
          const end = polarToCartesian(cx, cy, maxRadius, index, axes.length)
          return (
            <line
              key={`axis-${index}`}
              className="progress-radar-axis"
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
            />
          )
        })}

        <polygon className="progress-radar-area" points={dataPolygon} />
        <polygon className="progress-radar-outline" points={dataPolygon} />

        {dataPoints.map((point, index) => (
          <circle
            key={`dot-${index}`}
            className="progress-radar-dot"
            cx={point.x}
            cy={point.y}
            r={3.5}
          />
        ))}

        {axes.map((axis, index) => {
          const labelPoint = polarToCartesian(
            cx,
            cy,
            maxRadius + 28,
            index,
            axes.length,
          )
          return (
            <text
              key={`label-${axis.key}`}
              className="progress-radar-label"
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              <tspan x={labelPoint.x} dy="-0.35em">
                {axis.label}
              </tspan>
              <tspan
                className="progress-radar-value"
                x={labelPoint.x}
                dy="1.25em"
              >
                {axis.valueLabel}
              </tspan>
            </text>
          )
        })}
      </svg>
    </div>
  )
}
