import { Navigate } from "react-router-dom";
import { useAuth } from "@/components/providers/AuthProvider";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  return <Navigate to={user ? "/app" : "/auth"} replace />;
};

export default Index;
