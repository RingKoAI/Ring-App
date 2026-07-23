export type Role = "user" | "assistant" | "system" | "tool"

export type TurnStatus = "pending" | "streaming" | "complete" | "aborted" | "error"

export interface ReasoningBlock {
  kind: "reasoning"
  text: string
  /** whether the provider surfaced this reasoning summary vs. raw tokens */
  summary?: boolean
}

export interface TextBlock {
  kind: "text"
  text: string
}

export interface ToolCallBlock {
  kind: "tool_call"
  callId: string
  tool: string
  args: string
  /** tool result summary, populated when the call resolves */
  result?: string
  state?: "running" | "done" | "error"
  /** elapsed milliseconds, populated on completion */
  durationMs?: number
}

export type ContentBlock = ReasoningBlock | TextBlock | ToolCallBlock

export interface Attachment {
  id: string
  name: string
  size: number
  mime?: string
}

export interface Message {
  id: string
  role: Role
  content: string
  timestamp: number
  /** structured alternative to `content`; rendered when present */
  blocks?: ContentBlock[]
  /** display name of the model that produced an assistant turn */
  model?: string
  /** lifecycle of a turn, used for streaming affordances */
  status?: TurnStatus
  attachments?: Attachment[]
  /** error message, when status === "error" */
  error?: string
  /** parent turn id, for threading / replies */
  parentId?: string
}

export type Mode = "build" | "edit" | "plan" | "ask" | "agent"

/**
 * How RingApp talks to the agent engine.
 * - sdk:  in-process `ring sdk` subprocess (cli ↔ app)
 * - http: `ring --serve` REST server       (cli ↔ app, over HTTP)
 * - rca:  RingRCA WebSocket gateway        (app ↔ rca ↔ cli)
 */
export type Transport = "sdk" | "http" | "rca"

export interface Session {
  id: string
  title: string
  updatedAt: number
  /** preview snippet for the session list */
  preview?: string
}

export interface ModelOption {
  id: string
  /** human-friendly label, e.g. "Claude Sonnet 4.6" */
  label: string
  /** provider name, e.g. "Anthropic" */
  provider?: string
  /** badge text, e.g. "reasoning" */
  badge?: string
}
