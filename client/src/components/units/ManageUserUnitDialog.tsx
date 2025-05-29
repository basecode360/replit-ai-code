import { useState, useEffect } from "react";
import { User, Unit } from "@shared/schema";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/use-toast";
import { useHierarchy } from "../../hooks/use-hierarchy";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Loader2, Users, Building, PlusCircle, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

// Assignment types
const ASSIGNMENT_TYPES = {
  PRIMARY: "PRIMARY",
  ATTACHED: "ATTACHED",
  TEMPORARY: "TEMPORARY",
  DUAL_HATTED: "DUAL_HATTED",
};

// Leadership roles mapping by unit level
const LEADERSHIP_ROLES = {
  Company: [
    "Commander",
    "Executive Officer",
    "First Sergeant",
    "Company Admin",
  ],
  Platoon: ["Platoon Leader", "Platoon Sergeant", "Platoon Admin"],
  Squad: ["Squad Leader", "Assistant Squad Leader"],
  Team: ["Team Leader"],
};

// Types for unit assignments
interface UnitAssignment {
  id?: number;
  unitId: number;
  assignmentType: string;
  leadershipRole?: string | null;
  startDate?: string;
  endDate?: string | null;
  isNew?: boolean;
}

interface ManageUserUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  currentUnit: Unit;
}

export default function ManageUserUnitDialog({
  open,
  onOpenChange,
  user,
  currentUnit,
}: ManageUserUnitDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getSubordinateUnits, accessibleUnits } = useHierarchy();

  // State for unit assignments and UI handling
  const [selectedUnitId, setSelectedUnitId] = useState<number>(user.unitId);
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [assignments, setAssignments] = useState<UnitAssignment[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newAssignment, setNewAssignment] = useState<UnitAssignment>({
    unitId: 0,
    assignmentType: ASSIGNMENT_TYPES.ATTACHED,
    leadershipRole: null,
  });

  // Mutation to update user's primary unit (legacy approach for backward compatibility)
  const updateUserMutation = useMutation({
    mutationFn: async (data: { userId: number; unitId: number }) => {
      console.log(
        `Making API request to reassign user ${data.userId} to unit ${data.unitId}`
      );

      // Use PATCH request to /api/users/:userId/unit which is already implemented
      const response = await fetch(`/api/users/${data.userId}/unit`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ unitId: data.unitId }),
      });

      console.log("Reassignment API response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Reassignment API error:", errorData);
        throw new Error(errorData.message || "Failed to update user's unit");
      }

      const result = await response.json();
      console.log("Reassignment API success response:", result);
      return result;
    },
    onSuccess: (updatedUser) => {
      // Get the unit being shown in the UI
      const targetUnit = availableUnits.find((u) => u.id === selectedUnitId);

      // Get the name of the target unit for the confirmation message
      const targetUnitName = targetUnit ? targetUnit.name : "new unit";

      // Show a success message with the actual selected unit name
      toast({
        title: "Unit assignments updated",
        description: `${user.name}'s assignments have been updated.`,
        variant: "default",
      });

      // Force invalidation of all relevant queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ["/api/hierarchy/accessible-users"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });

      console.log("User assignments updated successfully:", updatedUser);

      // Close the dialog
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update assignments",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Function to fetch assignments from the API
  const fetchUserAssignments = async (
    userId: number
  ): Promise<UnitAssignment[]> => {
    try {
      // Call the real API endpoint we just created
      const response = await fetch(`/api/users/${userId}/unit-assignments`);

      if (!response.ok) {
        throw new Error("Failed to fetch assignments");
      }

      // Parse and return the assignments
      const assignments = await response.json();
      console.log("Fetched assignments:", assignments);
      return assignments;
    } catch (error) {
      console.error("Error fetching unit assignments:", error);
      toast({
        title: "Error",
        description: "Failed to load unit assignments",
        variant: "destructive",
      });

      // Return a default assignment based on user's current unitId as a fallback
      return [
        {
          id: 1,
          unitId: user.unitId,
          assignmentType: ASSIGNMENT_TYPES.PRIMARY,
          startDate: new Date().toISOString(),
        },
      ];
    }
  };

  // Load user's assignments when dialog opens or when assignments query refreshes
  useEffect(() => {
    if (open) {
      const loadAssignments = async () => {
        try {
          // Fetch assignments using the fetchUserAssignments function
          const userAssignmentsData = await fetchUserAssignments(user.id);

          // Set assignments from the API data
          setAssignments(userAssignmentsData);

          // Find primary assignment and set selected unit ID
          const primaryAssignment = userAssignmentsData.find(
            (a: UnitAssignment) => a.assignmentType === ASSIGNMENT_TYPES.PRIMARY
          );

          if (primaryAssignment) {
            setSelectedUnitId(primaryAssignment.unitId);
          } else {
            setSelectedUnitId(user.unitId);
          }
        } catch (error) {
          console.error("Error loading assignments:", error);
          toast({
            title: "Error",
            description: "Could not load user assignments",
            variant: "destructive",
          });
        }
      };

      loadAssignments();
    }
  }, [open, user.id, user.unitId]);

  // Load available units when the dialog opens
  useEffect(() => {
    if (open) {
      console.log("Dialog opened, loading available units");

      // Get all accessible units
      const allAccessibleUnits = [...accessibleUnits];

      // Sort by unit level hierarchy and name
      const sortedUnits = allAccessibleUnits.sort((a, b) => {
        const levelOrder: Record<string, number> = {
          Battalion: 1,
          Company: 2,
          Platoon: 3,
          Squad: 4,
          Team: 5,
        };

        const aLevel = levelOrder[a.unitLevel] || 99;
        const bLevel = levelOrder[b.unitLevel] || 99;

        if (aLevel !== bLevel) {
          return aLevel - bLevel;
        }

        return a.name.localeCompare(b.name);
      });

      setAvailableUnits(sortedUnits);
    }
  }, [open, accessibleUnits]);

  // Get leadership roles for a unit based on its level
  const getLeadershipRolesForUnit = (unitId: number): string[] => {
    const unit = availableUnits.find((u) => u.id === unitId);
    if (!unit) return [];

    return (
      LEADERSHIP_ROLES[unit.unitLevel as keyof typeof LEADERSHIP_ROLES] || []
    );
  };

  // Handle adding a new assignment
  const handleAddAssignment = () => {
    if (newAssignment.unitId === 0) {
      toast({
        title: "Error",
        description: "Please select a unit for the new assignment",
        variant: "destructive",
      });
      return;
    }

    // Check if an assignment for this unit already exists
    const existingAssignment = assignments.find(
      (a) => a.unitId === newAssignment.unitId && !a.endDate
    );

    if (existingAssignment) {
      toast({
        title: "Assignment already exists",
        description: "User is already assigned to this unit",
        variant: "destructive",
      });
      return;
    }

    // Add new assignment
    const assignmentToAdd: UnitAssignment = {
      ...newAssignment,
      isNew: true,
      startDate: new Date().toISOString(),
    };

    setAssignments([...assignments, assignmentToAdd]);

    // Reset new assignment form
    setNewAssignment({
      unitId: 0,
      assignmentType: ASSIGNMENT_TYPES.ATTACHED,
      leadershipRole: null,
    });

    setIsAddingNew(false);

    toast({
      title: "Assignment added",
      description: "The new assignment has been added but not saved yet",
    });
  };

  // Handle making an assignment primary
  const handleMakePrimary = (index: number) => {
    const newAssignments = [...assignments];

    // Update all assignments to non-primary
    newAssignments.forEach((assignment, i) => {
      if (assignment.assignmentType === ASSIGNMENT_TYPES.PRIMARY) {
        newAssignments[i] = {
          ...assignment,
          assignmentType: ASSIGNMENT_TYPES.ATTACHED,
        };
      }
    });

    // Update selected assignment to primary
    newAssignments[index] = {
      ...newAssignments[index],
      assignmentType: ASSIGNMENT_TYPES.PRIMARY,
    };

    // Update primary unit ID
    setSelectedUnitId(newAssignments[index].unitId);

    setAssignments(newAssignments);

    toast({
      title: "Primary unit updated",
      description:
        "The primary unit assignment has been updated but not saved yet",
    });
  };

  // Handle removing an assignment
  const handleRemoveAssignment = (index: number) => {
    // Cannot remove primary assignment
    if (assignments[index].assignmentType === ASSIGNMENT_TYPES.PRIMARY) {
      toast({
        title: "Cannot remove primary assignment",
        description: "You must keep at least one primary unit assignment",
        variant: "destructive",
      });
      return;
    }

    const newAssignments = [...assignments];

    // If it's a new assignment (not yet saved), just remove it
    if (newAssignments[index].isNew) {
      newAssignments.splice(index, 1);
    } else {
      // For existing assignments, mark as ended
      newAssignments[index] = {
        ...newAssignments[index],
        endDate: new Date().toISOString(),
      };
    }

    setAssignments(newAssignments);

    toast({
      title: "Assignment removed",
      description:
        "The assignment has been marked for removal but not saved yet",
    });
  };

  // Handle unit selection change for new assignment
  const handleNewUnitChange = (value: string) => {
    const unitId = parseInt(value);
    setNewAssignment({
      ...newAssignment,
      unitId,
      leadershipRole: "none", // Reset leadership role when unit changes
    });
  };

  // Mutation to create a new unit assignment
  const createAssignmentMutation = useMutation({
    mutationFn: async (assignment: Omit<UnitAssignment, "id">) => {
      const response = await fetch(`/api/users/${user.id}/unit-assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignment),
      });

      if (!response.ok) {
        throw new Error("Failed to create unit assignment");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Unit assignment created",
        description: `New assignment has been created for ${user.name}`,
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/users/${user.id}/unit-assignments`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      console.error("Error creating unit assignment:", error);
      toast({
        title: "Error",
        description: "Failed to create unit assignment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation to update an existing unit assignment
  const updateAssignmentMutation = useMutation({
    mutationFn: async ({
      assignmentId,
      updates,
    }: {
      assignmentId: number;
      updates: Partial<UnitAssignment>;
    }) => {
      const response = await fetch(
        `/api/users/${user.id}/unit-assignments/${assignmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update unit assignment");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Assignment updated",
        description: `Unit assignment has been updated for ${user.name}`,
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/users/${user.id}/unit-assignments`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      console.error("Error updating unit assignment:", error);
      toast({
        title: "Error",
        description: "Failed to update unit assignment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation to delete a unit assignment
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      const response = await fetch(
        `/api/users/${user.id}/unit-assignments/${assignmentId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete unit assignment");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Assignment removed",
        description: `Unit assignment has been removed for ${user.name}`,
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/users/${user.id}/unit-assignments`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      console.error("Error deleting unit assignment:", error);
      toast({
        title: "Error",
        description: "Failed to remove unit assignment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Save all assignment changes
  const saveAssignments = async () => {
    // Find the primary assignment
    const primaryAssignment = assignments.find(
      (a) => a.assignmentType === ASSIGNMENT_TYPES.PRIMARY && !a.endDate
    );

    if (!primaryAssignment) {
      toast({
        title: "Error",
        description: "User must have one primary unit assignment",
        variant: "destructive",
      });
      return;
    }

    // Process any new assignments that need to be created
    const newAssignments = assignments.filter((a) => a.isNew && !a.endDate);

    // Process any existing assignments that need to be updated
    const assignmentsToUpdate = assignments.filter((a) => !a.isNew && a.id);

    // Process any assignments that need to be ended
    const assignmentsToEnd = assignments.filter((a) => a.endDate && a.id);

    try {
      // Create new assignments
      for (const assignment of newAssignments) {
        const { unitId, assignmentType, leadershipRole } = assignment;
        await createAssignmentMutation.mutate({
          unitId,
          assignmentType,
          leadershipRole: leadershipRole === "none" ? null : leadershipRole,
        });
      }

      // Update existing assignments if needed
      for (const assignment of assignmentsToUpdate) {
        // Skip if no ID (shouldn't happen but type safety check)
        if (!assignment.id) continue;

        await updateAssignmentMutation.mutate({
          assignmentId: assignment.id,
          updates: {
            assignmentType: assignment.assignmentType,
            leadershipRole:
              assignment.leadershipRole === "none"
                ? null
                : assignment.leadershipRole,
          },
        });
      }

      // End assignments that need to be removed
      for (const assignment of assignmentsToEnd) {
        if (!assignment.id) continue;
        await deleteAssignmentMutation.mutate(assignment.id);
      }

      // Always update the legacy unitId field on the user record for backward compatibility
      updateUserMutation.mutate({
        userId: user.id,
        unitId: primaryAssignment.unitId,
      });

      // Show success and close dialog
      toast({
        title: "All assignments updated",
        description: "Unit assignments have been successfully saved",
      });

      // Refresh data and close dialog
      queryClient.invalidateQueries({
        queryKey: [`/api/users/${user.id}/unit-assignments`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving assignments:", error);
      toast({
        title: "Error",
        description: "There was an error saving some assignments",
        variant: "destructive",
      });
    }
  };

  // Get unit name by ID
  const getUnitName = (unitId: number): string => {
    const unit = availableUnits.find((u) => u.id === unitId);
    return unit ? unit.name : "Unknown Unit";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manage Unit Assignments</DialogTitle>
          <DialogDescription>
            Manage {user.name}'s unit assignments and leadership roles.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="assignments" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assignments">Unit Assignments</TabsTrigger>
            <TabsTrigger value="user-info">User Info</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-4 pt-4">
            {/* Current assignments */}
            <div className="space-y-4">
              {assignments
                .filter((a) => !a.endDate)
                .map((assignment, index) => (
                  <Card
                    key={index}
                    className={`${
                      assignment.assignmentType === ASSIGNMENT_TYPES.PRIMARY
                        ? "border-primary"
                        : ""
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-md">
                          {getUnitName(assignment.unitId)}
                        </CardTitle>
                        <Badge
                          variant={
                            assignment.assignmentType ===
                            ASSIGNMENT_TYPES.PRIMARY
                              ? "default"
                              : "outline"
                          }
                        >
                          {assignment.assignmentType}
                        </Badge>
                      </div>
                      <CardDescription>
                        {assignment.leadershipRole || "Regular Member"}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-0 flex justify-between">
                      {assignment.assignmentType !==
                        ASSIGNMENT_TYPES.PRIMARY && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMakePrimary(index)}
                        >
                          Make Primary
                        </Button>
                      )}
                      {assignment.assignmentType !==
                        ASSIGNMENT_TYPES.PRIMARY && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveAssignment(index)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      )}
                      {assignment.assignmentType ===
                        ASSIGNMENT_TYPES.PRIMARY && (
                        <div className="flex-1"></div>
                      )}
                    </CardFooter>
                  </Card>
                ))}

              {/* Add new assignment section */}
              {isAddingNew ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md">New Assignment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-2">
                    <div className="space-y-1">
                      <Label htmlFor="new-unit">Unit</Label>
                      <Select
                        value={newAssignment.unitId.toString() || "0"}
                        onValueChange={handleNewUnitChange}
                      >
                        <SelectTrigger id="new-unit">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0" disabled>
                            Select a unit
                          </SelectItem>
                          {availableUnits.map((unit) => (
                            <SelectItem
                              key={unit.id}
                              value={unit.id.toString()}
                            >
                              {unit.name} ({unit.unitLevel})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="new-type">Assignment Type</Label>
                      <Select
                        value={newAssignment.assignmentType}
                        onValueChange={(value) =>
                          setNewAssignment({
                            ...newAssignment,
                            assignmentType: value,
                          })
                        }
                      >
                        <SelectTrigger id="new-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ASSIGNMENT_TYPES.ATTACHED}>
                            Attached
                          </SelectItem>
                          <SelectItem value={ASSIGNMENT_TYPES.TEMPORARY}>
                            Temporary
                          </SelectItem>
                          <SelectItem value={ASSIGNMENT_TYPES.DUAL_HATTED}>
                            Dual-Hatted
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {newAssignment.unitId > 0 && (
                      <div className="space-y-1">
                        <Label htmlFor="new-role">
                          Leadership Role (Optional)
                        </Label>
                        <Select
                          value={newAssignment.leadershipRole || "none"}
                          onValueChange={(value) =>
                            setNewAssignment({
                              ...newAssignment,
                              leadershipRole: value === "none" ? null : value,
                            })
                          }
                        >
                          <SelectTrigger id="new-role">
                            <SelectValue placeholder="None (Regular member)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              None (Regular member)
                            </SelectItem>
                            {getLeadershipRolesForUnit(
                              newAssignment.unitId
                            ).map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsAddingNew(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddAssignment}
                      disabled={newAssignment.unitId === 0}
                    >
                      Add Assignment
                    </Button>
                  </CardFooter>
                </Card>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsAddingNew(true)}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Unit Assignment
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="user-info" className="pt-4">
            <div className="space-y-4">
              <div className="grid gap-2">
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-semibold">{user.name}</h3>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>
                      <strong>Rank:</strong> {user.rank}
                    </p>
                    <p>
                      <strong>Role:</strong> {user.role}
                    </p>
                    <p>
                      <strong>Primary Unit:</strong>{" "}
                      {getUnitName(selectedUnitId)}
                    </p>
                    {user.bio && (
                      <p>
                        <strong>Bio:</strong> {user.bio}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between pt-4">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={saveAssignments}
            disabled={updateUserMutation.isPending}
          >
            {updateUserMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
