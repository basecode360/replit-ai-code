import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "./lib/queryClient";
import { Unit, User } from "@shared/schema";
import { useAuth } from "./lib/auth-provider";

// Type for hierarchy constants
interface HierarchyConstants {
  roles: Record<string, string>;
  unitLevels: Record<string, string>;
  hierarchy: Record<string, string[]>;
}

/**
 * Hook to manage military hierarchy and access controls
 */
export function useHierarchy() {
  const { user } = useAuth();

  // Get hierarchy constants
  const { data: constants, isLoading: isLoadingConstants } =
    useQuery<HierarchyConstants>({
      queryKey: ["/api/hierarchy/constants"],
      queryFn: getQueryFn({ on401: "throw" }),
      enabled: !!user,
    });

  // Get units accessible to the current user
  const { data: accessibleUnits = [], isLoading: isLoadingUnits } = useQuery<
    Unit[]
  >({
    queryKey: ["/api/hierarchy/accessible-units"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  // Get users accessible to the current user
  const { data: accessibleUsers = [], isLoading: isLoadingUsers } = useQuery<
    User[]
  >({
    queryKey: ["/api/hierarchy/accessible-users"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  // Check if loading any hierarchy data
  const isLoading = isLoadingConstants || isLoadingUnits || isLoadingUsers;

  /**
   * Determines if the current user can access the specified unit
   */
  const canAccessUnit = (unitId: number): boolean => {
    if (!user || !accessibleUnits) {
      return false;
    }

    return accessibleUnits.some((unit) => unit.id === unitId);
  };

  /**
   * Determines if the current user can access the specified user
   */
  const canAccessUser = (userId: number): boolean => {
    if (!user || !accessibleUsers) {
      return false;
    }

    return accessibleUsers.some((u) => u.id === userId);
  };

  /**
   * Get direct subordinate units for a given unit
   */
  const getSubordinateUnits = (unitId: number): Unit[] => {
    if (!accessibleUnits) {
      return [];
    }

    return accessibleUnits.filter((unit) => unit.parentId === unitId);
  };

  /**
   * Get users assigned to a specific unit
   */
  const getUsersInUnit = (unitId: number): User[] => {
    if (!accessibleUsers) {
      return [];
    }

    return accessibleUsers.filter((user) => user.unitId === unitId);
  };

  /**
   * Gets the highest role in a unit
   */
  const getUnitLeader = (unitId: number): User | undefined => {
    const unitUsers = getUsersInUnit(unitId);
    if (!unitUsers.length || !constants) {
      return undefined;
    }

    // Role priority (higher index = higher authority)
    const rolePriority = Object.values(constants.roles);

    return unitUsers.reduce((leader, currentUser) => {
      const leaderRoleIndex = rolePriority.indexOf(leader.role);
      const currentRoleIndex = rolePriority.indexOf(currentUser.role);

      return currentRoleIndex > leaderRoleIndex ? currentUser : leader;
    }, unitUsers[0]);
  };

  return {
    constants,
    accessibleUnits,
    accessibleUsers,
    isLoading,
    canAccessUnit,
    canAccessUser,
    getSubordinateUnits,
    getUsersInUnit,
    getUnitLeader,
  };
}
