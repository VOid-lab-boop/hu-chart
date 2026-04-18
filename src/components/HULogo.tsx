import { cn } from "@/lib/utils";
import logoImg from "@/assets/hu-dentistry-logo.jpg";

interface HULogoProps {
  className?: string;
  showText?: boolean;
  size?: number;
}

/** Official HU Faculty of Dentistry logo. */
export function HULogo({ className, showText = true, size = 40 }: HULogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src={logoImg}
        alt="The Hashemite University — Faculty of Dentistry"
        width={size}
        height={size}
        className="rounded-full object-contain shadow-sm ring-1 ring-border/40"
        style={{ width: size, height: size }}
      />
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
