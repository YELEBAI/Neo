import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Edit, ArrowLeft } from 'lucide-react'
import { Button, Input, Textarea, ScrollArea, Label, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@neo-tavern/ui'
import { useCharacterStore } from '@/features/character/character.store'
import type { CreateCharacterInput, Character } from '@neo-tavern/shared'

const emptyForm: CreateCharacterInput = {
  name: '',
  description: '',
  personality: '',
  scenario: '',
  firstMessage: '',
  exampleDialogues: '',
}

export function CharacterPage() {
  const navigate = useNavigate()
  const { characters, loading, error, loadCharacters, createCharacter, updateCharacter, deleteCharacter, clearError } = useCharacterStore()
  const [form, setForm] = useState<CreateCharacterInput>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Character | null>(null)

  useEffect(() => {
    loadCharacters()
  }, [loadCharacters])

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    try {
      if (editingId) {
        await updateCharacter(editingId, form)
        setEditingId(null)
      } else {
        await createCharacter(form)
      }
      setForm(emptyForm)
    } catch {
      // error is handled in store
    }
  }

  const handleEdit = (char: Character) => {
    setEditingId(char.id)
    setForm({
      name: char.name,
      description: char.description,
      personality: char.personality,
      scenario: char.scenario,
      firstMessage: char.firstMessage,
      exampleDialogues: char.exampleDialogues ?? '',
    })
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteCharacter(deleteTarget.id)
      setDeleteTarget(null)
      if (editingId === deleteTarget.id) {
        setEditingId(null)
        setForm(emptyForm)
      }
    } catch {
      // error handled in store
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  const updateField = (field: keyof CreateCharacterInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="flex h-full">
      <div className="w-64 border-r p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Characters</h2>
          <Button size="icon" variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-1">
            {loading && <p className="text-sm text-muted-foreground p-2">Loading...</p>}
            {!loading && characters.length === 0 && (
              <p className="text-sm text-muted-foreground p-2">No characters yet.</p>
            )}
            {characters.map((char) => (
              <div key={char.id} className={`p-2 rounded-lg flex items-center justify-between group hover:bg-accent transition-colors ${editingId === char.id ? 'bg-accent' : ''}`}>
                <button className="text-left flex-1 truncate" onClick={() => handleEdit(char)}>
                  <p className="text-sm font-medium truncate">{char.name}</p>
                </button>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(char)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(char)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
      <div className="flex-1 p-6 overflow-auto">
        <h1 className="text-2xl font-bold mb-6">{editingId ? 'Edit Character' : 'New Character'}</h1>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={clearError}>Dismiss</Button>
          </div>
        )}

        <div className="grid gap-4 max-w-2xl">
          <div>
            <Label htmlFor="char-name">Name *</Label>
            <Input id="char-name" value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Character name" />
          </div>
          <div>
            <Label htmlFor="char-desc">Description</Label>
            <Textarea id="char-desc" value={form.description} onChange={(e) => updateField('description', e.target.value)} placeholder="Describe the character..." rows={3} />
          </div>
          <div>
            <Label htmlFor="char-personality">Personality</Label>
            <Textarea id="char-personality" value={form.personality} onChange={(e) => updateField('personality', e.target.value)} placeholder="Personality traits..." rows={3} />
          </div>
          <div>
            <Label htmlFor="char-scenario">Scenario</Label>
            <Textarea id="char-scenario" value={form.scenario} onChange={(e) => updateField('scenario', e.target.value)} placeholder="Current scenario / situation..." rows={3} />
          </div>
          <div>
            <Label htmlFor="char-firstmsg">First Message</Label>
            <Textarea id="char-firstmsg" value={form.firstMessage} onChange={(e) => updateField('firstMessage', e.target.value)} placeholder="The character's first message..." rows={3} />
          </div>
          <div>
            <Label htmlFor="char-examples">Example Dialogues</Label>
            <Textarea id="char-examples" value={form.exampleDialogues ?? ''} onChange={(e) => updateField('exampleDialogues', e.target.value)} placeholder="Example conversations..." rows={4} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={!form.name.trim() || loading}>
              {editingId ? 'Update' : 'Create'} Character
            </Button>
            {editingId && (
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Character</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This will also delete all associated chats and messages. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
