import { memo } from "react"
import type { Message } from "./types"
import { UserMessage } from "./UserMessage"
import { AssistantMessage } from "./AssistantMessage"
import { SystemMessage } from "./SystemMessage"

export interface ThreadTurnProps {
  message: Message
  onEdit?: (message: Message) => void
}

/**
 * Message router — dispatches to the appropriate sub-component by role.
 *
 * - user     → {@link UserMessage}  (right-aligned bubble, edit action)
 * - assistant → {@link AssistantMessage} (left-aligned document, copy actions)
 * - system   → {@link SystemMessage} (centered pill)
 * - tool     → {@link AssistantMessage} (reuses assistant layout)
 */
export const ThreadTurn = memo(function ThreadTurn({ message, onEdit }: ThreadTurnProps) {
  switch (message.role) {
    case "system":
      return <SystemMessage message={message} />
    case "user":
      return <UserMessage message={message} onEdit={onEdit} />
    default:
      // assistant + tool both use the document-style layout
      return <AssistantMessage message={message} />
  }
})
