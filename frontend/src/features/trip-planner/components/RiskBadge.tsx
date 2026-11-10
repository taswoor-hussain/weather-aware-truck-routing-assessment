import type { RiskLevel } from '../types'

interface RiskBadgeProps {
  level: RiskLevel
}

const riskStyles: Record<RiskLevel, string> = {
  low: 'bg-emerald-100 text-emerald-800',
  moderate: 'bg-amber-100 text-amber-900',
  high: 'bg-orange-100 text-orange-900',
  severe: 'bg-rose-100 text-rose-900',
  no_travel: 'bg-slate-950 text-white',
}

const riskLabels: Record<RiskLevel, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  severe: 'Severe',
  no_travel: 'No Travel',
}

export function RiskBadge({ level }: RiskBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${riskStyles[level]}`}
    >
      {riskLabels[level]}
    </span>
  )
}
