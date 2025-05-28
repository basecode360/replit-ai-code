import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, Unit } from "@shared/schema";
import { apiRequest } from "./lib/queryClient";
import { useAuth } from "./lib/auth-provider";
import { useHierarchy } from "./hooks/use-hierarchy";
import { Link, useLocation } from "wouter";
import {
  Loader2,
  Search,
  User as UserIcon,
  Clipboard,
  Shield,
  ArrowUpRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Avatar, AvatarFallback } from "./components/ui/avatar";
import { Badge } from "./components/ui/badge";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { ScrollArea } from "./components/ui/scroll-area";

export default function UnitRoster() {
  const { user } = useAuth();
  const { accessibleUnits } = useHierarchy();
  const [, setLocation] = useLocation();
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Initialize selectedUnitId with user's unit or first accessible unit
  useEffect(() => {
    if (!selectedUnitId && user) {
      setSelectedUnitId(user.unitId);
    } else if (
      !selectedUnitId &&
      accessibleUnits &&
      accessibleUnits.length > 0
    ) {
      setSelectedUnitId(accessibleUnits[0].id);
    }
  }, [user, accessibleUnits, selectedUnitId]);

  // Fetch users from the selected unit
  const {
    data: unitMembers = [],
    isLoading: membersLoading,
    error: membersError,
  } = useQuery({
    queryKey: ["/api/units", selectedUnitId, "members"],
    queryFn: async () => {
      if (!selectedUnitId) return [];
      const res = await apiRequest(
        "GET",
        `/api/units/${selectedUnitId}/members`
      );
      return await res.json();
    },
    enabled: !!selectedUnitId,
  });

  // Fetch selected unit details
  const { data: selectedUnit, isLoading: unitLoading } = useQuery({
    queryKey: ["/api/units", selectedUnitId],
    queryFn: async () => {
      if (!selectedUnitId) return null;
      const res = await apiRequest("GET", `/api/units/${selectedUnitId}`);
      return await res.json();
    },
    enabled: !!selectedUnitId,
  });

  // Filter unit members based on search query
  const filteredMembers = unitMembers.filter((member: User) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      member.name?.toLowerCase().includes(query) ||
      member.rank?.toLowerCase().includes(query) ||
      member.role?.toLowerCase().includes(query) ||
      member.username?.toLowerCase().includes(query)
    );
  });

  // Sort members by rank and role
  const sortedMembers = [...filteredMembers].sort((a: User, b: User) => {
    // First sort by role (leadership roles first)
    if (a.role !== b.role) {
      const leadershipRoles = [
        "commander",
        "xo",
        "first sergeant",
        "platoon leader",
        "platoon sergeant",
        "squad leader",
        "team leader",
      ];
      const aRoleIndex = leadershipRoles.indexOf(a.role.toLowerCase());
      const bRoleIndex = leadershipRoles.indexOf(b.role.toLowerCase());

      if (aRoleIndex !== -1 && bRoleIndex !== -1) {
        return aRoleIndex - bRoleIndex; // Lower index = higher rank
      } else if (aRoleIndex !== -1) {
        return -1; // a has a leadership role, b doesn't
      } else if (bRoleIndex !== -1) {
        return 1; // b has a leadership role, a doesn't
      }
    }

    // Then sort by name
    return a.name.localeCompare(b.name);
  });

  const loading = membersLoading || unitLoading;
  const error = membersError;

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center">
          <Shield className="mr-2 h-5 w-5" />
          Unit Roster
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Unit Selection Sidebar */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Units</CardTitle>
            <CardDescription>Select a unit to view its members</CardDescription>
          </CardHeader>
          <CardContent>
            {accessibleUnits && accessibleUnits.length > 0 ? (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-2">
                  {accessibleUnits.map((unit) => (
                    <div
                      key={unit.id}
                      className={`p-2 rounded-md cursor-pointer transition-colors ${
                        selectedUnitId === unit.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedUnitId(unit.id)}
                    >
                      <div className="font-medium">{unit.name}</div>
                      <div className="text-xs opacity-80">{unit.unitLevel}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                {accessibleUnits ? "No units available" : "Loading units..."}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unit Members List */}
        <Card className="md:col-span-3">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>
                  {selectedUnit ? selectedUnit.name : "Select a Unit"}
                </CardTitle>
                <CardDescription>
                  {selectedUnit
                    ? `${selectedUnit.unitLevel} • ${filteredMembers.length} members`
                    : "No unit selected"}
                </CardDescription>
              </div>
            </div>
            <div className="mt-4 relative">
              <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, rank, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-muted-foreground">
                Error loading members
              </div>
            ) : sortedMembers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedMembers.map((member: User) => (
                  <div
                    key={member.id}
                    className="border rounded-lg p-4 hover:border-primary cursor-pointer transition-colors"
                    onClick={() => setLocation(`/users/${member.id}`)}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {member.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {member.username}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="secondary">{member.rank}</Badge>
                      <Badge variant="outline">{member.role}</Badge>
                    </div>
                    <div className="mt-4 text-right">
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/users/${member.id}`}>
                          <span className="flex items-center">
                            View Profile
                            <ArrowUpRight className="ml-1 h-3 w-3" />
                          </span>
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery
                  ? "No members found matching your search"
                  : "No members found in this unit"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
