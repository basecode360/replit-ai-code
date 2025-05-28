import { useState } from "react";
import { useAuth } from "../lib/auth-provider";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Calendar,
  MapPin,
  Users,
  MoreHorizontal,
  Loader2,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { queryClient } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { trainingStepInfo } from "../lib/types";

export default function Events() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");

  // Get events for the unit
  const {
    data: unitEvents = [],
    isLoading: isLoadingUnitEvents,
    error: unitEventsError,
  } = useQuery<any[]>({
    queryKey: user ? [`/api/units/${user.unitId}/events`] : [""],
    enabled: !!user,
  });

  // Get all events (additional data source)
  const {
    data: allEvents = [],
    isLoading: isLoadingAllEvents,
    error: allEventsError,
  } = useQuery<any[]>({
    queryKey: ["/api/events"],
    enabled: !!user,
  });

  // Combine events from both sources and remove duplicates
  const events = [...unitEvents, ...allEvents].filter(
    (event, index, self) => index === self.findIndex((e) => e.id === event.id)
  );

  // Derive loading and error states
  const isLoading = isLoadingUnitEvents || isLoadingAllEvents;
  const error = unitEventsError || allEventsError;

  // Log for debugging
  console.log("User:", user);
  console.log("Events data:", events);
  console.log("Events loading:", isLoading);
  console.log("Events error:", error);

  // Delete event mutation
  const deleteEvent = useMutation({
    mutationFn: async (eventId: number) => {
      const res = await apiRequest("DELETE", `/api/events/${eventId}`, {});
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Event deleted",
        description: "The event has been deleted successfully",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/units/${user?.unitId}/events`],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting event",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Filter events based on active tab
  const filteredEvents = Array.isArray(events)
    ? events.filter((event: any) => {
        console.log("Filtering event:", event);

        // Handle case where event might be null or missing properties
        if (!event) return false;

        if (activeTab === "all") return !event.isDeleted;
        if (activeTab === "active") return !event.isDeleted && event.step < 8;
        if (activeTab === "completed")
          return !event.isDeleted && event.step === 8;
        if (activeTab === "deleted") return event.isDeleted;
        return true;
      })
    : [];

  console.log("Filtered events:", filteredEvents);

  // Get status badge based on step
  const getStatusBadge = (step: number) => {
    if (step < 5)
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          Preparation
        </Badge>
      );
    if (step === 5)
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
          Execution
        </Badge>
      );
    if (step === 6)
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          AAR
        </Badge>
      );
    if (step === 7)
      return (
        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
          Retraining
        </Badge>
      );
    if (step === 8)
      return (
        <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
          Completed
        </Badge>
      );
    return <Badge>Unknown</Badge>;
  };

  // Handle event deletion
  const handleDeleteEvent = (eventId: number) => {
    if (confirm("Are you sure you want to delete this event?")) {
      deleteEvent.mutate(eventId);
    }
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-condensed font-bold text-gray-900 sm:text-3xl">
            Training Events
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage all training events for your unit
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link href="/events/create">
            <Button>Create New Event</Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Events</TabsTrigger>
          <TabsTrigger value="active">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="deleted">Deleted</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8">
                <Calendar className="h-12 w-12 text-muted-foreground/60 mb-4" />
                <h3 className="text-lg font-medium">No events found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeTab === "deleted"
                    ? "There are no deleted events."
                    : "Start by creating a new training event."}
                </p>
                {activeTab !== "deleted" && (
                  <Link href="/events/create">
                    <Button className="mt-4">Create Event</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEvents.map((event: any) => (
                <Card
                  key={event.id}
                  className={event.isDeleted ? "opacity-70" : ""}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{event.title}</CardTitle>
                        <CardDescription>
                          Step {event.step}:{" "}
                          {trainingStepInfo[event.step - 1]?.name}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <Link href={`/events/${event.id}`}>
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                          </Link>
                          <Link href={`/submit-aar/${event.id}`}>
                            <DropdownMenuItem>Submit AAR</DropdownMenuItem>
                          </Link>
                          {event.isDeleted ? (
                            <DropdownMenuItem>Restore Event</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteEvent(event.id)}
                            >
                              Delete Event
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <div className="flex items-center text-muted-foreground">
                          <Calendar className="mr-2 h-4 w-4" />
                          {format(new Date(event.date), "MMM d, yyyy")}
                        </div>
                        {getStatusBadge(event.step)}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="mr-2 h-4 w-4" />
                        {event.location}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Users className="mr-2 h-4 w-4" />
                        {Array.isArray(event.participants)
                          ? event.participants.length
                          : 0}{" "}
                        Participants
                      </div>
                      <div className="pt-2">
                        <p className="font-medium text-xs uppercase text-muted-foreground">
                          Objectives:
                        </p>
                        <p className="text-sm mt-1 line-clamp-2">
                          {event.objectives}
                        </p>
                      </div>

                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
                        <Link href={`/events/${event.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                        <Link href={`/submit-aar/${event.id}`}>
                          <Button size="sm">
                            <FileText className="mr-2 h-4 w-4" /> Submit AAR
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
