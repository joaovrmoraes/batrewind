import { LogOut } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'
import { Button } from './ui/button'
import { ThemeToggle } from './theme-toggle'
import { clearAuth, getUser } from '@/lib/auth'

export function Header() {
  const router = useRouter()
  const user = getUser()

  function handleLogout() {
    clearAuth()
    router.navigate({ to: '/login' })
  }

  return (
    <header className="h-16 shrink-0 border-b border-border bg-card flex items-center justify-between px-6">
      <div />

      <div className="flex items-center gap-3">
        <ThemeToggle />

        {user && (
          <div className="text-right">
            <p className="text-xs font-medium text-foreground">
              {user.name || user.email}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {user.role}
            </p>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  )
}
