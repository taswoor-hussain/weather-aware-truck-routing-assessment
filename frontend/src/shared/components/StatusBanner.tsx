import type { ReactNode } from 'react'

interface StatusBannerProps {
  variant: 'success' | 'error' | 'info'
  title: string
  children?: ReactNode
  role?: 'alert' | 'status'
}

const variantClasses = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  error: 'border-rose-200 bg-rose-50 text-rose-950',
  info: 'border-sky-200 bg-sky-50 text-sky-950',
} satisfies Record<StatusBannerProps['variant'], string>

const iconClasses = {
  success: 'bg-emerald-100 text-emerald-700',
  error: 'bg-rose-100 text-rose-700',
  info: 'bg-sky-100 text-sky-700',
} satisfies Record<StatusBannerProps['variant'], string>

const icons = {
  success: '✓',
  error: '!',
  info: 'i',
} satisfies Record<StatusBannerProps['variant'], string>

export function StatusBanner({
  variant,
  title,
  children,
  role = variant === 'error' ? 'alert' : 'status',
}: StatusBannerProps) {
  return (
    <section
      className={`flex gap-3 rounded-xl border p-4 ${variantClasses[variant]}`}
      role={role}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
    >
      <span
        aria-hidden="true"
        className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold ${iconClasses[variant]}`}
      >
        {icons[variant]}
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-bold">{title}</h3>
        {children && <div className="mt-1 text-sm leading-6 opacity-85">{children}</div>}
      </div>
    </section>
  )
}
