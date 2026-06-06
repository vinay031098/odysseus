/** Cloud provider presets and logo SVGs (ported from static/js/providers.js). */

export interface CloudProviderPreset {
  url: string
  label: string
  logoKey: string
}

export const CLOUD_PROVIDER_PRESETS: CloudProviderPreset[] = [
  { url: 'https://api.anthropic.com', label: 'Anthropic', logoKey: 'anthropic' },
  { url: 'https://api.deepseek.com/v1', label: 'DeepSeek', logoKey: 'deepseek' },
  { url: 'https://api.openai.com/v1', label: 'OpenAI', logoKey: 'openai' },
  { url: 'https://openrouter.ai/api/v1', label: 'OpenRouter', logoKey: 'openrouter' },
  { url: 'https://ollama.com/api', label: 'Ollama Cloud', logoKey: 'ollama' },
  { url: 'https://api.groq.com/openai/v1', label: 'Groq', logoKey: 'groq' },
  { url: 'https://api.mistral.ai/v1', label: 'Mistral', logoKey: 'mistral' },
  { url: 'https://api.together.xyz/v1', label: 'Together AI', logoKey: 'together' },
  { url: 'https://api.fireworks.ai/inference/v1', label: 'Fireworks AI', logoKey: 'fireworks' },
  {
    url: 'https://generativelanguage.googleapis.com/v1beta/openai',
    label: 'Google Gemini',
    logoKey: 'gemini',
  },
  { url: 'https://api.x.ai/v1', label: 'xAI Grok', logoKey: 'grok' },
  { url: 'https://api.z.ai/api/paas/v4', label: 'Z.AI (Zhipu)', logoKey: 'zhipu' },
  { url: 'https://api.z.ai/api/coding/paas/v4', label: 'Z.AI Coding Plan', logoKey: 'zhipu' },
]

const _PROVIDERS: [RegExp, string][] = [
  [
    /ollama|:11434/i,
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5c-3.1 0-5.65 2.43-5.86 5.48A6.62 6.62 0 0 0 3 13.62C3 18 6.8 21.5 12 21.5s9-3.5 9-7.88a6.62 6.62 0 0 0-3.14-5.64C17.65 4.93 15.1 2.5 12 2.5Zm-2.7 8.25a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Zm5.4 0a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Zm-5.15 5.15c.75.7 1.55 1.04 2.45 1.04s1.7-.34 2.45-1.04c.26-.24.66-.23.9.03.24.26.23.66-.03.9-.98.91-2.08 1.37-3.32 1.37s-2.34-.46-3.32-1.37a.64.64 0 0 1-.03-.9.64.64 0 0 1 .9-.03Z"/></svg>',
  ],
  [
    /openai|gpt-|^o[13]-|chatgpt|dall-e/i,
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 10.696.453a6.023 6.023 0 0 0-5.75 4.172 6.061 6.061 0 0 0-3.946 2.945 6.024 6.024 0 0 0 .742 7.099 5.98 5.98 0 0 0 .516 4.911 6.046 6.046 0 0 0 6.51 2.9A5.996 5.996 0 0 0 13.26 23.547a6.023 6.023 0 0 0 5.75-4.172 6.061 6.061 0 0 0 3.946-2.945 6.024 6.024 0 0 0-.674-6.609z"/></svg>',
  ],
  [
    /openrouter|open router/i,
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="12" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M7.5 12h4.5c2 0 2.5-6 4.5-6"/><path d="M12 12c2 0 2.5 6 4.5 6"/></svg>',
  ],
  [
    /anthropic|claude/i,
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z"/></svg>',
  ],
  [
    /google|gemini|gemma/i,
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81"/></svg>',
  ],
  [
    /mi[sx]tral|ministral/i,
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.143 3.429v3.428h-3.429v3.429h-3.428V6.857H6.857V3.43H3.43v13.714H0v3.428h10.286v-3.428H6.857v-3.429h3.429v3.429h3.429v-3.429h3.428v3.429h-3.428v3.428H24v-3.428h-3.43V3.429z"/></svg>',
  ],
  [
    /deepseek/i,
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 011.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 01.415-.287.302.302 0 01.2.288.306.306 0 01-.31.307.303.303 0 01-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 01-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 01.016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 01-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z"/></svg>',
  ],
  [
    /x-ai|xai|grok/i,
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"/></svg>',
  ],
  [
    /groq/i,
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v16H4z" opacity="0.3"/><path d="M8 8h8v8H8z"/></svg>',
  ],
  [
    /together|fireworks/i,
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6z"/></svg>',
  ],
  [
    /zhipu|glm|chatglm/i,
    '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="19.44,5.68 10.51,18.32 4.56,18.32 13.49,5.68"/></svg>',
  ],
]

export function providerLogo(key: string | null | undefined): string | null {
  if (!key) return null
  for (const [re, svg] of _PROVIDERS) {
    if (re.test(key)) return svg
  }
  return null
}

/** Match an endpoint base URL to a cloud preset (exact URL or hostname). */
export function findProviderPreset(baseUrl: string): CloudProviderPreset | undefined {
  const normalized = baseUrl.trim().replace(/\/+$/, '')
  const exact = CLOUD_PROVIDER_PRESETS.find(
    (p) => p.url.replace(/\/+$/, '') === normalized,
  )
  if (exact) return exact
  try {
    const host = new URL(normalized).hostname.replace(/^www\./, '')
    return CLOUD_PROVIDER_PRESETS.find((p) => {
      try {
        return new URL(p.url).hostname.replace(/^www\./, '') === host
      } catch {
        return false
      }
    })
  } catch {
    return undefined
  }
}
