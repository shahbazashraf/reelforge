// lib/ai-provider.ts
// Provider priority: Groq → OpenRouter → OpenAI

export interface AIProvider {
  name: string
  apiBase: string
  apiKey: string
  model: string
}

export function getAIProvider(): AIProvider | null {
  const groqKey = process.env.GROQ_API_KEY || ''
  const openRouterKey = process.env.OPENROUTER_API_KEY || ''
  const openAIKey = process.env.OPENAI_API_KEY || ''

  if (groqKey && groqKey !== 'gsk_your-groq-key-here') {
    return {
      name: 'groq',
      apiBase: 'https://api.groq.com/openai/v1',
      apiKey: groqKey,
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
    }
  }
  if (openRouterKey && openRouterKey !== 'sk-or-your-openrouter-key-here') {
    return {
      name: 'openrouter',
      apiBase: 'https://openrouter.ai/api/v1',
      apiKey: openRouterKey,
      model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free',
    }
  }
  if (openAIKey && openAIKey.length > 20 && openAIKey !== 'sk-proj-...') {
    return {
      name: 'openai',
      apiBase: 'https://api.openai.com/v1',
      apiKey: openAIKey,
      model: 'gpt-4o-mini',
    }
  }
  return null
}

export async function callAI(
  provider: AIProvider,
  messages: { role: string; content: string }[],
  opts: { temperature?: number; jsonMode?: boolean } = {}
): Promise<string> {
  const res = await fetch(`${provider.apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'ReelForge',
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature: opts.temperature ?? 0.8,
      response_format: opts.jsonMode && provider.model.startsWith('gpt-') ? { type: 'json_object' } : undefined,
    }),
  })

  const data = await res.json()
  if (!data.choices?.length) {
    throw new Error(data.error?.message || `${provider.name} returned no choices (HTTP ${res.status})`)
  }

  let content: string = data.choices[0].message.content
  // Strip markdown fences that some models wrap JSON in
  content = content.replace(/^```json[\r\n]*/i, '').replace(/^```[\r\n]*/m, '').replace(/[\r\n]*```$/m, '').trim()
  return content
}
