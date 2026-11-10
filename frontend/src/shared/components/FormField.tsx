import type { PropsWithChildren, ReactNode } from 'react'

interface FormFieldProps extends PropsWithChildren {
  id: string
  label: string
  error?: string
  hint?: ReactNode
}

export function FormField({ id, label, error, hint, children }: FormFieldProps) {
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold tracking-wide text-slate-700">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-[11px] leading-4 text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-rose-700" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
