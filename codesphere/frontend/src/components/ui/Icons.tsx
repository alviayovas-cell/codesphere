import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function base(paths: React.ReactNode) {
  return function Icon(props: IconProps) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" {...props}>
        {paths}
      </svg>
    )
  }
}

export const DashboardIcon = base(<path d="M3 13h8V3H3v10zm10 8h8V11h-8v10zM3 21h8v-6H3v6zm10-18v6h8V3h-8z" />)
export const BookIcon = base(<path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z" />)
export const CodeIcon = base(<path d="M8 9l-4 4 4 4M16 9l4 4-4 4M13.5 5l-3 14" />)
export const ClockIcon = base(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </>,
)
export const TrophyIcon = base(
  <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0V4zM7 5H4a3 3 0 003 3M17 5h3a3 3 0 01-3 3" />,
)
export const ChartIcon = base(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />)
export const UsersIcon = base(
  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />,
)
export const MonitorIcon = base(
  <path d="M3 4h18v12H3V4zM8 20h8M12 16v4" />,
)
export const SettingsIcon = base(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 005 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </>,
)
export const LogoutIcon = base(<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />)
export const ChevronDownIcon = base(<path d="M6 9l6 6 6-6" />)
export const ChevronLeftIcon = base(<path d="M15 18l-6-6 6-6" />)
export const MenuIcon = base(<path d="M3 12h18M3 6h18M3 18h18" />)
export const SearchIcon = base(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </>,
)
export const BellIcon = base(
  <path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 003.4 0" />,
)
export const UserIcon = base(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
  </>,
)
export const CheckCircleIcon = base(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l2.5 2.5L16 9" />
  </>,
)
export const PlayIcon = base(<path d="M6 4.5v15l13-7.5-13-7.5z" />)
export const AlertIcon = base(
  <>
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.29 3.86L1.82 18a1.5 1.5 0 001.3 2.25h17.76a1.5 1.5 0 001.3-2.25L13.71 3.86a1.5 1.5 0 00-2.42 0z" />
  </>,
)
export const FlameIcon = base(
  <path d="M12 2s5 4 5 9a5 5 0 01-10 0c0-1 .3-2 .7-2.8C8 10 8 12 9.5 12.5 9 10 10 6 12 2z" />,
)
export const ExpandIcon = base(<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />)
export const LaptopIcon = base(
  <path d="M4 5h16v10H4V5zM2 19h20M9 19l1-4M15 19l-1-4" />,
)
