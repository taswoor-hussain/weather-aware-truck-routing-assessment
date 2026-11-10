import type { RiskLevel } from '../types'

export const RISK_PRESENTATION: Record<
  RiskLevel,
  { label: string; color: string }
> = {
  low: { label: 'Low', color: '#10b981' },
  moderate: { label: 'Moderate', color: '#f59e0b' },
  high: { label: 'High', color: '#f97316' },
  severe: { label: 'Severe', color: '#e11d48' },
  no_travel: { label: 'No Travel', color: '#111827' },
}
