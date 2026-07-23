import { memo } from "react"

interface CatIconProps {
  className?: string
  /** line = stroked outline (default), solid = filled silhouette */
  variant?: "line" | "solid"
  /** show subtle eyes + nose, off for ultra-small sizes */
  face?: boolean
}

const LINE_PATH =
  "M8 3 L4 12 C2.5 14.5 2 18 3 21 C5 26.5 10 29 16 29 C22 29 27 26.5 29 21 C30 18 29.5 14.5 28 12 L24 3 L20.5 11 L16 8.5 L11.5 11 Z"

const SOLID_PATH =
  "M8 2 L3.5 12 C1.8 15 1.5 21 5 25 C8 28 12 29 16 29 C20 29 24 28 27 25 C30.5 21 30.2 15 28.5 12 L24 2 L20.5 10.5 L16 8 L11.5 10.5 Z"

/**
 * Ring — minimal cat-head mark.
 * `line`: single-weight stroked outline (Lucide-style).
 * `solid`: filled silhouette.
 * Uses currentColor; reads clearly from 16px.
 */
export const CatIcon = memo(function CatIcon({ className, variant = "line", face = true }: CatIconProps) {
  if (variant === "solid") {
    return (
      <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
        <path d={SOLID_PATH} fill="currentColor" />
        {face && (
          <g fill="var(--ring-icon-bg, oklch(0.16 0.002 260))">
            <ellipse cx="12" cy="17.5" rx="1.4" ry="2" />
            <ellipse cx="20" cy="17.5" rx="1.4" ry="2" />
            <path d="M15 20.2 L17 20.2 L16 21.4 Z" />
          </g>
        )}
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={LINE_PATH} />
      {face && (
        <g fill="currentColor" stroke="none">
          <circle cx="12" cy="18" r={1.1} />
          <circle cx="20" cy="18" r={1.1} />
          <path d="M15.3 20.8 L16.7 20.8 L16 21.7 Z" />
        </g>
      )}
    </svg>
  )
})
