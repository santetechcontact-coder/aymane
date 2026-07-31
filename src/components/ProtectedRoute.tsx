import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/aymane-logo.png";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="app-page-gradient min-h-[100dvh] flex items-center justify-center px-5">
        <div className="rounded-[1.45rem] bg-surface-0 border border-hairline p-6 shadow-sm text-center w-full max-w-xs">
          <img src={logo} alt="AYMANE" className="h-10 w-auto mx-auto object-contain" />
          <div className="mt-5 h-2 rounded-full bg-surface-1 overflow-hidden">
            <div className="h-full w-1/2 rounded-full bg-primary animate-pulse" />
          </div>
          <p className="text-[13px] text-ink-3 mt-4">Préparation de votre espace...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  return <>{children}</>;
};

export default ProtectedRoute;
