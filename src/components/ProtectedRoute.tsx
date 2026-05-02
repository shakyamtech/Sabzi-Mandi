import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Sprout } from "lucide-react";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-hero">
        <Sprout className="h-10 w-10 animate-pulse text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  return <>{children}</>;
};
