import { createBrowserRouter } from 'react-router-dom'
import { Layout } from '@/shared/components'
import { HomePage } from '@/pages/HomePage'
import { CharacterPage } from '@/pages/CharacterPage'
import { ChatPage } from '@/pages/ChatPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { PresetPage } from '@/pages/PresetPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'character', element: <CharacterPage /> },
      { path: 'chat/:id', element: <ChatPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'preset', element: <PresetPage /> },
    ],
  },
])
