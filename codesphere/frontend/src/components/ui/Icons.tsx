import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function base(paths: React.ReactNode) {
  return function Icon(props: IconProps) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
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
export const ChevronRightIcon = base(<path d="M9 18l6-6-6-6" />)
export const ArrowRightIcon = base(<path d="M5 12h14M13 6l6 6-6 6" />)
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
export const UserCheckIcon = base(
  <>
    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M16 11l2 2 4-4" />
  </>,
)
export const UserXIcon = base(
  <>
    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M17 8l5 5M22 8l-5 5" />
  </>,
)
export const UserPlusIcon = base(
  <>
    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M19 8v6M22 11h-6" />
  </>,
)
export const CheckCircleIcon = base(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l2.5 2.5L16 9" />
  </>,
)
export const CheckIcon = base(<path d="M5 12.5l4.5 4.5L19 7.5" />)
export const XIcon = base(<path d="M6 6l12 12M18 6L6 18" />)
export const PlusIcon = base(<path d="M12 5v14M5 12h14" />)
export const PlayIcon = base(<path d="M6 4.5v15l13-7.5-13-7.5z" />)
export const AlertIcon = base(
  <>
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.29 3.86L1.82 18a1.5 1.5 0 001.3 2.25h17.76a1.5 1.5 0 001.3-2.25L13.71 3.86a1.5 1.5 0 00-2.42 0z" />
  </>,
)
export const InfoIcon = base(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-4M12 8h.01" />
  </>,
)
export const FlameIcon = base(
  <path d="M12 2s5 4 5 9a5 5 0 01-10 0c0-1 .3-2 .7-2.8C8 10 8 12 9.5 12.5 9 10 10 6 12 2z" />,
)
export const ExpandIcon = base(<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />)
export const CollapseIcon = base(<path d="M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5" />)
export const LaptopIcon = base(
  <path d="M4 5h16v10H4V5zM2 19h20M9 19l1-4M15 19l-1-4" />,
)
export const SunIcon = base(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </>,
)
export const MoonIcon = base(<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />)
export const EyeIcon = base(
  <>
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
    <circle cx="12" cy="12" r="3" />
  </>,
)
export const EyeOffIcon = base(
  <path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a20.29 20.29 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a20.35 20.35 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24M1 1l22 22" />,
)
export const KeyIcon = base(
  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.78 7.78 5.5 5.5 0 017.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />,
)
export const TrashIcon = base(
  <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a1 1 0 01-1 1H7a1 1 0 01-1-1V6h12zM10 11v6M14 11v6" />,
)
export const UploadIcon = base(<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />)
export const FileTextIcon = base(
  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8" />,
)
export const RefreshIcon = base(<path d="M21 12a9 9 0 11-2.64-6.36M21 3v6h-6" />)
export const CalendarIcon = base(
  <>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </>,
)
export const ListIcon = base(<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />)
export const TargetIcon = base(
  <>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </>,
)
export const LockIcon = base(
  <>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </>,
)
export const UnlockIcon = base(
  <>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 019.9-1" />
  </>,
)
export const MedalIcon = base(
  <>
    <circle cx="12" cy="15" r="5" />
    <path d="M8.5 10.5L6 2h4l2 5 2-5h4l-2.5 8.5" />
  </>,
)
export const StarIcon = base(<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />)
export const ShieldIcon = base(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />)
export const ZapIcon = base(<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />)
export const SparklesIcon = base(
  <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM5 19l.7 2 2 .7-2 .7L5 24l-.7-1.6-2-.7 2-.7L5 19zM19 2l.6 1.4 1.4.6-1.4.6L19 6l-.6-1.4L17 4l1.4-.6L19 2z" />,
)
export const MailIcon = base(
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </>,
)
export const HashIcon = base(<path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" />)
export const GraduationIcon = base(
  <path d="M22 10L12 5 2 10l10 5 10-5zM6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5M22 10v6" />,
)
export const ExternalLinkIcon = base(<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />)
export const TerminalIcon = base(<path d="M4 17l6-5-6-5M12 19h8" />)
export const CopyIcon = base(
  <>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </>,
)
export const TimerIcon = base(
  <>
    <path d="M10 2h4M12 14l3-3" />
    <circle cx="12" cy="14" r="8" />
  </>,
)
