import { NavLink, Outlet } from 'react-router-dom'
import { MessageSquare, User, Settings, Home, LayoutTemplate } from 'lucide-react'
import { cn } from '@neo-tavern/ui'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/character', icon: User, label: 'Characters' },
  { to: '/preset', icon: LayoutTemplate, label: 'Presets' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Layout() {
  return (
    <div className="flex h-screen bg-background">
      <aside className="w-16 flex flex-col items-center border-r bg-card py-4 gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center w-12 h-12 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
                isActive && 'bg-accent text-foreground'
              )
            }
            title={item.label}
          >
            <item.icon className="h-5 w-5" />
          </NavLink>
        ))}
        <div className="flex-1" />
        <div className="text-xs text-muted-foreground font-medium -rotate-90 whitespace-nowrap mb-4">
          NEO
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
