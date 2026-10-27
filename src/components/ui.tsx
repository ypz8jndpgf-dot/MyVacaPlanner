/* Shared presentational bits for the travel-journal look:
   inline SVG icons, per-person avatars, and warm empty states. */

type IconProps = { className?: string };

export function CalendarIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M8.5 15.5l2.2 2.2 4.3-4.4" strokeWidth="2.2" />
    </svg>
  );
}

export function PlaneIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M21.5 15.5v-2l-8.5-5V3.2a1.2 1.2 0 0 0-2.4 0v5.3l-8.5 5v2l8.5-2.6v5.2l-2.3 1.7v1.4l3.5-1 3.5 1v-1.4l-2.3-1.7v-5.2l8.5 2.6z" />
    </svg>
  );
}

export function PlaneLandIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <g transform="rotate(24 12 9)">
        <path d="M21.5 13.9v-1.7l-7.3-4.3V3.4a1 1 0 0 0-2 0v4.5L4.9 12.2v1.7l7.3-2.2v4.4l-2 1.5v1.2l3-0.9 3 0.9v-1.2l-2-1.5v-4.4l7.3 2.2z" />
      </g>
      <rect x="2.5" y="20" width="19" height="1.8" rx="0.9" />
    </svg>
  );
}

export function PlaneTakeoffIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <g transform="rotate(-24 12 9)">
        <path d="M21.5 13.9v-1.7l-7.3-4.3V3.4a1 1 0 0 0-2 0v4.5L4.9 12.2v1.7l7.3-2.2v4.4l-2 1.5v1.2l3-0.9 3 0.9v-1.2l-2-1.5v-4.4l7.3 2.2z" />
      </g>
      <rect x="2.5" y="20" width="19" height="1.8" rx="0.9" />
    </svg>
  );
}

export function CoinsIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="9" cy="9" r="6" />
      <path d="M14.5 5.1a6 6 0 1 1-4.4 9.4M9 6.5v5M7.2 7.8c.5-.5 1.1-.7 1.8-.7 1 0 1.8.6 1.8 1.4 0 2-3.6 1.2-3.6 3.1 0 .8.8 1.4 1.8 1.4.7 0 1.3-.2 1.8-.7" />
    </svg>
  );
}

export function UsersIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3.5 19.5c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5" />
      <path d="M16 5.2a3.5 3.5 0 0 1 0 5.9M17.8 15.3c1.5.7 2.4 2 2.7 4.2" />
    </svg>
  );
}

export function PinIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
    </svg>
  );
}

export function SunIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
      <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5 5l1.7 1.7M17.3 17.3 19 19M19 5l-1.7 1.7M6.7 17.3 5 19" />
    </svg>
  );
}

export function CheckIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4.5 12.5l5 5 10-11" />
    </svg>
  );
}

export function ArrowRightIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

export function PaperPlaneIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M21.5 2.5 11 13" />
      <path d="M21.5 2.5 14.8 21.5l-3.8-8.5-8.5-3.8 19-6.7z" />
    </svg>
  );
}

export function ClockIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

/* ---- Avatars ---- */

const PERSON_COLORS: { bg: string; fg: string }[] = [
  { bg: "#FF6B5E", fg: "#FFFFFF" }, // coral
  { bg: "#F2A93B", fg: "#3D2B00" }, // amber
  { bg: "#0E6B7A", fg: "#FFFFFF" }, // teal light
  { bg: "#2A9D8F", fg: "#FFFFFF" }, // lagoon
  { bg: "#E8833A", fg: "#FFFFFF" }, // tangerine
  { bg: "#E9C46A", fg: "#4A3800" }, // sunny gold
  { bg: "#0B5563", fg: "#FFFFFF" }, // deep teal
  { bg: "#D96C4F", fg: "#FFFFFF" }, // terracotta
];

export function personColor(name: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PERSON_COLORS[hash % PERSON_COLORS.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  size = "md",
  className = "",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const c = personColor(name);
  const dims =
    size === "sm"
      ? "h-8 w-8 text-xs"
      : size === "lg"
        ? "h-12 w-12 text-base"
        : "h-10 w-10 text-sm";
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-display font-bold shadow-sm ${dims} ${className}`}
      style={{ backgroundColor: c.bg, color: c.fg }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/* ---- Empty states ---- */

export function EmptyState({
  icon,
  tint = "#FDF0DA",
  title,
  line,
  children,
}: {
  icon: React.ReactNode;
  tint?: string;
  title: string;
  line: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-8 text-center">
      <span
        className="flex h-20 w-20 items-center justify-center rounded-full text-teal shadow-inner"
        style={{ backgroundColor: tint }}
      >
        {icon}
      </span>
      <h4 className="mt-4 font-display text-lg font-bold text-teal-dark">{title}</h4>
      <p className="mt-1 max-w-xs text-sm font-medium text-ink-soft">{line}</p>
      {children}
    </div>
  );
}
