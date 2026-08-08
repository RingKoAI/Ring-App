import { Separator } from "../ui/separator"
import { Input } from "../ui/input"
import { cn } from "../../lib/utils"
import { useI18n } from "../../hooks/useI18n"
import type { Transport } from "../chat/types"

export interface GeneralTabProps {
  rcaConnected: boolean
  transportMode: Transport
  setTransportMode: (t: Transport) => void
  httpUrl: string
  setHttpUrl: (v: string) => void
  url: string
  setUrl: (v: string) => void
  token: string
  setToken: (v: string) => void
  settingsPath: string
  ringHome: string
}

export function GeneralTab(props: GeneralTabProps) {
  const { t } = useI18n()
  return (
    <div className="space-y-6">
      {/* ── Connection ── */}
      <div>
        <h3 className="text-sm font-medium">{t("settings", "connection") as string}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("settings", "connectionDesc") as string}</p>
      </div>

      {/* Transport selector */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">{t("settings", "transportLabel") as string}</label>
        <div className="grid gap-2">
          {(["sdk", "http", "rca"] as Transport[]).map(tr => (
            <button
              key={tr}
              onClick={() => props.setTransportMode(tr)}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                props.transportMode === tr ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50",
              )}
            >
              <div className={cn(
                "mt-0.5 size-4 shrink-0 rounded-full border-2",
                props.transportMode === tr ? "border-primary" : "border-muted-foreground/40",
              )}>
                {props.transportMode === tr && <div className="m-auto mt-[3px] size-1.5 rounded-full bg-primary" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium">{t("transport", tr) as string}</div>
                <div className="text-[11px] text-muted-foreground">{t("transport", tr === "sdk" ? "sdkDesc" : tr === "http" ? "httpDesc" : "rcaDesc") as string}</div>
              </div>
              {tr === "rca" && (
                <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400">
                  {t("transport", "rcaWarning")}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Connection status */}
      <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
        <span className={cn("size-1.5 rounded-full", props.rcaConnected ? "bg-emerald-400" : "bg-muted-foreground/50")} />
        <span className="text-xs">{props.rcaConnected ? t("settings", "connected") as string : t("settings", "disconnected") as string}</span>
      </div>

      {/* HTTP transport config */}
      {props.transportMode === "http" && (
        <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/30 p-3">
          <label className="text-xs text-muted-foreground">{t("transport", "httpUrl") as string}</label>
          <Input value={props.httpUrl} onChange={e => props.setHttpUrl(e.target.value)} placeholder={t("transport", "httpUrlPh") as string} className="text-xs" />
        </div>
      )}

      {/* RCA transport config */}
      {props.transportMode === "rca" && (
        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">{t("settings", "serverUrl") as string}</label>
            <Input value={props.url} onChange={e => props.setUrl(e.target.value)} placeholder="ws://host:8080" className="text-xs" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">{t("settings", "authToken") as string}</label>
            <Input value={props.token} onChange={e => props.setToken(e.target.value)} type="password" placeholder="optional" className="text-xs" />
          </div>
        </div>
      )}

      <Separator />

      {/* ── Config paths ── */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">~/.ring</h3>
        <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/20 p-3 text-[11px]">
          <ConfigRow label={t("settings", "ringHome") as string} value={props.ringHome} />
          <ConfigRow label={t("settings", "configPath") as string} value={props.settingsPath} />
        </div>
      </div>
    </div>
  )
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="truncate font-mono text-foreground" title={value}>{value || "—"}</span>
    </div>
  )
}
