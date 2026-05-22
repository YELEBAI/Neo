import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Send, ChevronDown, ChevronUp, ArrowLeft, Copy, Pencil, Check, X, ScrollText, RotateCcw, CheckCheck, ChevronRight, StopCircle } from 'lucide-react'
import { Button, Input, Card, CardContent, Textarea, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@neo-tavern/ui'
import { useCharacterStore } from '@/features/character/character.store'
import { useChatStore } from '@/features/chat/chat.store'
import { useSendMessage } from '@/features/chat/hooks/useSendMessage'
import { presetRepository } from '@/db/repositories'
import { buildChatPrompt, formatPreview, applyRegexRules, trimMessagesByTokens } from '@neo-tavern/core'
import { useSettingsStore } from '@/features/settings/settings.store'
import type { BuiltPrompt, Message } from '@neo-tavern/shared'

function Avatar({ name, isUser }: { name: string; isUser?: boolean }) {
  const initial = name.charAt(0).toUpperCase()
  const bg = isUser ? 'bg-blue-500' : 'bg-emerald-500'
  return (
    <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center shrink-0`}>
      <span className="text-white text-xs font-bold">{initial}</span>
    </div>
  )
}

function SideBlockCard({ name, content }: { name: string; content: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="w-full">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-0.5"
      >
        <ChevronRight className={`h-3 w-3 transition-transform ${open ? 'rotate-90' : ''}`} />
        {name}
      </button>
      {open && (
        <Card className="mt-1 bg-muted/40">
          <CardContent className="p-2">
            <p className="text-xs whitespace-pre-wrap text-muted-foreground">{content}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function toast(type: 'success' | 'error' | 'info', message: string) {
  const fn = (window as any).__toast
  if (fn) fn(type, message)
}

export function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const initRef = useRef<string | null>(null)
  const presetItemsRef = useRef<{ role: 'system' | 'user'; content: string; injectionOrder: number }[]>([])

  const { characters, loadCharacters } = useCharacterStore()
  const { currentChat, messages, loading, error: chatError, loadChat, createOrGetChat, clearError, updateMessage } = useChatStore()
  const regexPresets = useSettingsStore((s) => s.regexPresets)
  const activeRegexPresetId = useSettingsStore((s) => s.activeRegexPresetId)
  const activeRegexRules = (() => {
    if (!activeRegexPresetId) return [] as typeof regexPresets[0]['rules']
    const preset = regexPresets.find((p) => p.id === activeRegexPresetId)
    return preset ? preset.rules.filter((r) => r.enabled) : []
  })()

  const [input, setInput] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewText, setPreviewText] = useState('')
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [promptDialogOpen, setPromptDialogOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const characterId = searchParams.get('characterId')
  const character = characters.find((c) => c.id === (currentChat?.characterId ?? characterId))

  const { sendMessage, regenerate, abort, sending, error: sendError, clearError: clearSendError } = useSendMessage({
    character,
    chatId: currentChat?.id,
    onPromptBuilt: (built: BuiltPrompt) => {
      setPreviewText(formatPreview(built))
    },
  })

  useEffect(() => {
    loadCharacters()
  }, [loadCharacters])

  useEffect(() => {
    presetRepository.getActivePresetId().then(async (activeId) => {
      if (activeId) {
        const preset = await presetRepository.getById(activeId)
        if (preset) {
          presetItemsRef.current = preset.items
            .filter((i) => i.enabled)
            .map((i) => ({ role: i.role, content: i.content, injectionOrder: i.injectionOrder }))
        }
      } else {
        presetItemsRef.current = []
      }
    })
  }, [])

  useEffect(() => {
    if (id && id !== 'new') {
      loadChat(id)
      return
    }
    if (!characterId || id !== 'new') return
    if (characters.length === 0) return
    if (initRef.current === characterId) return
    initRef.current = characterId

    const charName = characters.find((c) => c.id === characterId)?.name ?? 'Chat'
    createOrGetChat({ characterId, title: charName }).catch(() => {})
  }, [id, characterId, characters.length])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [messages])

  const updatePreview = (userInput: string) => {
    if (!character) return
    const cs = useSettingsStore.getState().contextTokens || 8000
    const built = buildChatPrompt({
      character,
      recentMessages: trimMessagesByTokens(messages, cs) as Message[],
      userInput: userInput || '(your message)',
      presetItems: presetItemsRef.current,
    })
    setPreviewText(formatPreview(built))
  }

  const handleSend = async () => {
    if (!input.trim() || sending) return
    const content = input.trim()
    setInput('')
    await sendMessage(content)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    updatePreview(e.target.value)
  }

  const handleCopy = async (content: string, msgId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedId(msgId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast('error', 'Failed to copy')
    }
  }

  const startEdit = (msg: Message) => {
    setEditingMsgId(msg.id)
    setEditContent(msg.content)
  }

  const cancelEdit = () => {
    setEditingMsgId(null)
    setEditContent('')
  }

  const saveEdit = async () => {
    if (!editingMsgId || !editContent.trim()) return
    try {
      await updateMessage(editingMsgId, editContent.trim())
      setEditingMsgId(null)
      setEditContent('')
      toast('success', 'Message updated')
    } catch {
      toast('error', 'Failed to update')
    }
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      saveEdit()
    }
    if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  const showPromptDialog = () => {
    if (previewText) {
      setPromptDialogOpen(true)
    } else {
      updatePreview(input)
      setPromptDialogOpen(true)
    }
  }

  const displayError = sendError || chatError

  const isLastAi = (msg: Message) => {
    if (msg.role !== 'assistant') return false
    const lastIdx = messages.length - 1
    for (let i = lastIdx; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i].id === msg.id
    }
    return false
  }

  return (
    <div className="flex h-full">
      <div className="w-56 border-r p-4 flex flex-col gap-3">
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        {character && (
          <>
            <h2 className="text-lg font-semibold truncate">{character.name}</h2>
            <p className="text-xs text-muted-foreground">{character.description}</p>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium">Personality:</p>
              <p>{character.personality}</p>
            </div>
          </>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4">
          {loading && <p className="text-sm text-muted-foreground text-center">Loading...</p>}
          {!loading && messages.length === 0 && !sending && (
            <p className="text-sm text-muted-foreground text-center mt-8">
              {character ? character.firstMessage || `Start a conversation with ${character.name}` : 'Select a character to start chatting'}
            </p>
          )}
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => {
              const isUser = msg.role === 'user'
              const aiName = character?.name ?? 'AI'
              const split = !isUser && activeRegexRules.length > 0 ? applyRegexRules(msg.content, activeRegexRules) : null
              const displayContent = split?.promptContent || msg.content

              return (
                <div key={msg.id}>
                  {!isUser && (
                    <div className="flex items-center justify-between mb-1.5 px-1 group">
                      <div className="flex items-center gap-2">
                        <Avatar name={aiName} />
                        <span className="text-xs font-medium text-muted-foreground">{aiName}</span>
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          title="Copy"
                          onClick={() => handleCopy(msg.content, msg.id)}
                        >
                          {copiedId === msg.id ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          title="Edit"
                          onClick={() => startEdit(msg)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          title="View full prompt"
                          onClick={showPromptDialog}
                        >
                          <ScrollText className="h-3.5 w-3.5" />
                        </Button>
                        {isLastAi(msg) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            title="Regenerate"
                            onClick={() => { if (!sending) regenerate() }}
                            disabled={sending}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    {isUser && <Avatar name="You" isUser />}

                    <div className={`max-w-[75%] min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
                      {isUser && (
                        <div className="flex items-center justify-end gap-1 mb-1.5 px-1 opacity-0 hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            title="Copy"
                            onClick={() => handleCopy(msg.content, msg.id)}
                          >
                            {copiedId === msg.id ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      )}

                      {editingMsgId === msg.id ? (
                        <div className="w-full">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            className="min-h-[80px] text-sm font-mono"
                            autoFocus
                          />
                          <div className="flex gap-1 mt-1 justify-end">
                            <Button variant="ghost" size="sm" onClick={cancelEdit}>
                              <X className="h-3.5 w-3.5 mr-1" />Cancel
                            </Button>
                            <Button size="sm" onClick={saveEdit} disabled={!editContent.trim()}>
                              <Check className="h-3.5 w-3.5 mr-1" />Save (Ctrl+Enter)
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Card className={`${isUser ? 'bg-primary text-primary-foreground' : ''}`}>
                          <CardContent className="p-3">
                            <p className="text-sm whitespace-pre-wrap">{displayContent}</p>
                          </CardContent>
                        </Card>
                      )}

                      {!isUser && split && split.sideBlocks.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {split.sideBlocks.map((block, si) => (
                            <SideBlockCard key={si} name={block.name} content={block.content} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {sending && (
              <div>
                <div className="flex items-center gap-2 mb-1.5 px-1">
                  <Avatar name={character?.name ?? 'AI'} />
                  <span className="text-xs font-medium text-muted-foreground">{character?.name ?? 'AI'}</span>
                  <span className="text-xs text-muted-foreground animate-pulse ml-1">thinking...</span>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 shrink-0" />
                  <Card className="max-w-[75%]">
                    <CardContent className="p-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {displayError && (
          <div className="px-4 py-2 mx-4 mb-2 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center justify-between">
            <span className="truncate">{displayError}</span>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => { clearSendError(); clearError() }}>Dismiss</Button>
            </div>
          </div>
        )}

        <div className="border-t p-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={character ? `Message ${character.name}...` : 'Type a message...'}
              disabled={sending || !currentChat}
            />
            <Button onClick={handleSend} disabled={!input.trim() || sending || !currentChat} size="icon">
              <Send className="h-4 w-4" />
            </Button>
            {sending && (
              <Button variant="destructive" size="icon" onClick={abort} title="Stop generating">
                <StopCircle className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPreviewOpen(!previewOpen)
                if (!previewOpen && input.trim()) updatePreview(input.trim())
              }}
              className="shrink-0"
            >
              {previewOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              Preview
            </Button>
          </div>
        </div>

        {previewOpen && (
          <div className="border-t p-4 bg-muted/30">
            <div className="max-w-3xl mx-auto">
              <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground max-h-64 overflow-auto">{previewText || 'Type a message to see prompt preview'}</pre>
            </div>
          </div>
        )}
      </div>

      <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Full Prompt</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">{previewText || '(no prompt data)'}</pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromptDialogOpen(false)}>Close</Button>
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(previewText); toast('success', 'Copied') }}>
              <Copy className="h-3.5 w-3.5 mr-1" />Copy Prompt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
