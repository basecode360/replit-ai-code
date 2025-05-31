import React from "react";
import { useState, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { User, Event, AAR } from "../../../shared/schema";
import { apiRequest } from "../lib/queryClient";
import { useAuth } from "../lib/auth-provider";
import {
  Loader2,
  Calendar,
  Building,
  FileText,
  User as UserIcon,
  Shield,
  Activity,
  ClipboardList,
  ArrowLeft,
  Mail,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
import { ScrollArea } from "../components/ui/scroll-area";
import UserChainOfCommand from "../components/users/UserChainOfCommand";
import AnalysisTab from "../components/users/AnalysisTab";

export default function UserProfile() {
  const [, params] = useRoute("/users/:id");
  const userId = params?.id ? parseInt(params.id) : -1;
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch the requested user data
  const {
    data: user,
    isLoading: userLoading,
    error: userError,
  } = useQuery<User>({
    queryKey: ["/api/users", userId],
    queryFn: async () => {
      if (userId <= 0) return null;
      const res = await apiRequest("GET", `/api/users/${userId}`);
      return await res.json();
    },
    enabled: userId > 0,
  });

  // Fetch user's unit data
  const { data: unit, isLoading: unitLoading } = useQuery({
    queryKey: ["/api/units", user?.unitId],
    queryFn: async () => {
      if (!user?.unitId) return null;
      const res = await apiRequest("GET", `/api/units/${user.unitId}`);
      return await res.json();
    },
    enabled: !!user?.unitId,
  });

  // Fetch user's events
  const { data: userEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/users", userId, "events"],
    queryFn: async () => {
      if (userId <= 0) return [];
      const res = await apiRequest("GET", `/api/users/${userId}/events`);
      return await res.json();
    },
    enabled: userId > 0,
  });

  // Fetch user's AARs
  const { data: userAARs = [], isLoading: aarsLoading } = useQuery({
    queryKey: ["/api/users", userId, "aars"],
    queryFn: async () => {
      if (userId <= 0) return [];
      const res = await apiRequest("GET", `/api/users/${userId}/aars`);
      return await res.json();
    },
    enabled: userId > 0,
  });

  // Sort events by date (most recent first)
  const sortedEvents = useMemo(() => {
    return [...userEvents].sort((a: Event, b: Event) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [userEvents]);

  // Sort AARs by date (most recent first)
  const sortedAARs = useMemo(() => {
    return [...userAARs].sort((a: AAR, b: AAR) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [userAARs]);

  // Calculate activity metrics
  const metrics = useMemo(() => {
    return {
      totalEvents: sortedEvents.length,
      totalAARs: sortedAARs.length,
      recentEvents: sortedEvents.filter((event: Event) => {
        const eventDate = new Date(event.date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return eventDate >= thirtyDaysAgo;
      }).length,
      completedAARs: sortedAARs.length, // For now, all AARs are considered completed
    };
  }, [sortedEvents, sortedAARs]);

  // Check if loading
  const isLoading = userLoading || unitLoading || eventsLoading || aarsLoading;

  // Handle error state
  if (userError) {
    return (
      <div className="container py-10">
        <Card className="mx-auto max-w-2xl">
          <CardContent className="py-8 text-center">
            <div className="mb-4 flex justify-center">
              <Shield className="h-10 w-10 text-destructive opacity-80" />
            </div>
            <CardTitle className="mb-2">User Not Found</CardTitle>
            <CardDescription className="mb-6">
              The requested user profile could not be found or you don't have
              permission to view it.
            </CardDescription>
            <Button asChild>
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-10">
        <Card className="mx-auto max-w-2xl">
          <CardContent className="py-8 text-center">
            <CardTitle className="mb-2">User Not Found</CardTitle>
            <CardDescription className="mb-6">
              The requested user profile could not be found.
            </CardDescription>
            <Button asChild>
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <Button variant="outline" size="sm" asChild className="mb-2">
            <Link href="/unit-roster">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Unit Roster
            </Link>
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold">User Profile</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Profile Sidebar */}
        <Card className="md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center mb-6">
              <Avatar className="h-20 w-20 mb-4">
                <AvatarFallback className="text-lg">
                  {user.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="text-muted-foreground">@{user.username}</p>

              <div className="flex flex-wrap justify-center gap-2 mt-2">
                <Badge variant="secondary">{user.rank}</Badge>
                <Badge variant="outline">{user.role}</Badge>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Unit</p>
                  <p className="text-sm text-muted-foreground">
                    {unit?.name ?? "Loading..."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {unit?.unitLevel ?? ""}
                  </p>
                </div>
              </div>

              {userId === currentUser?.id && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Contact</p>
                    <p className="text-sm text-muted-foreground">
                      Messages coming soon
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <h3 className="text-sm font-medium mb-2">Activity Summary</h3>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/60 rounded p-2 text-center">
                  <p className="text-2xl font-bold">{metrics.totalEvents}</p>
                  <p className="text-xs text-muted-foreground">Total Events</p>
                </div>
                <div className="bg-muted/60 rounded p-2 text-center">
                  <p className="text-2xl font-bold">{metrics.totalAARs}</p>
                  <p className="text-xs text-muted-foreground">
                    AARs Submitted
                  </p>
                </div>
                <div className="bg-muted/60 rounded p-2 text-center">
                  <p className="text-2xl font-bold">{metrics.recentEvents}</p>
                  <p className="text-xs text-muted-foreground">Recent Events</p>
                </div>
                <div className="bg-muted/60 rounded p-2 text-center">
                  <p className="text-2xl font-bold">{metrics.completedAARs}</p>
                  <p className="text-xs text-muted-foreground">
                    Completed AARs
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="md:col-span-2 space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="aars">AARs</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserIcon className="mr-2 h-5 w-5" />
                    About
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-line">
                    {user.bio || "No bio information available."}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="mr-2 h-5 w-5" />
                    Chain of Command
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <UserChainOfCommand userId={userId} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5" />
                    Training Events
                  </CardTitle>
                  <CardDescription>
                    Events that{" "}
                    {userId === currentUser?.id ? "you have" : "this user has"}{" "}
                    participated in
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sortedEvents.length > 0 ? (
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-4">
                        {sortedEvents.map((event: Event) => (
                          <div
                            key={event.id}
                            className="border rounded-md p-3 hover:border-primary"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <Link
                                  href={`/events/${event.id}`}
                                  className="font-medium hover:underline"
                                >
                                  {event.title}
                                </Link>
                                <div className="text-sm text-muted-foreground">
                                  {format(new Date(event.date), "MMMM d, yyyy")}
                                  {event.isMultiDayEvent && event.endDate && (
                                    <>
                                      {" "}
                                      to{" "}
                                      {format(
                                        new Date(event.endDate),
                                        "MMMM d, yyyy"
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                              <Badge variant="outline">Step {event.step}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground line-clamp-2">
                              {event.objectives}
                            </div>
                            <div className="mt-2 flex justify-end">
                              <Button size="sm" variant="ghost" asChild>
                                <Link href={`/events/${event.id}`}>
                                  View Details
                                </Link>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No events found for this user
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* AARs Tab */}
            <TabsContent value="aars" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    After Action Reviews
                  </CardTitle>
                  <CardDescription>
                    AARs that{" "}
                    {userId === currentUser?.id ? "you have" : "this user has"}{" "}
                    submitted
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sortedAARs.length > 0 ? (
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-4">
                        {sortedAARs.map((aar: AAR) => (
                          <div
                            key={aar.id}
                            className="border rounded-md p-3 hover:border-primary"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="font-medium">
                                  AAR for Event #{aar.eventId}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Submitted on{" "}
                                  {format(
                                    new Date(aar.createdAt),
                                    "MMMM d, yyyy"
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2 mt-3">
                              <div>
                                <p className="text-xs font-medium text-green-600 dark:text-green-500">
                                  SUSTAIN ({aar.sustainItems.length})
                                </p>
                                {aar.sustainItems.length > 0 ? (
                                  <ul className="text-sm list-disc list-inside pl-2">
                                    {aar.sustainItems
                                      .slice(0, 1)
                                      .map((item: any, index: number) => (
                                        <li
                                          key={`sustain-${index}`}
                                          className="truncate"
                                        >
                                          {typeof item === "string"
                                            ? item
                                            : item.text}
                                        </li>
                                      ))}
                                    {aar.sustainItems.length > 1 && (
                                      <li className="text-xs text-muted-foreground">
                                        + {aar.sustainItems.length - 1} more
                                      </li>
                                    )}
                                  </ul>
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    None provided
                                  </p>
                                )}
                              </div>

                              <div>
                                <p className="text-xs font-medium text-amber-600 dark:text-amber-500">
                                  IMPROVE ({aar.improveItems.length})
                                </p>
                                {aar.improveItems.length > 0 ? (
                                  <ul className="text-sm list-disc list-inside pl-2">
                                    {aar.improveItems
                                      .slice(0, 1)
                                      .map((item: any, index: number) => (
                                        <li
                                          key={`improve-${index}`}
                                          className="truncate"
                                        >
                                          {typeof item === "string"
                                            ? item
                                            : item.text}
                                        </li>
                                      ))}
                                    {aar.improveItems.length > 1 && (
                                      <li className="text-xs text-muted-foreground">
                                        + {aar.improveItems.length - 1} more
                                      </li>
                                    )}
                                  </ul>
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    None provided
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 flex justify-end">
                              <Button size="sm" variant="ghost" asChild>
                                <Link href={`/events/${aar.eventId}`}>
                                  View Event
                                </Link>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No AARs found for this user
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analysis Tab */}
            <TabsContent value="analysis" className="space-y-4">
              <AnalysisTab userId={userId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
