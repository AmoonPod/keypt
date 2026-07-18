interface BrandMarkProps {
  size?: number
  className?: string
}

export function BrandMark({ size = 24, className }: BrandMarkProps): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
    >
      <rect x="5" y="4" width="17" height="20" rx="4" stroke="currentColor" strokeWidth="2.5" />
      <rect
        x="10"
        y="8"
        width="17"
        height="20"
        rx="4"
        fill="var(--mark-fill, var(--bg))"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <rect
        className="brand-keypt-tile"
        x="25"
        y="25"
        width="4"
        height="4"
        rx="1.2"
        fill="currentColor"
      />
    </svg>
  )
}
