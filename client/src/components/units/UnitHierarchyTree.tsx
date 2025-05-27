import React, { useState } from "react";
import { Unit, User, UnitLevels } from "@shared/schema";
import { ChevronDown, ChevronRight, Users, Building, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useHierarchy } from "@/hooks/use-hierarchy";

interface UnitNodeProps {
  unit: Unit;
  leader?: User;
  members: User[];
  subunits: Unit[];
  level: number;
  canManage?: boolean;
  onSelect?: (unit: Unit) => void;
}

/**
 * Displays a single unit node in the hierarchy tree
 */
function UnitNode({ 
  unit, 
  leader, 
  members, 
  subunits, 
  level, 
  canManage = false,
  onSelect
}: UnitNodeProps) {
  const [expanded, setExpanded] = useState(level <= 1); // Auto-expand top levels
  
  // Generate color based on unit level
  const getBadgeColor = (unitLevel: string) => {
    switch(unitLevel) {
      case UnitLevels.TEAM:
        return "bg-blue-100 text-blue-800 border-blue-300";
      case UnitLevels.SQUAD:
        return "bg-green-100 text-green-800 border-green-300";
      case UnitLevels.PLATOON:
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case UnitLevels.COMPANY:
        return "bg-red-100 text-red-800 border-red-300";
      case UnitLevels.BATTALION:
        return "bg-purple-100 text-purple-800 border-purple-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };
  
  return (
    <div className="ml-4 mt-2">
      <div 
        className={cn(
          "flex items-center p-2 rounded-md border transition-colors",
          canManage ? "border-primary/50 hover:border-primary cursor-pointer" : "border-border",
        )}
        onClick={() => onSelect && canManage && onSelect(unit)}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-0 mr-1"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {subunits.length > 0 ? (
            expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <div className="w-4" />
          )}
        </Button>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{unit.name}</span>
            <Badge className={cn("ml-1", getBadgeColor(unit.unitLevel))}>
              {unit.unitLevel}
            </Badge>
          </div>
          
          {leader && (
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Shield className="h-3 w-3" /> 
              {leader.name} ({leader.rank}) - {leader.role}
            </div>
          )}
        </div>
        
        <Badge variant="outline" className="ml-auto">
          <Users className="h-3 w-3 mr-1" /> 
          {members.length}
        </Badge>
      </div>
      
      {expanded && subunits.length > 0 && (
        <div className="border-l border-border pl-4 py-2">
          {subunits.map((subunit) => (
            <UnitTreeNode 
              key={subunit.id} 
              unit={subunit} 
              level={level + 1}
              canManage={canManage}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface UnitTreeNodeProps {
  unit: Unit;
  level: number;
  canManage?: boolean;
  onSelect?: (unit: Unit) => void;
}

/**
 * Connected unit node that fetches its own data
 */
function UnitTreeNode({ unit, level, canManage, onSelect }: UnitTreeNodeProps) {
  const { accessibleUnits, accessibleUsers, getSubordinateUnits, getUsersInUnit, getUnitLeader } = useHierarchy();
  
  // Get data for this node
  const subunits = getSubordinateUnits(unit.id);
  const members = getUsersInUnit(unit.id);
  const leader = getUnitLeader(unit.id);
  
  return (
    <UnitNode
      unit={unit}
      leader={leader}
      members={members}
      subunits={subunits}
      level={level}
      canManage={canManage}
      onSelect={onSelect}
    />
  );
}

interface UnitHierarchyTreeProps {
  rootUnitId?: number;
  canManage?: boolean;
  onSelectUnit?: (unit: Unit) => void;
}

/**
 * Displays a hierarchical tree of military units
 */
export default function UnitHierarchyTree({ 
  rootUnitId, 
  canManage = false,
  onSelectUnit 
}: UnitHierarchyTreeProps) {
  const { accessibleUnits, isLoading } = useHierarchy();
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center p-6">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-8 w-8 rounded-full bg-muted mb-2" />
              <div className="h-2 w-24 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // If rootUnitId is provided, find that unit and its parent chain
  // Otherwise, show all top-level units (those without parents)
  let rootUnits: Unit[] = [];
  
  if (rootUnitId) {
    // Find the user's assigned unit
    const userUnit = accessibleUnits.find(unit => unit.id === rootUnitId);
    
    if (userUnit) {
      // If user unit has a parent, find the top-most parent in the chain
      if (userUnit.parentId) {
        // Build the parent chain
        let currentUnit = userUnit;
        let parentChain: Unit[] = [currentUnit];
        
        // Loop up the parent chain until we reach a top-level unit
        while (currentUnit.parentId) {
          const parentUnit = accessibleUnits.find(u => u.id === currentUnit.parentId);
          if (parentUnit) {
            parentChain.unshift(parentUnit); // Add to front of array
            currentUnit = parentUnit;
          } else {
            break; // Break if parent not found
          }
        }
        
        // The first unit is the top-level parent
        if (parentChain.length > 0) {
          rootUnits = [parentChain[0]];
        } else {
          // Fallback to just showing the user's unit
          rootUnits = [userUnit];
        }
      } else {
        // Unit has no parent, it's already a top-level unit
        rootUnits = [userUnit];
      }
    }
  } else {
    // No rootUnitId, show all top-level units
    rootUnits = accessibleUnits.filter(unit => !unit.parentId);
  }
  
  if (rootUnits.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-muted-foreground">
          No units available to display
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="font-medium mb-2 flex items-center">
          <Building className="mr-2 h-4 w-4" />
          Military Unit Structure
          {canManage && (
            <Badge variant="outline" className="ml-2">
              Management Enabled
            </Badge>
          )}
        </div>
        <Separator className="mb-4" />
        
        {rootUnits.map(unit => (
          <UnitTreeNode 
            key={unit.id} 
            unit={unit} 
            level={0}
            canManage={canManage}
            onSelect={onSelectUnit}
          />
        ))}
      </CardContent>
    </Card>
  );
}