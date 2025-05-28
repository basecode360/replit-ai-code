import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import { queryClient } from "./queryClient";
import { useToast } from "./hooks/use-toast";
import { useLocation } from "wouter";

export type User = {
  id: number;
  username: string;
  name: string;
  rank: string;
  role: string;
  unitId: number;
  bio?: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (userData: any) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Check if user is already logged in
  const { data, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  // Handle success and error with useEffect
  useEffect(() => {
    if (data) {
      setUser(data as User);
    }
  }, [data]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({
      username,
      password,
    }: {
      username: string;
      password: string;
    }) => {
      const res = await apiRequest("POST", "/api/auth/login", {
        username,
        password,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setUser(data);
      queryClient.setQueryData(["/api/auth/me"], data);
      toast({
        title: "Logged in successfully",
        description: "Welcome back!",
      });
    },
    onError: (error: any) => {
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
      const res = await apiRequest("POST", "/api/auth/logout", {});
      return await res.json();
    },
    onSuccess: () => {
      setUser(null);
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
      toast({
        title: "Logged out successfully",
      });
      navigate("/login");
    },
    onError: (error: any) => {
      toast({
        title: "Logout failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await apiRequest("POST", "/api/users", userData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Registration successful",
        description: "You can now log in",
      });
      navigate("/login");
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
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

  const register = async (userData: any): Promise<boolean> => {
    try {
      await registerMutation.mutateAsync(userData);
      return true;
    } catch (error) {
      return false;
    }
  };

  // This is a JSX element within a TypeScript file, which is causing issues
  // Let's fix it by explicitly typing the return value
  const contextValue: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    register,
  };

  return React.createElement(
    AuthContext.Provider,
    { value: contextValue },
    children
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
