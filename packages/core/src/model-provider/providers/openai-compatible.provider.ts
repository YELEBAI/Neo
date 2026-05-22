import type { ModelProvider, GenerateInput, GenerateResult, GenerateChunk } from '@neo-tavern/shared'

export interface OpenAICompatibleProviderOptions {
  id: string
  name: string
  baseUrl: string
  apiKey: string
}

export class OpenAICompatibleProvider implements ModelProvider {
  id: string
  name: string
  private baseUrl: string
  private apiKey: string

  constructor(options: OpenAICompatibleProviderOptions) {
    this.id = options.id
    this.name = options.name
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.apiKey = options.apiKey
  }

  async generate(input: GenerateInput): Promise<GenerateResult> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        temperature: input.temperature ?? 0.8,
        max_tokens: input.maxTokens ?? 800,
      }),
      signal: input.signal,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(`Model request failed: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content ?? ''

    return {
      content,
      raw: data,
      usage: {
        promptTokens: data?.usage?.prompt_tokens,
        completionTokens: data?.usage?.completion_tokens,
        totalTokens: data?.usage?.total_tokens,
      },
    }
  }

  async *streamGenerate(input: GenerateInput): AsyncIterable<GenerateChunk> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        temperature: input.temperature ?? 0.8,
        max_tokens: input.maxTokens ?? 800,
        stream: true,
      }),
      signal: input.signal,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(`Model stream request failed: ${response.status} ${errorText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          
          const dataStr = trimmed.slice(6)
          if (dataStr === '[DONE]') return

          try {
            const parsed = JSON.parse(dataStr)
            const delta = parsed?.choices?.[0]?.delta?.content ?? ''
            if (delta) {
              yield { contentDelta: delta, raw: parsed }
            }
          } catch {
            continue
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}
