import type { ButtonHTMLAttributes, ReactNode } from 'react'

type CreamButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  /** Compact square control for icons. */
  iconOnly?: boolean
}

export function CreamButton({
  children,
  className,
  iconOnly = false,
  type = 'button',
  ...rest
}: CreamButtonProps) {
  const classes = ['cream-button', iconOnly ? 'cream-button-icon' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  )
}
