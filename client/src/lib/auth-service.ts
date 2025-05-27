import { apiRequest } from "./queryClient";

export type User = {
  id: number;
  username: string;
  name: string;
  rank: string;
  role: string;
  unitId: number;
  bio?: string | null;
};

export type LoginCredentials = {
  username: string;
  password: string;
};

export type RegisterData = {
  username: string;
  password: string;
  name: string;
  rank: string;
  role: string;
  referralCode?: string;
  bio?: string;
  createNewUnit?: boolean;
  unitName?: string;
  unitLevel?: string;
};

// Separate API service functions to avoid circular dependencies
export const authService = {
  /**
   * Get current user data
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      console.log("Requesting current user from /api/auth/me");
      const response = await apiRequest("GET", "/api/auth/me");
      console.log("GET /api/auth/me status:", response.status);
      
      if (response.status === 401) {
        console.log("User not authenticated (401)");
        return null;
      }
      
      if (!response.ok) {
        console.error("Failed to fetch user data:", response.status);
        throw new Error("Failed to fetch user data");
      }
      
      const userData = await response.json();
      console.log("Got user data:", userData);
      return userData;
    } catch (error) {
      console.error("Error fetching current user:", error);
      return null;
    }
  },
  
  /**
   * Login with credentials
   */
  async login(credentials: LoginCredentials): Promise<User> {
    console.log(`Attempting login for user: ${credentials.username}`);
    const response = await apiRequest("POST", "/api/auth/login", credentials);
    console.log("Login response status:", response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Login failed:", errorData);
      throw new Error(errorData.message || "Authentication failed");
    }
    
    const userData = await response.json();
    console.log("Login successful, user data:", userData);
    return userData;
  },
  
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<User> {
    console.log("Submitting registration data:", data);
    const response = await apiRequest("POST", "/api/users", data);
    console.log("Registration response status:", response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Registration failed:", errorData);
      throw new Error(errorData.message || "Registration failed");
    }
    
    const userData = await response.json();
    console.log("Registration successful, user data:", userData);
    return userData;
  },
  
  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    console.log("Attempting to logout");
    const response = await apiRequest("POST", "/api/auth/logout");
    console.log("Logout response status:", response.status);
    
    if (!response.ok) {
      console.error("Logout failed:", response.status);
      throw new Error("Logout failed");
    }
    
    console.log("Logout successful");
  }
};