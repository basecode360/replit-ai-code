import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../../lib/auth-provider";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Only log for debugging
  console.log("ProtectedRoute - Auth state:", {
    user: user?.username,
    isLoading,
    location,
    hasCheckedAuth,
  });

  // Wait for authentication to be checked
  useEffect(() => {
    if (!isLoading) {
      setHasCheckedAuth(true);
    }
  }, [isLoading]);

  // Handle navigation after auth check completes
  useEffect(() => {
    if (hasCheckedAuth && !user) {
      console.log("ProtectedRoute - Redirecting to auth");
      navigate("/auth"); // Changed to match App.tsx routing
    }
  }, [user, hasCheckedAuth, navigate]);

  // Show loading state
  if (isLoading || !hasCheckedAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // If authenticated, render children
  if (user) {
    return <>{children}</>;
  }

  // Default case: not authenticated, show nothing while redirecting
  return null;
}
