import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

type CreamButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  /** Compact square control for icons. */
  iconOnly?: boolean
}

export const CreamButton = forwardRef<HTMLButtonElement, CreamButtonProps>(
  function CreamButton(
    { children, className, iconOnly = false, type = 'button', ...rest },
    ref,
  ) {
    const classes = [
      'cream-button',
      iconOnly ? 'cream-button-icon' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <button ref={ref} type={type} className={classes} {...rest}>
        {children}
      </button>
    )
  },
)
