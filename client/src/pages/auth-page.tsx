import React from "react";
import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth-provider";
import { LoginCredentials, RegisterData } from "../lib/auth-service";
import { useLocation, Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import { Input } from "../components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
import { Switch } from "../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Shield,
  ChevronRight,
  User,
  Key,
  UserPlus,
  Loader2,
} from "lucide-react";

// Schema for login form
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Schema for registration form with extended validation
const registerSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    name: z.string().min(1, "Full name is required"),
    rank: z.string().min(1, "Military rank is required"),
    role: z.string().min(1, "Military role is required"),
    referralCode: z.string().optional(),
    bio: z.string().optional(),
    // Optional fields for creating a new unit (when no referral code is provided)
    createNewUnit: z.boolean().optional(),
    unitName: z.string().optional(),
    unitLevel: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      // If creating a new unit, unitName and unitLevel are required
      if (data.createNewUnit) {
        return !!data.unitName && !!data.unitLevel;
      }
      // If not creating a new unit, referralCode is required
      return !!data.referralCode;
    },
    {
      message: "Either a referral code or new unit information is required",
      path: ["referralCode"],
    }
  );

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, isLoading, login, register } = useAuth();
  const [location, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("login");

  // Use state to track loading status for login and registration
  const [isLoginPending, setIsLoginPending] = useState(false);
  const [isRegisterPending, setIsRegisterPending] = useState(false);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      name: "",
      rank: "",
      role: "",
      referralCode: "",
      bio: "",
      createNewUnit: false,
      unitName: "",
      unitLevel: "",
    },
  });

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Handle login form submission
  const onLoginSubmit = async (values: LoginFormValues) => {
    try {
      setIsLoginPending(true);
      const success = await login(values.username, values.password);
      console.log("Login attempt result:", success);

      if (success) {
        console.log("Login successful, navigating to dashboard");
        // Force navigation after a brief delay
        setTimeout(() => {
          navigate("/");
        }, 500);
      }
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoginPending(false);
    }
  };

  // Handle register form submission
  const onRegisterSubmit = async (values: RegisterFormValues) => {
    try {
      setIsRegisterPending(true);

      // Remove confirmPassword as it's not in the API model
      const { confirmPassword, ...registerData } = values;

      // If not creating a new unit, ensure unit fields aren't sent
      if (!values.createNewUnit) {
        // Remove unit creation fields when using referral code
        const { unitName, unitLevel, createNewUnit, ...referralData } =
          registerData;
        await register(referralData);
      } else {
        // When creating a new unit, ensure referralCode is not sent
        const { referralCode, ...unitCreationData } = registerData;

        // Set the user's role to admin/commander when creating a new unit
        const leaderData = {
          ...unitCreationData,
          role: unitCreationData.role || "Commander", // Default to Commander if no role specified
        };

        await register(leaderData);
      }
    } catch (error) {
      console.error("Registration error:", error);
    } finally {
      setIsRegisterPending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8">
        {/* Left column: Authentication forms */}
        <div className="flex-1 w-full">
          <Card className="w-full shadow-lg">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl">GreenBook</CardTitle>
              </div>
              <CardDescription>
                Enter your credentials to access the secure After-Action Review
                system
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <Tabs
                defaultValue="login"
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger
                    value="login"
                    className="flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    <span>Login</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="flex items-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Register</span>
                  </TabsTrigger>
                </TabsList>

                {/* Login Form */}
                <TabsContent value="login">
                  <div className="space-y-4 py-2">
                    <Form {...loginForm}>
                      <form
                        onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={loginForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter your username"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="Enter your password"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={isLoginPending}
                        >
                          {isLoginPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Logging in...
                            </>
                          ) : (
                            <>
                              <Key className="mr-2 h-4 w-4" />
                              Login
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>

                    <div className="text-center space-y-2">
                      <div className="text-sm text-muted-foreground">
                        Don't have an account?
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="ghost"
                          className="text-sm"
                          onClick={() => setActiveTab("register")}
                        >
                          Create an account
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                        <Button
                          variant="link"
                          className="text-sm text-primary p-0 h-auto"
                          onClick={() => (window.location.href = "/demo")}
                        >
                          Try our interactive demo first
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Register Form */}
                <TabsContent value="register">
                  <div className="space-y-4 py-2">
                    <Form {...registerForm}>
                      <form
                        onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <FormField
                            control={registerForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Choose a username"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={registerForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter your full name"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <FormField
                            control={registerForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                  <Input
                                    type="password"
                                    placeholder="Choose a secure password"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={registerForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirm Password</FormLabel>
                                <FormControl>
                                  <Input
                                    type="password"
                                    placeholder="Confirm your password"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <FormField
                            control={registerForm.control}
                            name="rank"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Military Rank</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="E.g. Captain, Sergeant"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={registerForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Military Role</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="E.g. Squad Leader"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="space-y-4">
                          <FormField
                            control={registerForm.control}
                            name="createNewUnit"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel>Create New Unit</FormLabel>
                                  <FormDescription>
                                    Toggle this if you want to create a new unit
                                    instead of joining an existing one
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={(checked) => {
                                      field.onChange(checked);
                                      // Clear referral code or unit fields based on selection
                                      if (checked) {
                                        registerForm.setValue(
                                          "referralCode",
                                          ""
                                        );
                                      } else {
                                        registerForm.setValue("unitName", "");
                                        registerForm.setValue("unitLevel", "");
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {!registerForm.watch("createNewUnit") ? (
                            <FormField
                              control={registerForm.control}
                              name="referralCode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Unit Referral Code</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Enter your unit's referral code"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Ask your superior for your unit's referral
                                    code
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : (
                            <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                              <h3 className="text-sm font-medium">
                                New Unit Information
                              </h3>
                              <FormField
                                control={registerForm.control}
                                name="unitName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Unit Name</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="Enter name for your new unit"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={registerForm.control}
                                name="unitLevel"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Unit Level</FormLabel>
                                    <Select
                                      onValueChange={field.onChange}
                                      defaultValue={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select unit level" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="Squad">
                                          Squad
                                        </SelectItem>
                                        <SelectItem value="Platoon">
                                          Platoon
                                        </SelectItem>
                                        <SelectItem value="Company">
                                          Company
                                        </SelectItem>
                                        <SelectItem value="Battalion">
                                          Battalion
                                        </SelectItem>
                                        <SelectItem value="Brigade">
                                          Brigade
                                        </SelectItem>
                                        <SelectItem value="Division">
                                          Division
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormDescription>
                                      You will be designated as the leader of
                                      this unit
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                        </div>

                        <FormField
                          control={registerForm.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bio (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Brief description of your military background"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="submit"
                          className="w-full"
                          disabled={isRegisterPending}
                        >
                          {isRegisterPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating account...
                            </>
                          ) : (
                            <>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Create Account
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>

                    <div className="text-center space-y-2">
                      <div className="text-sm text-muted-foreground">
                        Already have an account?
                      </div>
                      <Button
                        variant="ghost"
                        className="text-sm"
                        onClick={() => setActiveTab("login")}
                      >
                        Login to your account
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right column: App information */}
        <div className="flex-1 w-full bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-8 flex flex-col justify-center">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">GreenBook System</h2>
              <p className="text-muted-foreground">
                A comprehensive solution for managing and analyzing After-Action
                Reviews
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2 mt-0.5">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Secure Military Information</h3>
                  <p className="text-sm text-muted-foreground">
                    Field-level encryption for sensitive military data with
                    hierarchical access controls
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2 mt-0.5">
                  <svg
                    className="h-5 w-5 text-primary"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">
                    Advanced GreenBookAAR Integration
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Powerful AI-driven analysis of training data to identify
                    trends and recommend improvements
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2 mt-0.5">
                  <svg
                    className="h-5 w-5 text-primary"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Comprehensive Unit Tracking</h3>
                  <p className="text-sm text-muted-foreground">
                    Track and visualize training performance across all levels
                    of military hierarchy
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2 mt-0.5">
                  <svg
                    className="h-5 w-5 text-primary"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Customizable AAR Templates</h3>
                  <p className="text-sm text-muted-foreground">
                    Tailor AAR forms to specific training types with support for
                    multimedia attachments
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
