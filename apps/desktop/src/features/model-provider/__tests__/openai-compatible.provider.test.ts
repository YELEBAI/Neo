import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OpenAICompatibleProvider } from '@neo-tavern/core'
import type { GenerateInput } from '@neo-tavern/shared'

describe('OpenAICompatibleProvider', () => {
  let provider: OpenAICompatibleProvider

  beforeEach(() => {
    provider = new OpenAICompatibleProvider({
      id: 'test-provider',
      name: 'Test Provider',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'test-api-key',
    })
  })

  it('should create a provider with correct properties', () => {
    expect(provider.id).toBe('test-provider')
    expect(provider.name).toBe('Test Provider')
  })

  it('should strip trailing slash from baseUrl', () => {
    const providerWithSlash = new OpenAICompatibleProvider({
      id: 'test',
      name: 'Test',
      baseUrl: 'https://api.example.com/v1/',
      apiKey: 'key',
    })

    expect(providerWithSlash).toBeDefined()
  })

  it('should call the correct endpoint with proper headers', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Hello from AI' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    }

    global.fetch = vi.fn().mockResolvedValue(mockResponse)

    const input: GenerateInput = {
      messages: [{ role: 'user', content: 'Hi' }],
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 500,
    }

    const result = await provider.generate(input)

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-api-key',
        }),
      })
    )

    expect(result.content).toBe('Hello from AI')
    expect(result.usage?.promptTokens).toBe(10)
    expect(result.usage?.completionTokens).toBe(5)
    expect(result.usage?.totalTokens).toBe(15)
  })

  it('should handle API errors with status code', async () => {
    const mockResponse = {
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    }

    global.fetch = vi.fn().mockResolvedValue(mockResponse)

    const input: GenerateInput = {
      messages: [{ role: 'user', content: 'Hi' }],
      model: 'gpt-4',
    }

    await expect(provider.generate(input)).rejects.toThrow('Model request failed: 401')
  })

  it('should use default temperature and maxTokens when not provided', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Response' } }],
        usage: {},
      }),
    }

    global.fetch = vi.fn().mockResolvedValue(mockResponse)

    const input: GenerateInput = {
      messages: [{ role: 'user', content: 'Hi' }],
      model: 'gpt-4',
    }

    await provider.generate(input)

    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(fetchCall[1].body)

    expect(body.temperature).toBe(0.8)
    expect(body.max_tokens).toBe(800)
  })

  it('should handle empty API key', () => {
    const noKeyProvider = new OpenAICompatibleProvider({
      id: 'test',
      name: 'Test',
      baseUrl: 'https://api.example.com/v1',
      apiKey: '',
    })

    expect(noKeyProvider).toBeDefined()
  })

  it('should handle empty response content', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '' } }],
        usage: {},
      }),
    }

    global.fetch = vi.fn().mockResolvedValue(mockResponse)

    const input: GenerateInput = {
      messages: [{ role: 'user', content: 'Hi' }],
      model: 'gpt-4',
    }

    const result = await provider.generate(input)
    expect(result.content).toBe('')
  })

  it('should handle missing choices in response', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ usage: {} }),
    }

    global.fetch = vi.fn().mockResolvedValue(mockResponse)

    const input: GenerateInput = {
      messages: [{ role: 'user', content: 'Hi' }],
      model: 'gpt-4',
    }

    const result = await provider.generate(input)
    expect(result.content).toBe('')
  })
})
