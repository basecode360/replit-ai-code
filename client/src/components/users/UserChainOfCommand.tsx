import React from "react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, Unit, MilitaryRoles, UnitLevels } from "../../../../shared/schema"
import { getQueryFn } from "../../lib/queryClient";
import { useAuth } from "../../lib/auth-provider";
import { useHierarchy } from "../../hooks/use-hierarchy";

import {
  Shield,
  ChevronRight,
  Users,
  User as UserIcon,
  Building,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../components/ui/tooltip";

interface CommandChainNodeProps {
  user?: User;
  unit?: Unit;
  isHighlighted?: boolean;
  role?: string;
  isUpward?: boolean;
  description?: string;
}

/**
 * Displays a single node in the chain of command
 */
function CommandChainNode({
  user,
  unit,
  isHighlighted = false,
  role,
  isUpward = false,
  description,
}: CommandChainNodeProps) {
  return (
    <div
      className={`
        flex items-center p-3 rounded-md gap-3 border-l-4
        ${
          isHighlighted
            ? "bg-primary/10 border-l-primary"
            : "bg-card border-l-transparent hover:bg-accent/10"
        }
        ${isUpward ? "mb-2" : "mt-2"}
      `}
    >
      {isUpward ? (
        <ArrowUp className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ArrowDown className="h-4 w-4 text-muted-foreground" />
      )}

      {user && (
        <>
          <Avatar className="h-8 w-8">
            <AvatarFallback>{user.name.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <Badge variant="outline" className="text-xs">
                {user.rank}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{role || user.role}</p>
          </div>
          <UserIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </>
      )}

      {unit && (
        <>
          <div className="w-8 h-8 rounded-md flex items-center justify-center bg-muted">
            <Building className="h-4 w-4 text-foreground/70" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{unit.name}</p>
              <Badge variant="outline" className="text-xs">
                {unit.unitLevel}
              </Badge>
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </>
      )}
    </div>
  );
}

interface UserChainOfCommandProps {
  userId?: number; // If not provided, uses the current user
}

/**
 * Displays a user's position in the military hierarchy
 * Shows their chain of command both upward and downward
 */
export default function UserChainOfCommand({
  userId,
}: UserChainOfCommandProps) {
  const { user: currentUser } = useAuth();
  const {
    accessibleUnits,
    accessibleUsers,
    getUsersInUnit,
    getUnitLeader,
    isLoading,
  } = useHierarchy();

  // Target user is either the specified user or the current user - modified type to avoid errors
  const [targetUser, setTargetUser] = useState<
    | {
        id: number;
        username: string;
        name: string;
        rank: string;
        role: string;
        unitId: number;
        bio: string | null;
      }
    | undefined
  >();
  // Unit the user belongs to
  const [userUnit, setUserUnit] = useState<Unit | undefined>();
  // Superior units in the chain of command
  const [superiorUnits, setSuperiorUnits] = useState<Unit[]>([]);
  // Units under the user's command
  const [subordinateUnits, setSubordinateUnits] = useState<Unit[]>([]);
  // Direct reports (users under direct command)
  const [directReports, setDirectReports] = useState<User[]>([]);

  // Find superior units (up the chain of command)
  const findSuperiorUnits = (unit?: Unit): Unit[] => {
    if (!unit || !unit.parentId) return [];

    const parentUnit = accessibleUnits.find((u) => u.id === unit.parentId);
    if (!parentUnit) return [];

    return [parentUnit, ...findSuperiorUnits(parentUnit)];
  };

  // Find subordinate units (down the chain of command)
  const findSubordinateUnits = (unitId: number): Unit[] => {
    return accessibleUnits.filter((u) => u.parentId === unitId);
  };

  // Find users who report directly to this user
  const findDirectReports = (unit: Unit, userRole: string): User[] => {
    // Get all users in the unit
    const unitMembers = getUsersInUnit(unit.id);

    // Subordinates are users with lower ranking roles
    return unitMembers.filter((u) => isSubordinateRole(userRole, u.role));
  };

  // Check if one role is subordinate to another
  const isSubordinateRole = (
    superiorRole: string,
    potentialSubRole: string
  ): boolean => {
    // Order of roles from highest to lowest
    const roleRanking = [
      MilitaryRoles.COMMANDER,
      MilitaryRoles.XO,
      MilitaryRoles.FIRST_SERGEANT,
      MilitaryRoles.PLATOON_LEADER,
      MilitaryRoles.PLATOON_SERGEANT,
      MilitaryRoles.SQUAD_LEADER,
      MilitaryRoles.TEAM_LEADER,
      MilitaryRoles.SOLDIER,
    ] as const;

    // We need to cast the roles as any to match against the enum values
    const superiorIndex = roleRanking.indexOf(superiorRole as any);
    const subIndex = roleRanking.indexOf(potentialSubRole as any);

    // Lower index means higher rank
    return superiorIndex < subIndex;
  };

  // Update chain of command data when dependencies change
  useEffect(() => {
    if (isLoading || !accessibleUnits.length || !accessibleUsers.length) {
      return;
    }

    // Get the user to display
    const user = userId
      ? accessibleUsers.find((u) => u.id === userId)
      : currentUser;

    if (!user) return;

    // Clone only the needed fields to avoid type errors
    // Match the type we defined in the useState hook
    setTargetUser(() => ({
      id: user.id,
      username: user.username,
      name: user.name,
      rank: user.rank,
      role: user.role,
      unitId: user.unitId,
      bio: user.bio || null,
    }));

    // Find the user's unit
    const unit = accessibleUnits.find((u) => u.id === user.unitId);
    setUserUnit(unit);

    if (unit) {
      // Find units up the chain
      setSuperiorUnits(findSuperiorUnits(unit));

      // Find units down the chain (if the user has a leadership role)
      if (user.role !== MilitaryRoles.SOLDIER) {
        setSubordinateUnits(findSubordinateUnits(unit.id));
        setDirectReports(findDirectReports(unit, user.role));
      }
    }
  }, [userId, currentUser, accessibleUnits, accessibleUsers, isLoading]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-10 w-10 rounded-full bg-muted mb-2"></div>
              <div className="h-3 w-32 bg-muted rounded mb-1"></div>
              <div className="h-2 w-24 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!targetUser || !userUnit) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-4 text-muted-foreground">
            <Shield className="mx-auto h-10 w-10 mb-2 text-muted-foreground/50" />
            <p>User information unavailable</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="mr-2 h-5 w-5" />
          Chain of Command
        </CardTitle>
        <CardDescription>
          View position in the military hierarchy
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {/* Superior units (up the chain) */}
        {superiorUnits.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
              <ArrowUp className="mr-1 h-3 w-3" />
              Superior Chain
            </h3>

            {superiorUnits.map((unit, index) => {
              const leader = getUnitLeader(unit.id);
              return (
                <CommandChainNode
                  key={unit.id}
                  unit={unit}
                  user={leader}
                  isUpward={true}
                  description={
                    leader ? `Commanded by ${leader.rank} ${leader.name}` : ""
                  }
                />
              );
            })}
          </div>
        )}

        {/* Current user and their unit */}
        <div className="my-4 p-4 bg-primary/20 rounded-lg border border-primary/50">
          <h3 className="text-sm font-medium mb-2 flex items-center">
            <Shield className="mr-1 h-4 w-4" />
            Current Position
          </h3>

          <div className="flex items-center gap-3 p-2">
            <Avatar className="h-12 w-12">
              <AvatarFallback>{targetUser.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-base font-medium">{targetUser.name}</p>
                <Badge variant="secondary" className="text-xs">
                  {targetUser.rank}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-background">
                  {targetUser.role}
                </Badge>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <Badge variant="outline" className="bg-background">
                  {userUnit.name} ({userUnit.unitLevel})
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Direct reports (if any) */}
        {directReports.length > 0 && (
          <div className="mt-4 mb-2">
            <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
              <ArrowDown className="mr-1 h-3 w-3" />
              Direct Reports ({directReports.length})
            </h3>

            {directReports.map((user) => (
              <CommandChainNode key={user.id} user={user} isUpward={false} />
            ))}
          </div>
        )}

        {/* Subordinate units (down the chain) */}
        {subordinateUnits.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
              <ArrowDown className="mr-1 h-3 w-3" />
              Subordinate Units ({subordinateUnits.length})
            </h3>

            {subordinateUnits.map((unit) => {
              const leader = getUnitLeader(unit.id);
              const memberCount = getUsersInUnit(unit.id).length;

              return (
                <CommandChainNode
                  key={unit.id}
                  unit={unit}
                  isUpward={false}
                  description={
                    leader
                      ? `Led by ${leader.rank} ${leader.name} - ${memberCount} members`
                      : `${memberCount} members`
                  }
                />
              );
            })}
          </div>
        )}

        {/* No subordinates case */}
        {directReports.length === 0 && subordinateUnits.length === 0 && (
          <div className="mt-4 text-center py-3 text-muted-foreground bg-muted/30 rounded-md">
            <Users className="mx-auto h-5 w-5 mb-1" />
            <p className="text-sm">No subordinates in chain of command</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
