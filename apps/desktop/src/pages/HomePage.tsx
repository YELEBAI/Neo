import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Settings, MessageSquare, Trash2 } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, ScrollArea, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@neo-tavern/ui'
import { useCharacterStore } from '@/features/character/character.store'
import { useChatStore } from '@/features/chat/chat.store'
import type { Chat } from '@neo-tavern/shared'

export function HomePage() {
  const navigate = useNavigate()
  const { characters, loading: charsLoading, loadCharacters } = useCharacterStore()
  const { chats, loading: chatsLoading, loadChats, deleteChat } = useChatStore()
  const [deleteTarget, setDeleteTarget] = useState<Chat | null>(null)

  useEffect(() => {
    loadCharacters()
    loadChats()
  }, [loadCharacters, loadChats])

  const handleCharacterClick = (characterId: string) => {
    const existingChat = chats.find((c) => c.characterId === characterId)
    if (existingChat) {
      navigate(`/chat/${existingChat.id}`)
    } else {
      navigate(`/chat/new?characterId=${characterId}`)
    }
  }

  const handleOpenChat = (chatId: string) => {
    navigate(`/chat/${chatId}`)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    await deleteChat(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <div className="flex h-full">
      <div className="w-64 border-r p-4 flex flex-col gap-4 overflow-hidden">
        <div className="flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold">Characters</h2>
          <Button size="icon" variant="ghost" onClick={() => navigate('/character')}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-1">
            {charsLoading && <p className="text-sm text-muted-foreground p-2">Loading...</p>}
            {!charsLoading && characters.length === 0 && (
              <p className="text-sm text-muted-foreground p-2">No characters yet.</p>
            )}
            {characters.map((char) => (
              <button
                key={char.id}
                onClick={() => handleCharacterClick(char.id)}
                className="text-left p-2 rounded-lg hover:bg-accent transition-colors"
              >
                <p className="text-sm font-medium truncate">{char.name}</p>
                <p className="text-xs text-muted-foreground truncate">{char.description}</p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-3 shrink-0">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">NeoTavern Demo</h1>
            <Button variant="outline" onClick={() => navigate('/settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
          <h2 className="text-lg font-semibold mb-3">Recent Chats</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {chatsLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!chatsLoading && chats.length === 0 && (
            <p className="text-sm text-muted-foreground">No chats yet. Select a character to start.</p>
          )}
          <div className="grid gap-3">
            {chats.map((chat) => (
              <Card
                key={chat.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors group"
                onClick={() => handleOpenChat(chat.id)}
              >
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      {chat.title}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(chat) }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              Delete "{deleteTarget?.title}"? This will also remove all messages in this conversation. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
