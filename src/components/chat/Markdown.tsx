import { memo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import type { Components } from "react-markdown"
import { CodeBlock } from "./CodeBlock"

/**
 * Sanitize schema: extends the default to allow className on code/span/pre
 * so rehype-highlight's syntax-highlighting classes survive sanitization.
 */
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), "className"],
    span: [...(defaultSchema.attributes?.span ?? []), "className"],
    pre: [...(defaultSchema.attributes?.pre ?? []), "className"],
    div: [...(defaultSchema.attributes?.div ?? []), "className"],
  },
}

const components: Components = {
  pre: ({ children }) => <>{children}</>,
  code(props) {
    const { className, children } = props as { className?: string; children?: React.ReactNode }
    const isBlock = /language-/.test(className || "") || (typeof children === "string" && children.includes("\n"))
    if (isBlock) {
      return <CodeBlock className={className}>{children}</CodeBlock>
    }
    return <code className={className}>{children}</code>
  },
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  ),
}

interface MarkdownProps {
  children: string
}

export const Markdown = memo(function Markdown({ children }: MarkdownProps) {
  return (
    <div className="thread-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [rehypeHighlight, { detect: true, ignoreMissing: true }],
          [rehypeSanitize, sanitizeSchema],
        ]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
})
