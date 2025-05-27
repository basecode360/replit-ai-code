import { createContext, useState, useEffect, useContext, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "./queryClient";
import { useToast } from "../hooks/use-toast";
import { useLocation } from "wouter";
import { 
  User, 
  LoginCredentials, 
  RegisterData, 
  authService 
} from "./auth-service";

// Define clear AuthContext type that matches the actual implementation
export type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (userData: RegisterData) => Promise<boolean>;
  loginMutation: any;
  logoutMutation: any;
  registerMutation: any;
};

// Create context with null as initial value and export it
export const AuthContext = createContext<AuthContextType | null>(null);

// Export the auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Check if user is already logged in
  const { data, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      console.log("Making GET request to /api/auth/me", null);
      try {
        const userData = await authService.getCurrentUser();
        console.log("Response from /api/auth/me:", userData ? 200 : 401);
        console.log("User data:", userData);
        setHasCheckedAuth(true);
        return userData;
      } catch (error) {
        console.error("Auth check error:", error);
        setHasCheckedAuth(true);
        return null;
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchInterval: false,
    gcTime: Infinity,
  });
  
  // Update user when data changes
  useEffect(() => {
    if (data) {
      setUser(data);
    } else if (data === null && hasCheckedAuth) {
      // Clear user if data is explicitly null (not logged in)
      setUser(null);
    }
  }, [data, hasCheckedAuth]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      console.log(`Attempting to login: ${credentials.username}`);
      return await authService.login(credentials);
    },
    onSuccess: (data) => {
      console.log("Login success:", data);
      // Set the user in state first
      setUser(data);
      
      // Update the cached query data
      queryClient.setQueryData(["/api/auth/me"], data);
      
      // Force a refresh of all auth-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      // Show success toast
      toast({
        title: "Logged in successfully",
        description: `Welcome back, ${data.name}!`,
      });
      
      // Add a small delay to ensure state is updated before redirect
      setTimeout(() => {
        console.log("Redirecting to dashboard after login");
        navigate("/");
      }, 100);
    },
    onError: (error: any) => {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log("Attempting to logout");
      await authService.logout();
    },
    onSuccess: () => {
      console.log("Logout successful");
      setUser(null);
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
      toast({
        title: "Logged out successfully",
      });
      navigate("/auth");
    },
    onError: (error: any) => {
      console.error("Logout error in mutation:", error);
      toast({
        title: "Logout failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      console.log("Submitting registration data:", userData);
      return await authService.register(userData);
    },
    onSuccess: (data) => {
      console.log("Registration successful:", data);
      toast({
        title: "Registration successful",
        description: "You can now log in",
      });
      
      // Try to automatically log in after registration
      if (registerMutation.variables) {
        const { username, password } = registerMutation.variables as LoginCredentials;
        loginMutation.mutate({ username, password });
      } else {
        navigate("/auth");
      }
    },
    onError: (error: any) => {
      console.error("Registration error in mutation:", error);
      toast({
        title: "Registration failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      await loginMutation.mutateAsync({ username, password });
      return true;
    } catch (error) {
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    await logoutMutation.mutateAsync();
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      await registerMutation.mutateAsync(userData);
      return true;
    } catch (error) {
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        register,
        loginMutation,
        logoutMutation, 
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Export hook that unwraps the context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}