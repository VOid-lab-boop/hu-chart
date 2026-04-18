import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Activity, Gauge, ScanLine, Camera,
  ClipboardList, CalendarDays, FileBarChart2, ShieldCheck, UserCog, LogOut,
  GraduationCap, History
} from "lucide-react";
import { HULogo } from "@/components/HULogo";
import { useAuth } from "@/components/providers/AuthProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { cn } from "@/lib/utils";

type NavItem = { to: string; icon: any; key: string; end?: boolean };

const navItems: NavItem[] = [
  { to: "/app", icon: LayoutDashboard, key: "dashboard", end: true },
  { to: "/app/patients", icon: Users, key: "patients" },
  { to: "/app/charting", icon: Activity, key: "charting" },
  { to: "/app/indices", icon: Gauge, key: "indices" },
  { to: "/app/radiographs", icon: ScanLine, key: "radiographs" },
  { to: "/app/photos", icon: Camera, key: "photos" },
  { to: "/app/treatment", icon: ClipboardList, key: "treatment" },
  { to: "/app/appointments", icon: CalendarDays, key: "appointments" },
  { to: "/app/reports", icon: FileBarChart2, key: "reports" },
];

const supervisorItems: NavItem[] = [
  { to: "/app/supervision", icon: ShieldCheck, key: "supervision" },
  { to: "/app/requirements", icon: GraduationCap, key: "requirements" },
  { to: "/app/audit", icon: History, key: "audit" },
  { to: "/app/users", icon: UserCog, key: "users" },
];

export function Sidebar() {
  const { signOut, user, roles } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const isSupervisor = roles.includes("supervisor") || roles.includes("admin");

  const Item = ({ to, icon: Icon, label, end }: { to: string; icon: any; label: string; end?: boolean }) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all",
          "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive && "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "absolute left-0 h-6 w-0.5 rounded-r bg-sidebar-primary transition-opacity",
              isActive ? "opacity-100" : "opacity-0"
            )}
          />
          <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-sidebar-primary")} />
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  );

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <HULogo />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        <div className="px-2 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50">
          Clinical
        </div>
        {navItems.map((item) => (
          <div key={item.to} className="relative">
            <Item to={item.to} icon={item.icon} label={t(item.key as any)} end={item.end} />
          </div>
        ))}

        {isSupervisor && (
          <>
            <div className="mt-4 px-2 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50">
              Faculty
            </div>
            {supervisorItems.map((item) => (
              <div key={item.to} className="relative">
                <Item to={item.to} icon={item.icon} label={t(item.key as any)} />
              </div>
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-md bg-sidebar-accent/40 p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground">
              {user?.email?.slice(0, 2).toUpperCase() ?? "HU"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{user?.email ?? "—"}</p>
              <p className="truncate font-mono text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
                {roles[0] ?? "user"}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="mt-2 flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t("signout")}
          </button>
        </div>
      </div>
    </aside>
  );
}
