import { ReactNode } from "react";
import { Card } from "./components/ui/card";

interface AuthWrapperProps {
  children: ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-muted/50 to-muted p-4">
      <div className="absolute top-0 left-0 w-full p-4">
        <h1 className="text-2xl font-condensed font-bold text-primary">
          GreenBook System
        </h1>
      </div>

      {children}

      <div className="absolute bottom-0 left-0 w-full p-4 text-center text-sm text-muted-foreground">
        Military After-Action Review System - Secure Platform for Training
        Analytics
      </div>
    </div>
  );
}
