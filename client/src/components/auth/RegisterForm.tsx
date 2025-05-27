import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useParams } from "wouter";
import { useAuth } from "@/lib/auth-provider";
import { useQuery } from "@tanstack/react-query";
import { MilitaryRoles } from "@/lib/types";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  rank: z.string().min(1, "Rank is required"),
  role: z.string().min(1, "Role is required"),
  unitId: z.number(),
  bio: z.string().optional(),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const { register } = useAuth();
  const [, navigate] = useLocation();
  const { referralCode } = useParams();
  const [error, setError] = useState<string | null>(null);
  
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      rank: "",
      role: "",
      unitId: 0,
      bio: "",
    },
  });
  
  // Query for unit info if referral code is provided
  const { data: unitData, isLoading: isUnitLoading } = useQuery<any>({
    queryKey: referralCode ? [`/api/units/referral/${referralCode}`] : ["empty-query"],
    enabled: !!referralCode,
  });
  
  // Use test unit if no referral code
  useEffect(() => {
    if (!referralCode) {
      form.setValue('unitId', 1); // Use our test battalion
    }
  }, [form, referralCode]);

  // Update unitId when unit data is loaded
  useEffect(() => {
    if (unitData && typeof unitData === 'object' && 'id' in unitData) {
      form.setValue("unitId", unitData.id);
    }
  }, [unitData, form]);

  const onSubmit = async (values: RegisterFormValues) => {
    setError(null);
    
    try {
      console.log("Submitting registration for:", values.username);
      await register(values);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error(err);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <h2 className="text-2xl font-bold text-center">Register</h2>
        <p className="text-muted-foreground text-center mt-2">
          Create your account in the AAR Management System
        </p>
        {referralCode && unitData && typeof unitData === 'object' && 'name' in unitData && (
          <Alert className="mt-4">
            <AlertDescription>
              You are registering as a member of{" "}
              <span className="font-bold">{unitData.name}</span>
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Removed referral code requirement message */}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
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

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rank"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rank</FormLabel>
                    <FormControl>
                      <Input placeholder="Your military rank (e.g., CPT, SGT)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(MilitaryRoles).map(([key, value]) => (
                          <SelectItem key={key} value={value}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit ID</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Your unit ID"
                        disabled={!!unitData || !referralCode}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about your background and experience"
                      className="min-h-[100px]"
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
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Registering..." : "Register"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col">
        <p className="text-sm text-muted-foreground mt-4">
          Already have an account?{" "}
          <Link href="/login">
            <a className="text-primary hover:underline">Login</a>
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
