import { memo } from "react"
import type { Message } from "./types"

interface SystemMessageProps {
  message: Message
}

export const SystemMessage = memo(function SystemMessage({ message }: SystemMessageProps) {
  return (
    <div className="mx-auto my-1.5 flex max-w-[800px] items-center justify-center px-4">
      <span className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-center text-[11.5px] text-muted-foreground">
        {message.content}
      </span>
    </div>
  )
})
