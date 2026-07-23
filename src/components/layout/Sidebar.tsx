import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"
import { MessageSquarePlus, PanelLeft, PanelLeftClose, Search, Wifi, WifiOff } from "lucide-react"
import { cn } from "../../lib/utils"
import { useI18n } from "../../hooks/useI18n"
import { CatIcon } from "../CatIcon"
import type { Session } from "../chat/types"

interface SidebarProps {
  sessions: Session[]
  activeSession?: string
  onSelect: (id: string) => void
  onNew: () => void
  rcaConnected?: boolean
  open: boolean
  onToggle: () => void
}

export function Sidebar({ sessions, activeSession, onSelect, onNew, rcaConnected, open, onToggle }: SidebarProps) {
  const { t } = useI18n()
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm sm:hidden" onClick={onToggle} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-[transform,opacity] duration-200 sm:static sm:z-auto",
          open ? "translate-x-0" : "-translate-x-full opacity-0 sm:translate-x-0 sm:opacity-100",
        )}
      >
        <div className="flex h-[var(--ring-toolbar-h)] items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-md bg-foreground text-background">
              <CatIcon className="size-4" face={false} />
            </div>
            <span className="text-[13px] font-semibold tracking-tight">{t("app", "title")}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="size-7 sm:hidden" onClick={onToggle}>
              <PanelLeftClose className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-7" onClick={onNew} title={t("sidebar", "newSession") as string}>
              <MessageSquarePlus className="size-4" />
            </Button>
          </div>
        </div>

        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-[var(--ring-overlay)] px-2.5 py-1.5 text-muted-foreground">
            <Search className="size-3.5" />
            <input
              name="session-search"
              placeholder={t("sidebar", "search") as string}
              className="w-full bg-transparent text-[12px] outline-none placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1 px-2">
          <div className="space-y-0.5 pb-2">
            <div className="px-2 py-1.5 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/60">
              {t("sidebar", "recent")}
            </div>
            {sessions.length === 0 ? (
              <div className="px-2 py-6 text-center text-[11.5px] text-muted-foreground/60">{t("sidebar", "noSessions")}</div>
            ) : (
              sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    onSelect(s.id)
                    onToggle()
                  }}
                  className={cn(
                    "group flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                    s.id === activeSession ? "bg-[var(--ring-overlay)]" : "hover:bg-[var(--ring-overlay)]",
                  )}
                >
                  <span className={cn("truncate text-[13px]", s.id === activeSession ? "font-medium text-foreground" : "text-foreground/90")}>
                    {s.title}
                  </span>
                  {s.preview && <span className="truncate text-[11px] text-muted-foreground/70">{s.preview}</span>}
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center gap-2 border-t border-sidebar-border px-3 py-2.5">
          <span className={cn("flex size-1.5 rounded-full", rcaConnected ? "bg-emerald-400" : "bg-muted-foreground/50")} />
          {rcaConnected ? <Wifi className="size-3 text-muted-foreground" /> : <WifiOff className="size-3 text-muted-foreground" />}
          <span className="text-[11px] text-muted-foreground">{rcaConnected ? t("sidebar", "connected") : t("sidebar", "disconnected")}</span>
        </div>
      </aside>

      {!open && (
        <Button variant="ghost" size="icon" className="fixed left-2 top-2 z-20 size-8 sm:hidden" onClick={onToggle}>
          <PanelLeft className="size-4" />
        </Button>
      )}
    </>
  )
}
