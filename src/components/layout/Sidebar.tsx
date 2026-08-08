import { useState, useRef, useCallback } from "react"
import { Button } from "../ui/button"
import { MessageSquarePlus, PanelLeft, PanelLeftClose, Search, Wifi, WifiOff, MoreHorizontal, Trash2 } from "lucide-react"
import { cn } from "../../lib/utils"
import { useI18n } from "../../hooks/useI18n"
import { RingIcon } from "../RingIcon"
import type { Session } from "../chat/types"

interface SidebarProps {
  sessions: Session[]
  activeSession?: string
  onSelect: (id: string) => void
  onNew: () => void
  onDelete?: (id: string) => void
  rcaConnected?: boolean
  open: boolean
  onToggle: () => void
}

export function Sidebar({ sessions, activeSession, onSelect, onNew, onDelete, rcaConnected, open, onToggle }: SidebarProps) {
  const { t } = useI18n()
  const [query, setQuery] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)

  const filtered = query
    ? sessions.filter(s => s.title.toLowerCase().includes(query.toLowerCase()) || s.preview?.toLowerCase().includes(query.toLowerCase()))
    : sessions

  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setScrolled(el.scrollTop > 2)
  }, [])

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm sm:hidden" onClick={onToggle} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-[transform,opacity] duration-200 sm:static sm:z-auto",
          open ? "translate-x-0" : "-translate-x-full opacity-0 sm:translate-x-0 sm:opacity-100",
        )}
      >
        {/* ── Header: brand + actions ── */}
        <div className="flex h-[var(--ring-toolbar-h)] shrink-0 items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <RingIcon className="size-6 text-primary" />
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

        {/* ── Search ── */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-[var(--ring-overlay)] px-2.5 py-1.5 text-muted-foreground">
            <Search className="size-3.5" />
            <input
              name="session-search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t("sidebar", "search") as string}
              className="w-full bg-transparent text-[12px] outline-none placeholder:text-muted-foreground/60"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-muted-foreground/60 hover:text-foreground"
              >
                <span className="text-[14px] leading-none">×</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Scroll seam (appears on scroll) ── */}
        <div
          className={cn(
            "h-px shrink-0 bg-sidebar-border/0 transition-all duration-200",
            scrolled && "bg-sidebar-border",
          )}
        />

        {/* ── Session list ── */}
        <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-0.5 px-2 pb-2 pt-1">
            <div className="px-2 py-1.5 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/60">
              {t("sidebar", "recent")}
            </div>
            {filtered.length === 0 ? (
              <div className="px-2 py-6 text-center text-[11.5px] text-muted-foreground/60">
                {query ? t("sidebar", "noResults") : t("sidebar", "noSessions")}
              </div>
            ) : (
              filtered.map(s => (
                <SessionRow
                  key={s.id}
                  session={s}
                  active={s.id === activeSession}
                  onSelect={() => {
                    onSelect(s.id)
                    onToggle()
                  }}
                  onDelete={onDelete}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Footer: connection status ── */}
        <div className="flex items-center gap-2 border-t border-sidebar-border px-3 py-2.5">
          <span className={cn("size-1.5 rounded-full transition-colors", rcaConnected ? "bg-emerald-400" : "bg-muted-foreground/50")} />
          {rcaConnected ? (
            <Wifi className="size-3 text-muted-foreground" />
          ) : (
            <WifiOff className="size-3 text-muted-foreground" />
          )}
          <span className="text-[11px] text-muted-foreground">
            {rcaConnected ? t("sidebar", "connected") : t("sidebar", "disconnected")}
          </span>
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

// ── Session row ──────────────────────────────────────────────────────────────

function SessionRow({
  session,
  active,
  onSelect,
  onDelete,
}: {
  session: Session
  active: boolean
  onSelect: () => void
  onDelete?: (id: string) => void
}) {
  const { t } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={onSelect}
        className={cn(
          "group flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors",
          active ? "bg-[var(--ring-overlay)]" : "hover:bg-[var(--ring-overlay)]",
        )}
      >
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[13px]",
              active ? "font-medium text-foreground" : "text-foreground/90",
            )}
          >
            {session.title}
          </span>
          {/* Time — hidden on hover, kebab takes its slot (anti-jitter) */}
          <span className="relative flex min-w-[20px] justify-end shrink-0">
            <span
              className={cn(
                "font-mono text-[10px] text-muted-foreground/60 transition-opacity",
                "group-hover:opacity-0 group-focus-within:opacity-0",
              )}
            >
              {formatRelativeTime(session.updatedAt)}
            </span>
          </span>
        </div>
        {session.preview && (
          <span className="truncate text-[11px] text-muted-foreground/70">{session.preview}</span>
        )}
      </button>

      {/* Kebab button — overlays the time slot on hover */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen(v => !v)
          }}
          className={cn(
            "absolute right-1.5 top-1/2 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-md border border-border/60 bg-popover/95 opacity-0 shadow-sm backdrop-blur transition-all hover:bg-[var(--ring-overlay)] group-hover:opacity-100 focus:opacity-100",
            menuOpen && "opacity-100",
          )}
          title="More"
        >
          <MoreHorizontal className="size-3.5 text-muted-foreground" />
        </button>
      )}

      {/* Delete action (simple inline menu) */}
      {menuOpen && onDelete && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
          <div className="absolute bottom-full right-1.5 z-30 mb-1 w-36 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-xl">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(session.id)
                setMenuOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" />
              {t("sidebar", "deleteSession") as string}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Time formatting ──────────────────────────────────────────────────────────

function formatRelativeTime(ts: number): string {
  const now = Date.now()
  const diff = now - ts
  const min = Math.floor(diff / 60_000)
  const hr = Math.floor(diff / 3_600_000)
  const day = Math.floor(diff / 86_400_000)

  if (min < 1) return "now"
  if (min < 60) return `${min}m`
  if (hr < 24) return `${hr}h`
  if (day < 7) return `${day}d`
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" })
}
