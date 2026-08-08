import { Separator } from "../ui/separator"
import { Check, Languages } from "lucide-react"
import { cn } from "../../lib/utils"
import { useI18n } from "../../hooks/useI18n"
import { useTheme, type ThemeMode, type AccentColor } from "../../hooks/useTheme"
import { LANGUAGES } from "../../i18n"

const ACCENT_OPTIONS: { id: AccentColor; color: string; labelKey: string }[] = [
  { id: "blue",   color: "oklch(0.58 0.20 255)", labelKey: "accentBlue" },
  { id: "green",  color: "oklch(0.58 0.16 155)", labelKey: "accentGreen" },
  { id: "violet", color: "oklch(0.55 0.18 300)", labelKey: "accentViolet" },
  { id: "rose",   color: "oklch(0.58 0.20 12)",  labelKey: "accentRose" },
  { id: "orange", color: "oklch(0.62 0.16 55)",  labelKey: "accentOrange" },
  { id: "cyan",   color: "oklch(0.60 0.13 215)", labelKey: "accentCyan" },
]

const THEME_MODES: { id: ThemeMode; icon: string }[] = [
  { id: "system", icon: "💻" },
  { id: "light",  icon: "☀" },
  { id: "dark",   icon: "🌙" },
]

export function AppearanceTab() {
  const { t, lang, setLang } = useI18n()
  const { mode: themeMode, setTheme, accent, setAccent } = useTheme()

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-medium">{t("settings", "appearance") as string}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("settings", "appearanceDesc") as string}</p>
      </div>

      {/* ── Theme mode ── */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">{t("settings", "theme") as string}</label>
        <div className="grid grid-cols-3 gap-2">
          {THEME_MODES.map(th => (
            <button
              key={th.id}
              onClick={() => setTheme(th.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all",
                themeMode === th.id
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:bg-accent/50",
              )}
            >
              <span className="text-lg">{th.icon}</span>
              <span className={cn(
                "text-[11px] font-medium",
                themeMode === th.id ? "text-foreground" : "text-muted-foreground",
              )}>
                {t("settings", th.id) as string}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Accent color picker ── */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">{t("settings", "accentColor") as string}</label>
        <div className="flex flex-wrap gap-2.5">
          {ACCENT_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setAccent(opt.id)}
              className={cn(
                "group relative flex size-9 items-center justify-center rounded-full transition-all",
                accent === opt.id ? "ring-2 ring-offset-2 ring-offset-background" : "hover:scale-110",
              )}
              style={{
                backgroundColor: opt.color,
                ...(accent === opt.id ? { ["--tw-ring-color" as string]: opt.color } : {}),
              }}
              title={t("settings", opt.labelKey as "accentBlue") as string}
            >
              {accent === opt.id && (
                <Check className="size-4 text-white drop-shadow" />
              )}
            </button>
          ))}
        </div>
        <p className="text-[10.5px] text-muted-foreground/70">{t("settings", "accentHint") as string}</p>
      </div>

      <Separator />

      {/* ── Language ── */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">
          <Languages className="mr-1 inline size-3" />
          {t("settings", "language") as string}
        </label>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {LANGUAGES.map(l => (
            <button
              key={l.id}
              onClick={() => setLang(l.id as typeof lang)}
              className={cn(
                "flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                lang === l.id
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground hover:bg-accent/50",
              )}
            >
              <span className="font-medium">{l.label}</span>
              {lang === l.id && <Check className="size-3.5 text-primary" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
