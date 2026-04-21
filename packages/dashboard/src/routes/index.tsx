import { isAuthenticated } from '@/lib/auth'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: isAuthenticated() ? '/app' : '/login' })
  },
  component: () => null,
})
