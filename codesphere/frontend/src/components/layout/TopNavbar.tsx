import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Dropdown, { DropdownItem } from '../ui/Dropdown'
import { ChevronDownIcon, MenuIcon, SettingsIcon, UserIcon } from '../ui/Icons'
import ThemeToggle from '../ui/ThemeToggle'
import { adminNav, studentNav } from './navConfig'

function pageTitle(pathname: string, role?: string): string {
  const items = role === 'admin' ? adminNav : studentNav
  const match = items.find((item) => pathname.startsWith(item.to))
  if (match) return match.label
  if (pathname.includes('/problems/')) return 'Problem'
  if (pathname.includes('/rounds/')) return 'Coding Round'
  if (pathname.includes('/learning/topics/')) return 'Learning'
  if (pathname === '/change-password') return 'Change Password'
  return 'CodeSphere'
}

export default function TopNavbar({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
          aria-label="Open menu"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{pageTitle(location.pathname, user?.role)}</h1>
      </div>

      <Dropdown
        trigger={
          <span className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {user?.name?.charAt(0).toUpperCase() ?? '?'}
            </span>
            <span className="hidden sm:inline">{user?.name}</span>
            <ChevronDownIcon className="h-3.5 w-3.5 text-slate-400" />
          </span>
        }
      >
        <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
          <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{user?.name}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
        </div>
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Theme</span>
          <ThemeToggle showLabels={false} />
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800" />
        <DropdownItem onClick={() => navigate('/change-password')}>
          <SettingsIcon className="h-4 w-4" /> Change Password
        </DropdownItem>
        <DropdownItem onClick={() => navigate(user?.role === 'admin' ? '/admin/dashboard' : '/student/dashboard')}>
          <UserIcon className="h-4 w-4" /> My Profile
        </DropdownItem>
        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
        <DropdownItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
          Logout
        </DropdownItem>
      </Dropdown>
    </header>
  )
}
