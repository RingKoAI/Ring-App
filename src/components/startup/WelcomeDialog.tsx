import { useI18n } from "../../hooks/useI18n"
import { RingIcon } from "../RingIcon"
import { openUrl } from "@tauri-apps/plugin-opener"

const SERVICE_TERMS_URL = "https://github.com/Ringaire/Ring-App/blob/main/LICENSE"

const LOGO_RINGS = [
  { size: 150, opacity: 0.06 },
  { size: 255, opacity: 0.04 },
  { size: 380, opacity: 0.025 },
]

interface WelcomeDialogProps {
  onGetStarted: () => void
}

export function WelcomeDialog({ onGetStarted }: WelcomeDialogProps) {
  const { t } = useI18n()
  const year = new Date().getFullYear()

  const noticeText = t("welcome", "agreementNotice") as string
  const noticeParts = noticeText.split("{link}")
  const termsLabel = t("welcome", "termsLabel") as string

  async function openTerms() {
    try { await openUrl(SERVICE_TERMS_URL) } catch { window.open(SERVICE_TERMS_URL, "_blank") }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background">
      {/* Ambient glows */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 25% 25%, rgba(47,143,245,0.07) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(77,161,255,0.05) 0%, transparent 50%)
          `,
        }}
      />

      {/* Logo + ripple rings */}
      <div className="relative mb-10 flex items-center justify-center">
        {LOGO_RINGS.map((ring, i) => (
          <div
            key={i}
            className="pointer-events-none absolute rounded-full border border-primary/20"
            style={{
              width: ring.size,
              height: ring.size,
              opacity: ring.opacity,
              maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
            }}
          />
        ))}
        <div className="relative flex size-[72px] items-center justify-center">
          <RingIcon className="size-[72px] text-primary" />
        </div>
      </div>

      {/* Title */}
      <h1 className="relative mb-2 text-2xl font-semibold tracking-tight text-foreground">
        {t("welcome", "title") as string}
      </h1>
      <p className="relative mb-8 max-w-sm text-center text-sm text-muted-foreground">
        {t("welcome", "desc") as string}
      </p>

      {/* Action area */}
      <div className="relative flex w-full max-w-xs flex-col gap-2.5">
        <button
          onClick={onGetStarted}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90 active:scale-[0.99]"
        >
          {t("welcome", "getStarted") as string}
        </button>
      </div>

      {/* Footer */}
      <div className="relative mt-10 flex max-w-sm flex-col items-center gap-1.5 text-center">
        <p className="text-[11px] leading-relaxed text-muted-foreground/70">
          {noticeParts[0]}
          <button onClick={openTerms} className="underline hover:text-foreground">
            {termsLabel}
          </button>
          {noticeParts[1]}
        </p>
        <p className="text-[10px] text-muted-foreground/50">
          {(t("welcome", "copyright") as string).replace("{year}", String(year))}
        </p>
      </div>
    </div>
  )
}
