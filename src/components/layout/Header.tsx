import { Button } from "../ui/button"
import { ChevronDown, PanelLeft, Settings, SquarePen } from "lucide-react"
import { cn } from "../../lib/utils"
import { useI18n } from "../../hooks/useI18n"

interface HeaderProps {
  model?: string
  onSettings?: () => void
  onToggleSidebar?: () => void
  sidebarOpen?: boolean
  onNew?: () => void
}

export function Header({ model, onSettings, onToggleSidebar, sidebarOpen, onNew }: HeaderProps) {
  const { t } = useI18n()
  return (
    <header className="flex h-[var(--ring-toolbar-h)] shrink-0 items-center justify-between border-b border-border/70 bg-background/80 px-2.5 backdrop-blur">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={cn("size-8", sidebarOpen && "bg-[var(--ring-overlay)]")}
          onClick={onToggleSidebar}
          title={t("header", "toggleSidebar") as string}
        >
          <PanelLeft className="size-4" />
        </Button>
        {model ? (
          <Button variant="ghost" size="sm" className="gap-1 px-2 text-[13px] font-medium">
            {model}
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        ) : (
          <span className="px-2 text-[13px] font-medium text-muted-foreground">{t("app", "title")}</span>
        )}
      </div>
      <div className="flex items-center gap-0.5">
        {onNew && (
          <Button variant="ghost" size="icon" className="size-8" onClick={onNew} title={t("header", "newSession") as string}>
            <SquarePen className="size-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="size-8" onClick={onSettings} title={t("header", "settings") as string}>
          <Settings className="size-4" />
        </Button>
      </div>
    </header>
  )
}
