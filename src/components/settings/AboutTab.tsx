import { Separator } from "../ui/separator"
import {
  Code2, ExternalLink, Bug, Terminal, Server, Copy, Check,
} from "lucide-react"
import { useState } from "react"
import { openUrl } from "@tauri-apps/plugin-opener"
import { useI18n } from "../../hooks/useI18n"
import { RingIcon } from "../RingIcon"

const GITHUB_REPO    = "https://github.com/Ringaire/Ring-App"
const GITHUB_ISSUES  = "https://github.com/Ringaire/Ring-App/issues"
const RING_CLI_REPO  = "https://github.com/Ringaire/Ring-CLI"
const RING_RCA_REPO  = "https://github.com/Ringaire/Ring-RCA"

async function openExternal(url: string) {
  try { await openUrl(url) } catch { window.open(url, "_blank") }
}

const APP_VERSION = "0.1.0"

export function AboutTab() {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  async function copyVersion() {
    try {
      await navigator.clipboard.writeText(`RingApp v${APP_VERSION}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-medium">{t("settings", "about") as string}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("settings", "aboutDesc") as string}</p>
      </div>

      {/* ── Brand + version ── */}
      <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-muted/20 p-4">
        <RingIcon className="size-12 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold">RingApp</div>
          <button
            onClick={copyVersion}
            className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="font-mono">v{APP_VERSION}</span>
            {copied
              ? <Check className="size-3 text-emerald-400" />
              : <Copy className="size-3" />
            }
          </button>
        </div>
      </div>

      {/* ── Version info table ── */}
      <div className="space-y-2 text-xs text-muted-foreground">
        <InfoRow label={t("settings", "version") as string} value={`v${APP_VERSION}`} />
        <Separator />
        <InfoRow label={t("settings", "runtime") as string} value="Tauri + React" />
        <Separator />
        <InfoRow label={t("settings", "license") as string} value="AGPL-3.0" />
      </div>

      <Separator />

      {/* ── Source code links ── */}
      <div className="space-y-2">
        <h4 className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/60">
          {t("about", "sourceCode") as string}
        </h4>
        <div className="space-y-1">
          <LinkButton
            icon={<Code2 className="size-4 shrink-0 text-muted-foreground" />}
            label={t("about", "github") as string}
            sublabel="Ringaire/Ring-App"
            onClick={() => openExternal(GITHUB_REPO)}
          />
          <LinkButton
            icon={<Bug className="size-4 shrink-0 text-muted-foreground" />}
            label={t("about", "issues") as string}
            onClick={() => openExternal(GITHUB_ISSUES)}
          />
        </div>
      </div>

      {/* ── Related projects ── */}
      <div className="space-y-2">
        <h4 className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/60">
          {t("about", "relatedProjects") as string}
        </h4>
        <div className="space-y-1">
          <LinkButton
            icon={<Terminal className="size-4 shrink-0 text-muted-foreground" />}
            label="RingCLI"
            sublabel={t("about", "ringCli") as string}
            onClick={() => openExternal(RING_CLI_REPO)}
          />
          <LinkButton
            icon={<Server className="size-4 shrink-0 text-muted-foreground" />}
            label="RingRCA"
            sublabel={t("about", "ringRca") as string}
            onClick={() => openExternal(RING_RCA_REPO)}
          />
        </div>
      </div>

      <Separator />

      {/* ── Copyright ── */}
      <p className="text-center text-[10.5px] text-muted-foreground/50">
        © {new Date().getFullYear()} Ringaire. AGPL-3.0.
      </p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  )
}

function LinkButton({
  icon,
  label,
  sublabel,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  sublabel?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-2.5 rounded-lg border border-border/60 px-3 py-2 text-left transition-colors hover:bg-accent/50"
    >
      {icon}
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium">{label}</div>
        {sublabel && <div className="truncate text-[10px] text-muted-foreground">{sublabel}</div>}
      </div>
      <ExternalLink className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  )
}
