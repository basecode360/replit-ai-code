import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";
import {
  Unit,
  User,
  UnitLevels,
  insertUnitSchema,
} from "../../../shared/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useHierarchy } from "../hooks/use-hierarchy";
import { useAuth } from "../lib/auth-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import ManageUserUnitDialog from "../components/units/ManageUserUnitDialog";

import {
  Building,
  Users,
  PlusCircle,
  UserPlus,
  Clipboard,
  Shield,
  Search,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import UnitHierarchyTree from "../components/units/UnitHierarchyTree";

// Form schema for creating a new unit
const createUnitSchema = insertUnitSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  unitLevel: z.enum([
    UnitLevels.TEAM,
    UnitLevels.SQUAD,
    UnitLevels.PLATOON,
    UnitLevels.COMPANY,
    UnitLevels.BATTALION,
  ]),
  parentId: z.number().optional().nullable(),
});
type CreateUnitFormValues = z.infer<typeof createUnitSchema>;

export default function UnitManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    accessibleUnits,
    accessibleUsers,
    getUsersInUnit,
    getUnitLeader,
    constants,
    isLoading,
  } = useHierarchy();

  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [showCreateUnitDialog, setShowCreateUnitDialog] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedUserForReassignment, setSelectedUserForReassignment] =
    useState<User | null>(null);
  const [showManageUserDialog, setShowManageUserDialog] = useState(false);
  const [showEditParentDialog, setShowEditParentDialog] = useState(false);

  // Filtered users based on search
  const filteredUsers = accessibleUsers
    .filter((u) => {
      if (!userSearchQuery) return true;

      const query = userSearchQuery.toLowerCase();
      return (
        u.name.toLowerCase().includes(query) ||
        u.rank.toLowerCase().includes(query) ||
        u.username.toLowerCase().includes(query) ||
        u.role.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Form for creating units
  const unitForm = useForm<CreateUnitFormValues>({
    resolver: zodResolver(createUnitSchema),
    defaultValues: {
      name: "",
      unitLevel: UnitLevels.TEAM,
      parentId: undefined,
    },
  });

  // Mutation for creating a new unit
  const createUnitMutation = useMutation({
    mutationFn: async (data: CreateUnitFormValues) => {
      console.log("Sending unit data to server:", data);

      // Make sure the data is in the right format
      const unitData = {
        name: data.name,
        unitLevel: data.unitLevel,
        parentId: data.parentId ? Number(data.parentId) : null,
      };

      console.log("Formatted unit data:", unitData);

      try {
        const res = await apiRequest("POST", "/api/units", unitData);

        if (!res.ok) {
          const errorText = await res.text();
          console.error("Server error response:", errorText);
          throw new Error(errorText || `Server returned ${res.status}`);
        }

        const responseData = await res.json();
        console.log("Server success response:", responseData);
        return responseData;
      } catch (error) {
        console.error("API request error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Unit created successfully:", data);
      unitForm.reset();
      setShowCreateUnitDialog(false);

      // Show success message
      toast({
        title: "Unit created",
        description: "The new unit has been created successfully",
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ["/api/hierarchy/accessible-units"],
      });
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error creating unit",
        description: error.message || "There was an error creating the unit",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onUnitFormSubmit = async (values: CreateUnitFormValues) => {
    try {
      console.log("Submitting form with values:", values);
      console.log("Unit level type:", typeof values.unitLevel);
      console.log("Parent ID type:", typeof values.parentId);

      // Ensure form values are properly typed
      const formData = {
        ...values,
        unitLevel: values.unitLevel,
        parentId: values.parentId ? Number(values.parentId) : undefined,
      };

      console.log("Processed form data:", formData);
      await createUnitMutation.mutateAsync(formData);
      console.log("Form submitted successfully");
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Form Submission Error",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  // Create a Zod schema for updating a unit's parent
  const updateParentSchema = z.object({
    parentId: z.number().nullable(),
  });
  type UpdateParentFormValues = z.infer<typeof updateParentSchema>;

  // Form for updating a unit's parent
  const parentForm = useForm<UpdateParentFormValues>({
    resolver: zodResolver(updateParentSchema),
    defaultValues: {
      parentId: selectedUnit?.parentId || null,
    },
  });

  // Reset the parent form when the selected unit changes
  useEffect(() => {
    if (selectedUnit) {
      parentForm.reset({
        parentId: selectedUnit.parentId,
      });
    }
  }, [selectedUnit, parentForm]);

  // Mutation for updating a unit's parent
  const updateUnitParentMutation = useMutation({
    mutationFn: async (data: UpdateParentFormValues) => {
      if (!selectedUnit) {
        throw new Error("No unit selected");
      }

      console.log("Updating unit parent data:", data);

      try {
        const res = await apiRequest("PATCH", `/api/units/${selectedUnit.id}`, {
          parentId: data.parentId,
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("Server error response:", errorText);
          throw new Error(errorText || `Server returned ${res.status}`);
        }

        const responseData = await res.json();
        console.log("Server success response:", responseData);
        return responseData;
      } catch (error) {
        console.error("API request error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Unit parent updated successfully:", data);
      setShowEditParentDialog(false);

      // Show success message
      toast({
        title: "Unit updated",
        description: "The unit's parent has been updated successfully",
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ["/api/hierarchy/accessible-units"],
      });
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error updating unit",
        description: error.message || "There was an error updating the unit",
        variant: "destructive",
      });
    },
  });

  // Handle parent form submission
  const onParentFormSubmit = async (values: UpdateParentFormValues) => {
    try {
      console.log("Submitting parent form with values:", values);
      await updateUnitParentMutation.mutateAsync(values);
      console.log("Form submitted successfully");
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Form Submission Error",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  // Selected unit details
  const selectedUnitDetails = selectedUnit
    ? {
        members: getUsersInUnit(selectedUnit.id),
        leader: getUnitLeader(selectedUnit.id),
      }
    : null;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Unit Management | Venice AI</title>
        <meta
          name="description"
          content="Manage military units and their hierarchical structure"
        />
      </Helmet>

      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Unit Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage units and their hierarchical structure
            </p>
          </div>
          <Dialog
            open={showCreateUnitDialog}
            onOpenChange={setShowCreateUnitDialog}
          >
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Unit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Military Unit</DialogTitle>
                <DialogDescription>
                  Add a new unit to the military structure
                </DialogDescription>
              </DialogHeader>
              <Form {...unitForm}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    console.log("Form submitted manually");
                    unitForm.handleSubmit(onUnitFormSubmit)(e);
                  }}
                  className="space-y-4"
                >
                  <FormField
                    control={unitForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Name</FormLabel>
                        <FormControl>
                          <Input placeholder="1st Platoon" {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter the official name of the unit
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={unitForm.control}
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
                            {Object.entries(UnitLevels).map(([key, value]) => (
                              <SelectItem key={key} value={value}>
                                {value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the hierarchical level of the unit
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={unitForm.control}
                    name="parentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent Unit (Optional)</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(parseInt(value))
                          }
                          defaultValue={
                            field.value ? field.value.toString() : ""
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select parent unit (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accessibleUnits.map((unit) => (
                              <SelectItem
                                key={unit.id}
                                value={unit.id.toString()}
                              >
                                {unit.name} ({unit.unitLevel})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select a parent unit if this is a subordinate unit
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="mr-2"
                      onClick={() => setShowCreateUnitDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      disabled={unitForm.formState.isSubmitting}
                      onClick={() => {
                        console.log("Submit button clicked manually");
                        const formValues = unitForm.getValues();
                        console.log("Current form values:", formValues);

                        // Manual form submission
                        onUnitFormSubmit(formValues);
                      }}
                    >
                      {unitForm.formState.isSubmitting
                        ? "Creating..."
                        : "Create Unit"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="mr-2 h-5 w-5" />
                  Unit Hierarchy Structure
                </CardTitle>
                <CardDescription>
                  View the organizational structure of military units
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Use the current user's unitId as rootUnitId if they're not an admin */}
                <UnitHierarchyTree
                  rootUnitId={user?.role === "admin" ? undefined : user?.unitId}
                  canManage={true}
                  onSelectUnit={setSelectedUnit}
                />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">
                  <Building className="mr-2 h-4 w-4" /> Unit Details
                </TabsTrigger>
                <TabsTrigger value="members">
                  <Users className="mr-2 h-4 w-4" /> Unit Members
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details">
                <Card>
                  <CardHeader>
                    <CardTitle>Unit Information</CardTitle>
                    <CardDescription>
                      {selectedUnit
                        ? `Details for ${selectedUnit.name}`
                        : "Select a unit to view details"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedUnit ? (
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-medium text-sm text-muted-foreground">
                            Unit Name
                          </h3>
                          <p className="text-lg">{selectedUnit.name}</p>
                        </div>

                        <div>
                          <h3 className="font-medium text-sm text-muted-foreground">
                            Unit Level
                          </h3>
                          <p className="text-lg">{selectedUnit.unitLevel}</p>
                        </div>

                        <div>
                          <h3 className="font-medium text-sm text-muted-foreground">
                            Referral Code
                          </h3>
                          <div className="flex items-center mt-1">
                            <code className="bg-muted p-1 rounded text-sm">
                              {selectedUnit.referralCode}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  selectedUnit.referralCode
                                );
                                toast({
                                  title: "Code Copied",
                                  description:
                                    "The referral code was copied to clipboard",
                                });
                              }}
                            >
                              <Clipboard className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-medium text-sm text-muted-foreground">
                            Parent Unit
                          </h3>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-lg">
                              {selectedUnit.parentId
                                ? accessibleUnits.find(
                                    (u) => u.id === selectedUnit.parentId
                                  )?.name || "None"
                                : "None"}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowEditParentDialog(true)}
                            >
                              Change Parent
                            </Button>
                          </div>
                        </div>

                        {selectedUnitDetails?.leader && (
                          <div>
                            <h3 className="font-medium text-sm text-muted-foreground">
                              Unit Leader
                            </h3>
                            <div className="flex items-center mt-1 p-2 bg-secondary/50 rounded-md">
                              <Avatar className="h-8 w-8 mr-2">
                                <AvatarFallback>
                                  {selectedUnitDetails.leader.name.substring(
                                    0,
                                    2
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">
                                  {selectedUnitDetails.leader.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {selectedUnitDetails.leader.rank} -{" "}
                                  {selectedUnitDetails.leader.role}
                                </p>
                              </div>
                              <Shield className="h-4 w-4 ml-auto text-muted-foreground" />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <Building className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
                        <p>
                          Select a unit from the hierarchy tree to view details
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="members">
                <Card>
                  <CardHeader>
                    <CardTitle>Unit Members</CardTitle>
                    <CardDescription>
                      {selectedUnit
                        ? `Members of ${selectedUnit.name}`
                        : "Select a unit to view members"}
                    </CardDescription>

                    {selectedUnit && (
                      <div className="mt-2">
                        <Input
                          placeholder="Search members..."
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          className="mt-2"
                        />
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {selectedUnit ? (
                      selectedUnitDetails?.members &&
                      selectedUnitDetails.members.length > 0 ? (
                        <div className="space-y-2">
                          {filteredUsers
                            .filter((u) => u.unitId === selectedUnit.id)
                            .map((member) => (
                              <div
                                key={member.id}
                                className="flex items-center p-2 rounded-md hover:bg-secondary cursor-pointer"
                                onClick={() => {
                                  setSelectedUserForReassignment(member);
                                  setShowManageUserDialog(true);
                                }}
                              >
                                <Avatar className="h-8 w-8 mr-2">
                                  <AvatarFallback>
                                    {member.name.substring(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">
                                    {member.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {member.rank}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-xs text-muted-foreground">
                                    {member.role}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedUserForReassignment(member);
                                      setShowManageUserDialog(true);
                                    }}
                                    title="Reassign user to different unit"
                                  >
                                    <Building className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
                          <p>No members found in this unit</p>
                        </div>
                      )
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
                        <p>Select a unit to view its members</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* User Reassignment Dialog */}
      {selectedUserForReassignment && selectedUnit && (
        <ManageUserUnitDialog
          open={showManageUserDialog}
          onOpenChange={setShowManageUserDialog}
          user={selectedUserForReassignment}
          currentUnit={selectedUnit}
        />
      )}

      {/* Dialog for editing unit parent */}
      {selectedUnit && (
        <Dialog
          open={showEditParentDialog}
          onOpenChange={setShowEditParentDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Parent Unit</DialogTitle>
              <DialogDescription>
                Assign a parent unit for "{selectedUnit.name}" (
                {selectedUnit.unitLevel})
              </DialogDescription>
            </DialogHeader>
            <Form {...parentForm}>
              <form
                onSubmit={parentForm.handleSubmit(onParentFormSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={parentForm.control}
                  name="parentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Unit</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          // Handle both null (for clearing parent) and number values
                          if (value === "null") {
                            field.onChange(null);
                          } else {
                            field.onChange(parseInt(value));
                          }
                        }}
                        defaultValue={
                          field.value ? field.value.toString() : "null"
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select parent unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="null">None (No Parent)</SelectItem>
                          {accessibleUnits
                            // Filter out the current unit and its descendants to prevent circular references
                            .filter(
                              (unit) =>
                                unit.id !== selectedUnit.id &&
                                // Only show units of higher level than the selected unit
                                getUnitHierarchyLevel(unit.unitLevel) >
                                  getUnitHierarchyLevel(selectedUnit.unitLevel)
                            )
                            .map((unit) => (
                              <SelectItem
                                key={unit.id}
                                value={unit.id.toString()}
                              >
                                {unit.name} ({unit.unitLevel})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        A parent unit must be of a higher level in the
                        hierarchy.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="mr-2"
                    onClick={() => setShowEditParentDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateUnitParentMutation.isPending}
                  >
                    {updateUnitParentMutation.isPending
                      ? "Saving..."
                      : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );

  // Helper function to get the numeric hierarchy level of a unit level
  function getUnitHierarchyLevel(unitLevel: string): number {
    const hierarchyLevels = {
      Team: 1,
      Squad: 2,
      Section: 3,
      Platoon: 4,
      Company: 5,
      Battalion: 6,
      Brigade: 7,
      Division: 8,
    };

    return hierarchyLevels[unitLevel as keyof typeof hierarchyLevels] || 0;
  }
}
