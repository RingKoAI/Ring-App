export interface ProviderInfo {
  id: string
  name: string
  type: "anthropic" | "openai" | "openai-compatible" | "gemini"
  baseUrl: string
  apiKeyEnv: string | null
  defaultModel: string
}

// 与 RingCLI crates/ring-providers/src/providers.json 保持同步
export const PROVIDER_CATALOG: Record<string, ProviderInfo> = {
  anthropic:    { id: "anthropic",    name: "Anthropic",       type: "anthropic",         baseUrl: "https://api.anthropic.com",                         apiKeyEnv: "ANTHROPIC_API_KEY", defaultModel: "claude-sonnet-4-6" },
  openai:       { id: "openai",       name: "OpenAI",          type: "openai",            baseUrl: "https://api.openai.com/v1",                        apiKeyEnv: "OPENAI_API_KEY",    defaultModel: "gpt-4o" },
  gemini:       { id: "gemini",       name: "Google Gemini",   type: "gemini",            baseUrl: "https://generativelanguage.googleapis.com",         apiKeyEnv: "GEMINI_API_KEY",    defaultModel: "gemini-2.0-flash" },
  deepseek:     { id: "deepseek",     name: "DeepSeek",        type: "openai-compatible", baseUrl: "https://api.deepseek.com/v1",                      apiKeyEnv: "DEEPSEEK_API_KEY",  defaultModel: "deepseek-chat" },
  groq:         { id: "groq",         name: "Groq",            type: "openai-compatible", baseUrl: "https://api.groq.com/openai/v1",                   apiKeyEnv: "GROQ_API_KEY",      defaultModel: "llama-3.3-70b-versatile" },
  mistral:      { id: "mistral",      name: "Mistral",         type: "openai-compatible", baseUrl: "https://api.mistral.ai/v1",                         apiKeyEnv: "MISTRAL_API_KEY",   defaultModel: "mistral-large-latest" },
  together:     { id: "together",     name: "Together AI",     type: "openai-compatible", baseUrl: "https://api.together.xyz/v1",                       apiKeyEnv: "TOGETHER_API_KEY",  defaultModel: "meta-llama/Llama-3-70b-chat-hf" },
  openrouter:   { id: "openrouter",   name: "OpenRouter",      type: "openai-compatible", baseUrl: "https://openrouter.ai/api/v1",                      apiKeyEnv: "OPENROUTER_API_KEY",defaultModel: "anthropic/claude-sonnet-4-6" },
  xai:          { id: "xai",          name: "xAI",             type: "openai-compatible", baseUrl: "https://api.x.ai/v1",                               apiKeyEnv: "XAI_API_KEY",       defaultModel: "grok-2-latest" },
  moonshot:     { id: "moonshot",     name: "Moonshot",        type: "openai-compatible", baseUrl: "https://api.moonshot.cn/v1",                        apiKeyEnv: "MOONSHOT_API_KEY",  defaultModel: "moonshot-v1-8k" },
  siliconflow:  { id: "siliconflow",  name: "SiliconFlow",     type: "openai-compatible", baseUrl: "https://api.siliconflow.cn/v1",                      apiKeyEnv: "SILICONFLOW_API_KEY",defaultModel: "Qwen/Qwen2.5-72B-Instruct" },
  zhipu:        { id: "zhipu",        name: "Zhipu AI",        type: "openai-compatible", baseUrl: "https://open.bigmodel.cn/api/paas/v4",               apiKeyEnv: "ZHIPU_API_KEY",     defaultModel: "glm-4" },
  baidu:        { id: "baidu",        name: "Baidu ERNIE",     type: "openai-compatible", baseUrl: "https://qianfan.baidubce.com/v2",                    apiKeyEnv: "BAIDU_API_KEY",     defaultModel: "ernie-4.0-turbo-8k" },
  cerebras:     { id: "cerebras",     name: "Cerebras",        type: "openai-compatible", baseUrl: "https://api.cerebras.ai/v1",                        apiKeyEnv: "CEREBRAS_API_KEY",  defaultModel: "llama-3.3-70b" },
  deepinfra:    { id: "deepinfra",    name: "DeepInfra",       type: "openai-compatible", baseUrl: "https://api.deepinfra.com/v1/openai",                apiKeyEnv: "DEEPINFRA_API_KEY", defaultModel: "meta-llama/Meta-Llama-3.1-70B-Instruct" },
  fireworks:    { id: "fireworks",    name: "Fireworks",       type: "openai-compatible", baseUrl: "https://api.fireworks.ai/inference/v1",              apiKeyEnv: "FIREWORKS_API_KEY", defaultModel: "accounts/fireworks/models/llama-v3p1-70b-instruct" },
  perplexity:   { id: "perplexity",   name: "Perplexity",      type: "openai-compatible", baseUrl: "https://api.perplexity.ai",                          apiKeyEnv: "PERPLEXITY_API_KEY",defaultModel: "sonar" },
  cohere:       { id: "cohere",       name: "Cohere",          type: "openai-compatible", baseUrl: "https://api.cohere.com/compatibility/v1",             apiKeyEnv: "COHERE_API_KEY",    defaultModel: "command-r-plus" },
  nvidia:       { id: "nvidia",       name: "NVIDIA",          type: "openai-compatible", baseUrl: "https://integrate.api.nvidia.com/v1",                apiKeyEnv: "NVIDIA_API_KEY",    defaultModel: "meta/llama-3.1-70b-instruct" },
  ollama:       { id: "ollama",       name: "Ollama",          type: "openai-compatible", baseUrl: "http://localhost:11434/v1",                          apiKeyEnv: null,                defaultModel: "llama3.2" },
  lmstudio:     { id: "lmstudio",     name: "LM Studio",       type: "openai-compatible", baseUrl: "http://localhost:1234/v1",                           apiKeyEnv: null,                defaultModel: "local-model" },
}

export function matchProvider(input: string): ProviderInfo | undefined {
  const key = input.toLowerCase().replace(/[\s_-]/g, "")
  for (const p of Object.values(PROVIDER_CATALOG)) {
    const pk = p.id.toLowerCase()
    const pn = p.name.toLowerCase().replace(/[\s_-]/g, "")
    if (pk === key || pn === key) return p
  }
  return undefined
}

export function listProviders(): ProviderInfo[] {
  return Object.values(PROVIDER_CATALOG)
}
