import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/use-toast";
import { useAuth } from "../../lib/auth-provider";

import { Button } from "../../components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Card, CardContent, CardHeader } from "../../components/ui/card";

const unitSchema = z.object({
  name: z.string().min(3, "Unit name must be at least 3 characters"),
  unitLevel: z.string().min(1, "Unit level is required"),
  parentId: z.string().optional(),
});

type UnitFormValues = z.infer<typeof unitSchema>;

export default function UnitRegistration() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isCreated, setIsCreated] = useState(false);
  const [newUnitId, setNewUnitId] = useState<number | null>(null);

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      name: "",
      unitLevel: "",
      parentId: undefined,
    },
  });

  // Query all units for parent selection
  const { data: units = [] } = useQuery({
    queryKey: ["/api/units"],
  });

  // Create unit mutation
  const createUnit = useMutation({
    mutationFn: async (values: UnitFormValues) => {
      const unitData = {
        name: values.name,
        unitLevel: values.unitLevel,
        parentId: values.parentId ? parseInt(values.parentId) : undefined,
      };

      const res = await apiRequest("POST", "/api/units", unitData);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Unit created",
        description: "Your unit has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      setIsCreated(true);
      setNewUnitId(data.id);
    },
    onError: (error: any) => {
      toast({
        title: "Error creating unit",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (values: UnitFormValues) => {
    createUnit.mutateAsync(values);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <h2 className="text-xl font-bold">Register New Unit</h2>
        <p className="text-sm text-muted-foreground">
          Create a new military unit in the system
        </p>
      </CardHeader>
      <CardContent>
        {isCreated && newUnitId ? (
          <div className="text-center space-y-4">
            <div className="bg-green-50 text-green-800 p-4 rounded-md">
              <p className="font-semibold">Unit successfully created!</p>
              <p className="text-sm mt-2">
                You can now generate referral links for subordinate units.
              </p>
            </div>

            <Button
              className="w-full"
              onClick={() => {
                form.reset();
                setIsCreated(false);
                setNewUnitId(null);
              }}
            >
              Register Another Unit
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 1st Infantry Battalion"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
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
                        <SelectItem value="Battalion">Battalion</SelectItem>
                        <SelectItem value="Company">Company</SelectItem>
                        <SelectItem value="Platoon">Platoon</SelectItem>
                        <SelectItem value="Squad">Squad</SelectItem>
                        <SelectItem value="Team">Team</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Unit (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {units.map((unit: any) => (
                          <SelectItem key={unit.id} value={unit.id.toString()}>
                            {unit.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={createUnit.isPending}
              >
                {createUnit.isPending ? "Creating..." : "Create Unit"}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
