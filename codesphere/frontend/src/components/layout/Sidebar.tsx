import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/cn'
import { ChevronLeftIcon, LogoutIcon } from '../ui/Icons'
import { adminNav, studentNav } from './navConfig'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export default function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const items = user?.role === 'admin' ? adminNav : studentNav

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={onCloseMobile} aria-hidden="true" />
      )}

      {/* Fixed dark palette, independent of the app's light/dark theme
          toggle - the sidebar is always dark, by design (a permanent
          "dark left, light right" layout), unlike the rest of the app
          which still follows the user's Light/Dark/System preference. */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-800 bg-slate-900 transition-all duration-150',
          'lg:static lg:z-auto lg:translate-x-0',
          collapsed ? 'lg:w-[68px]' : 'lg:w-60',
          'w-60',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between px-4">
          <a href="/" className="flex items-center gap-2 overflow-hidden">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-600 text-sm font-bold text-white">
              C
            </span>
            <span className={cn('truncate text-sm font-semibold text-white', collapsed && 'lg:hidden')}>
              CodeSphere
            </span>
          </a>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="hidden rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 lg:block"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeftIcon className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <ul className="flex flex-col gap-0.5">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={onCloseMobile}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-500/10 text-primary-300'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
                    )
                  }
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  <span className={cn('truncate', collapsed && 'lg:hidden')}>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-slate-800 p-3">
          <div className={cn('flex items-center gap-2', collapsed && 'lg:justify-center')}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-200">
              {user?.name?.charAt(0).toUpperCase() ?? '?'}
            </span>
            <div className={cn('min-w-0 flex-1', collapsed && 'lg:hidden')}>
              <p className="truncate text-sm font-medium text-slate-100">{user?.name}</p>
              <p className="truncate text-xs capitalize text-slate-400">{user?.role}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
              className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              <LogoutIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
