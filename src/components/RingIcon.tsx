import { memo } from "react"

interface RingIconProps {
  className?: string
}

/**
 * Ring — brand mark from ring-ide/icons/stable/ring_cnl.svg.
 * Pure ring + node, transparent background.
 * Uses currentColor so it inherits the parent's text color (text-primary etc.)
 * and automatically follows the active accent color.
 *
 * To get the gradient look, apply a gradient text or wrap in a container
 * with `text-primary` — the ring stroke will be that color.
 */
export const RingIcon = memo(function RingIcon({ className }: RingIconProps) {
  return (
    <svg viewBox="0 0 256 256" fill="none" className={className} aria-hidden="true">
      <circle
        cx="128"
        cy="128"
        r="68"
        stroke="currentColor"
        strokeWidth="24"
        strokeLinecap="round"
        strokeDasharray="320 107"
        transform="rotate(-52 128 128)"
      />
      <circle cx="182" cy="74" r="20" fill="currentColor" />
    </svg>
  )
})
