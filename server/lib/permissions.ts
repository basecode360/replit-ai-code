import {
  User,
  Unit,
  MilitaryRoles,
  UnitLevels,
  MilitaryHierarchy,
} from "@shared/schema";
import { storage } from "../storage";

/**
 * Determines if a user can access a specific unit based on military hierarchy
 *
 * @param user The user attempting to access
 * @param targetUnit The unit being accessed
 * @returns Boolean indicating if access is allowed
 */
export async function canUserAccessUnit(
  user: User,
  targetUnit: Unit
): Promise<boolean> {
  // Special case for system admin users who were specifically created as system admins
  // Username 'admin' is the default system admin
  if (user.role === MilitaryRoles.ADMIN && user.username === "admin") {
    console.log(
      `User ${user.username} (ID: ${user.id}) is a system admin with global access`
    );
    return true;
  }

  // If user is part of the target unit, they can access it
  if (user.unitId === targetUnit.id) {
    return true;
  }

  // Get the user's assigned unit
  const userUnit = await storage.getUnit(user.unitId);
  if (!userUnit) {
    return false;
  }

  // Get the accessible unit levels based on the user's role
  // Use explicit key lookup since role values might not match exactly to object keys
  let accessibleLevels: string[] = [];

  // Find the corresponding key in MilitaryRoles
  for (const [key, value] of Object.entries(MilitaryRoles)) {
    if (value === user.role) {
      // Convert the role string to a proper lookup key
      // This avoids TypeScript errors with indexing and handles readonly arrays
      const levels = MilitaryHierarchy[value as any] || [];
      accessibleLevels = Array.isArray(levels) ? [...levels] : [];
      break;
    }
  }

  // Default to no access if role not found
  if (accessibleLevels.length === 0) {
    console.warn(`No defined hierarchy for role: ${user.role}`);
  }

  // If user's role doesn't have access to this unit level, deny access
  if (!accessibleLevels.includes(targetUnit.unitLevel as any)) {
    return false;
  }

  // Determine if target unit is in the user's chain of command
  return isUnitInChainOfCommand(userUnit, targetUnit);
}

/**
 * Determines if a target unit is in the chain of command of a source unit
 *
 * @param sourceUnit The higher-level unit
 * @param targetUnit The unit being checked
 * @returns Boolean indicating if target is in the chain of command
 */
async function isUnitInChainOfCommand(
  sourceUnit: Unit,
  targetUnit: Unit
): Promise<boolean> {
  // If units are the same, they're in the same chain
  if (sourceUnit.id === targetUnit.id) {
    return true;
  }

  // If target is directly under source (parent-child relationship)
  if (targetUnit.parentId === sourceUnit.id) {
    return true;
  }

  // If target is higher in hierarchy than source, not in chain of command
  if (
    getUnitHierarchyLevel(sourceUnit.unitLevel) <
    getUnitHierarchyLevel(targetUnit.unitLevel)
  ) {
    return false;
  }

  // If target has no parent, it's not in the chain of command
  if (!targetUnit.parentId) {
    return false;
  }

  // Recursively check if target's parent is in chain of command
  const parentUnit = await storage.getUnit(targetUnit.parentId);
  if (!parentUnit) {
    return false;
  }

  return isUnitInChainOfCommand(sourceUnit, parentUnit);
}

/**
 * Gets the numeric hierarchy level for a unit level
 * Higher number = higher in the chain of command
 */
function getUnitHierarchyLevel(unitLevel: string): number {
  switch (unitLevel) {
    case UnitLevels.TEAM:
      return 1;
    case UnitLevels.SQUAD:
      return 2;
    case UnitLevels.PLATOON:
      return 3;
    case UnitLevels.COMPANY:
      return 4;
    case UnitLevels.BATTALION:
      return 5;
    default:
      return 0;
  }
}

/**
 * Gets all units a user can access
 *
 * @param userId ID of the user
 * @returns Array of units the user can access
 */
export async function getAccessibleUnits(userId: number): Promise<Unit[]> {
  const user = await storage.getUser(userId);
  if (!user) {
    return [];
  }

  // System admin (username 'admin') can access all units
  if (user.role === MilitaryRoles.ADMIN && user.username === "admin") {
    console.log(`System admin ${user.username} - returning all units`);
    return storage.getAllUnits();
  }

  // For users who created their own units (role = Commander)
  // They should only see their own unit and subunits
  if (user.role === MilitaryRoles.COMMANDER) {
    console.log(
      `Unit commander ${user.username} - restricting to own unit hierarchy`
    );

    // Get user's own unit
    const userUnit = await storage.getUnit(user.unitId);
    if (!userUnit) {
      return [];
    }

    // Start with the user's own unit
    const accessibleUnits: Unit[] = [userUnit];

    // Get all subunits (recursive check for children)
    const allUnits = await storage.getAllUnits();
    const findSubunits = (parentId: number) => {
      const subunits = allUnits.filter((unit) => unit.parentId === parentId);
      subunits.forEach((subunit) => {
        accessibleUnits.push(subunit);
        findSubunits(subunit.id); // Recursively find subunits
      });
    };

    findSubunits(user.unitId);
    return accessibleUnits;
  }

  // For regular users, check unit-by-unit permissions
  const allUnits = await storage.getAllUnits();
  const accessibleUnits: Unit[] = [];

  for (const unit of allUnits) {
    if (await canUserAccessUnit(user, unit)) {
      accessibleUnits.push(unit);
    }
  }

  return accessibleUnits;
}

/**
 * Gets all users a specific user can access based on role and hierarchy
 *
 * @param userId ID of the user
 * @returns Array of users the specified user can access
 */
export async function getAccessibleUsers(userId: number): Promise<User[]> {
  const user = await storage.getUser(userId);
  if (!user) {
    return [];
  }

  const accessibleUnits = await getAccessibleUnits(userId);
  const accessibleUnitIds = accessibleUnits.map((unit) => unit.id);

  // Get all users from accessible units
  const allUsers = await Promise.all(
    accessibleUnitIds.map((unitId) => storage.getUsersByUnit(unitId))
  );

  // Flatten and remove duplicates
  const flattenedUsers = allUsers.flat();
  const uniqueUsers = flattenedUsers.filter(
    (user, index, self) => index === self.findIndex((u) => u.id === user.id)
  );

  return uniqueUsers;
}
