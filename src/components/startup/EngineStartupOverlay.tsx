import { useState, useEffect } from "react"
import { useI18n } from "../../hooks/useI18n"
import { RingIcon } from "../RingIcon"

type OverlayPhase = "connecting" | "ready" | "error"

interface EngineStartupOverlayProps {
  phase: OverlayPhase
  errorMessage?: string
}

const SLOW_HINT_MS = 8_000

export function EngineStartupOverlay({ phase, errorMessage }: EngineStartupOverlayProps) {
  const { t } = useI18n()
  const [showSlowHint, setShowSlowHint] = useState(false)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (phase === "ready") {
      const timer = setTimeout(() => setVisible(false), 200)
      return () => clearTimeout(timer)
    }
    setVisible(true)
  }, [phase])

  useEffect(() => {
    if (phase !== "connecting") return
    const timer = setTimeout(() => setShowSlowHint(true), SLOW_HINT_MS)
    return () => clearTimeout(timer)
  }, [phase])

  if (!visible) return null

  const isError = phase === "error"

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
      {/* Brand gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(360deg, rgba(47,143,245,0) 5.5%, rgba(47,143,245,0.04) 100%)" }}
      />

      {/* Logo + glow */}
      <div className="relative mb-8">
        <div className="absolute inset-0 -m-6 rounded-full bg-primary/20 blur-xl animate-pulse" />
        <div className="relative flex size-18 items-center justify-center">
          <RingIcon className="size-18 text-primary" />
        </div>
      </div>

      {/* Status text */}
      <div className="relative flex flex-col items-center gap-2">
        <span className="text-lg font-semibold tracking-tight text-foreground">
          {isError ? t("startup", "errorTitle") as string : t("startup", "title") as string}
        </span>
        <span className="text-[13px] text-muted-foreground">
          {isError
            ? (errorMessage ?? t("startup", "errorDesc") as string)
            : phase === "connecting"
              ? t("startup", "connecting") as string
              : t("startup", "ready") as string}
        </span>
      </div>

      {/* Progress bar (connecting) / spinner (error) */}
      <div className="relative mt-6 h-1.5 w-44 overflow-hidden rounded-full bg-primary/12">
        {isError ? (
          <div className="h-full w-full rounded-full bg-destructive/60" />
        ) : (
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-primary/60 to-transparent bg-[length:200%_100%]"
            style={{ animation: "splash-shimmer 1.4s ease-in-out infinite" }}
          />
        )}
      </div>

      {/* Slow hint */}
      {showSlowHint && !isError && phase === "connecting" && (
        <p className="relative mt-4 text-[11px] text-muted-foreground/70 animate-fade-in">
          {t("startup", "slowHint") as string}
        </p>
      )}
    </div>
  )
}
