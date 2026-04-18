import { cn } from "@/lib/utils";

interface HULogoProps {
  className?: string;
  showText?: boolean;
  size?: number;
}

/** Placeholder HU Dentistry wordmark — clean clinical wordmark + tooth icon. */
export function HULogo({ className, showText = true, size = 36 }: HULogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className="relative flex items-center justify-center rounded-md bg-gradient-primary shadow-glow"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 24 24" fill="none" className="text-primary-foreground" width={size * 0.6} height={size * 0.6}>
          {/* Stylized molar */}
          <path
            d="M7 3c-1.7 0-3 1.3-3 3 0 1.4.5 2.6 1 3.8.4 1.1.7 2.2.8 3.4l.5 6.3c.1.9.8 1.5 1.6 1.5.7 0 1.3-.5 1.5-1.2L10 16h4l.6 3.8c.2.7.8 1.2 1.5 1.2.8 0 1.5-.6 1.6-1.5l.5-6.3c.1-1.2.4-2.3.8-3.4.5-1.2 1-2.4 1-3.8 0-1.7-1.3-3-3-3-1.2 0-2.2.6-3 1.4C12.2 3.6 11.2 3 10 3c-1 0-1.9.4-2.5 1.1-.5-.7-1.4-1.1-2.5-1.1H7z"
            fill="currentColor"
          />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-display font-bold text-[15px] tracking-tight">HU Dentistry</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">
            Periodontal Suite
          </span>
        </div>
      )}
    </div>
  );
}
