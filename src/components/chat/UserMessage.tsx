import { memo } from "react"
import { Pencil, User2 } from "lucide-react"
import type { Message } from "./types"
import { formatTime } from "./utils"

interface UserMessageProps {
  message: Message
  onEdit?: (message: Message) => void
}

export const UserMessage = memo(function UserMessage({ message, onEdit }: UserMessageProps) {
  const streaming = message.status === "streaming" || message.status === "pending"

  return (
    <article className="ring-fade-up group/message px-4 py-3.5" data-role="user">
      <div className="mx-auto flex max-w-[800px] gap-3.5">
        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex items-baseline justify-end gap-2">
            <span className="text-[11px] text-muted-foreground/70">{formatTime(message.timestamp)}</span>
            <span className="text-[13px] font-semibold tracking-tight">You</span>
          </div>
          {/* Bubble */}
          {message.error ? (
            <div className="mt-1 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[0.82rem] text-destructive">
              <span>{message.error}</span>
            </div>
          ) : (
            <div className="mt-1 flex justify-end">
              <div className="inline-block rounded-2xl rounded-tr-md bg-muted px-4 py-2.5 text-[0.9rem] leading-6">
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          )}
          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-end gap-1.5">
              {message.attachments.map(a => (
                <span
                  key={a.id}
                  className="rounded-md border border-border/70 bg-muted/50 px-2 py-1 font-mono text-[11px] text-muted-foreground"
                >
                  {a.name}
                </span>
              ))}
            </div>
          )}
          {/* Edit action (hover-reveal) */}
          {onEdit && !streaming && (
            <div className="mt-1.5 flex items-center justify-end gap-0.5 opacity-0 transition-opacity duration-200 group-hover/message:opacity-100">
              <button
                type="button"
                onClick={() => onEdit(message)}
                className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground/60 transition-colors hover:bg-[var(--ring-overlay)] hover:text-foreground"
                title="Edit"
              >
                <Pencil className="size-3" />
              </button>
            </div>
          )}
        </div>
        {/* Avatar (right side for user) */}
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <User2 className="size-4" />
        </div>
      </div>
    </article>
  )
})
