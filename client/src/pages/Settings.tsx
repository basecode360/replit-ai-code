import { useAuth } from "@/lib/auth-provider";
import UserChainOfCommand from "@/components/users/UserChainOfCommand";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useTheme } from "@/components/ui/theme-provider";
import { AlertCircle, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  rank: z.string().min(1, "Rank is required"),
  bio: z.string().optional(),
});

const securitySchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type SecurityFormValues = z.infer<typeof securitySchema>;

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);

  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      rank: user?.rank || "",
      bio: user?.bio || "",
    },
  });

  // Security form
  const securityForm = useForm<SecurityFormValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const res = await apiRequest("PATCH", `/api/users/${user?.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setSuccess("Your profile has been updated successfully");
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating profile",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Update password mutation
  const updatePassword = useMutation({
    mutationFn: async (data: SecurityFormValues) => {
      const res = await apiRequest("PATCH", `/api/users/${user?.id}/password`, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully",
      });
      securityForm.reset();
      setSuccess("Your password has been updated successfully");
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating password",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Profile form submission
  const onProfileSubmit = (values: ProfileFormValues) => {
    updateProfile.mutateAsync(values);
  };

  // Security form submission
  const onSecuritySubmit = (values: SecurityFormValues) => {
    updatePassword.mutateAsync(values);
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-condensed font-bold text-gray-900 sm:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account preferences and settings
        </p>
      </div>

      {success && (
        <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
          <Check className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="hierarchy">Chain of Command</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="rank"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rank</FormLabel>
                          <FormControl>
                            <Input placeholder="Your military rank" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={profileForm.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us about your background and experience"
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center p-4 bg-muted/50 rounded-md">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium">Read-only Fields</h3>
                      <p className="text-sm text-muted-foreground">
                        Some information can only be changed by your unit administrator.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Username</label>
                      <Input value={user?.username} disabled />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Role</label>
                      <Input value={user?.role} disabled />
                    </div>
                  </div>

                  <CardFooter className="px-0 pb-0">
                    <Button
                      type="submit"
                      disabled={updateProfile.isPending}
                      className="ml-auto"
                    >
                      {updateProfile.isPending ? "Updating..." : "Update Profile"}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chain of Command */}
        <TabsContent value="hierarchy">
          <Card>
            <CardHeader>
              <CardTitle>Military Hierarchy</CardTitle>
              <CardDescription>
                View your position in the chain of command and your military relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserChainOfCommand />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Update your password and security preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...securityForm}>
                <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-6">
                  <FormField
                    control={securityForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter current password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={securityForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter new password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={securityForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Confirm new password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex items-center p-4 bg-muted/50 rounded-md">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium">Password Requirements</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Passwords must be at least 6 characters long and include a mix of letters and numbers.
                      </p>
                    </div>
                  </div>

                  <CardFooter className="px-0 pb-0">
                    <Button
                      type="submit"
                      disabled={updatePassword.isPending}
                      className="ml-auto"
                    >
                      {updatePassword.isPending ? "Updating..." : "Update Password"}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize how the application looks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Theme</label>
                <div className="grid grid-cols-3 gap-4">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    onClick={() => setTheme("light")}
                    className="justify-start"
                  >
                    Light
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    onClick={() => setTheme("dark")}
                    className="justify-start"
                  >
                    Dark
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    onClick={() => setTheme("system")}
                    className="justify-start"
                  >
                    System
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Text Size</label>
                <div className="grid grid-cols-3 gap-4">
                  <Button variant="outline" className="justify-start">Small</Button>
                  <Button variant="default" className="justify-start">Medium</Button>
                  <Button variant="outline" className="justify-start">Large</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Enable Notifications</h3>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications about new events and AARs
                    </p>
                  </div>
                  <Switch
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Notification Types</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm">New events assigned to you</div>
                    <Switch defaultChecked disabled={!notificationsEnabled} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm">AAR submissions for your events</div>
                    <Switch defaultChecked disabled={!notificationsEnabled} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm">Training step changes</div>
                    <Switch defaultChecked disabled={!notificationsEnabled} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm">Venice AI insights and recommendations</div>
                    <Switch defaultChecked disabled={!notificationsEnabled} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
