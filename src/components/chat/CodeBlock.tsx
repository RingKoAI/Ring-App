import { memo, useState } from "react"
import { Check, Copy } from "lucide-react"
import { cn } from "../../lib/utils"
import { useI18n } from "../../hooks/useI18n"

interface CodeBlockProps {
  className?: string
  children?: React.ReactNode
}

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node
  if (typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(extractText).join("")
  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as { props: { children?: React.ReactNode } }).props.children)
  }
  return ""
}

export const CodeBlock = memo(function CodeBlock({ className, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const { t } = useI18n()
  const lang = /language-(\w+)/.exec(className || "")?.[1] ?? "text"
  const code = extractText(children)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="group/code relative my-3 overflow-hidden rounded-lg border bg-[var(--ring-code-bg)]">
      <div className="flex items-center justify-between border-b border-border/60 bg-white/[0.02] px-3.5 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{lang}</span>
        <button
          type="button"
          onClick={copy}
          className={cn(
            "flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors",
            "hover:bg-white/10 hover:text-foreground",
          )}
          aria-label="Copy code"
        >
          {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
          {copied ? t("composer", "copied") : t("composer", "copy")}
        </button>
      </div>
      <pre className="overflow-x-auto p-0">
        <code className={cn("hljs block !bg-transparent p-3.5 font-mono text-[0.82rem] leading-6", className)}>
          {children}
        </code>
      </pre>
    </div>
  )
})
