import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type AppRole } from "@/components/providers/AuthProvider";
import { type ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  requireRoles?: AppRole[];
}

export function ProtectedRoute({ children, requireRoles }: Props) {
  const { user, roles, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requireRoles && !requireRoles.some((r) => roles.includes(r))) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
