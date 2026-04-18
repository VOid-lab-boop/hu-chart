import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/providers/I18nProvider";
import { useLocation, useNavigate } from "react-router-dom";
import { NotificationsBell } from "@/components/NotificationsBell";

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Force-hide the back button. By default it shows on every route except `/app`. */
  hideBack?: boolean;
}

export function Topbar({ title, subtitle, actions, hideBack }: TopbarProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const showBack = !hideBack && location.pathname !== "/app" && location.pathname !== "/app/";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      {showBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/app"))}
          className="-ml-2 gap-1.5"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
        </Button>
      )}

      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-lg font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="hidden md:flex relative w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t("search")} className="h-9 pl-9 bg-muted/40" />
      </div>

      {actions}

      <LanguageToggle />
      <ThemeToggle />
      <NotificationsBell />
    </header>
  );
}
