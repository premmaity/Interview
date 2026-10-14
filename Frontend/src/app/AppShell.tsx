import { BookOpen, History, LayoutDashboard, LogOut, Settings, Sparkles, UserRound } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import { useAuth } from './AuthProvider'

const links = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/interviews/new', label: 'New interview', icon: Sparkles },
  { to: '/app/history', label: 'History', icon: History },
  { to: '/app/profile', label: 'Profile', icon: UserRound },
  { to: '/app/settings', label: 'Privacy', icon: Settings },
]

export function AppShell() {
  const { user, logout } = useAuth()
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <NavLink to="/app" className="brand" aria-label="Interview Mentor home">
          <span className="brand-mark">IM</span>
          <span>Interview Mentor</span>
        </NavLink>
        <nav aria-label="Primary navigation">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={19} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <BookOpen size={18} aria-hidden="true" />
          <span>Coaching signals, never hiring decisions.</span>
        </div>
        <div className="account-row">
          <div>
            <strong>{user?.username ?? 'Candidate'}</strong>
            <small>{user?.email}</small>
          </div>
          <button className="icon-button" onClick={() => void logout()} aria-label="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

