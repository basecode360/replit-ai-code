import React from "react";
import { useEffect, useState } from "react";
import { useQuery, useMutation, QueryClient } from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Trash, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "../lib/queryClient";
import { useAuth } from "../lib/auth-provider";
import { Link } from "wouter";

const queryClient = new QueryClient();

export default function EventsAdmin() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState<Record<number, boolean>>({});

  // Define the Event type for proper TypeScript typing
  interface Event {
    id: number;
    title: string;
    eventType: string;
    trainingEchelon: string;
    executionDate: string;
    createdBy: number;
    unitId: number;
    participants: number[];
    participatingUnits: number[];
    [key: string]: any; // Allow for additional fields
  }

  // Fetch all events
  const {
    data: events = [],
    isLoading,
    refetch,
  } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (eventId: number) => {
      // Update local state to show loading for this event
      setIsDeleting((prev) => ({ ...prev, [eventId]: true }));

      const response = await apiRequest("DELETE", `/api/events/${eventId}`);
      return response;
    },
    onSuccess: () => {
      // Invalidate and refetch the events
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      refetch();
      toast({
        title: "Event Deleted",
        description: "The event was successfully deleted.",
      });
    },
    onError: (error) => {
      console.error("Error deleting event:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete the event. Please try again.",
      });
    },
    onSettled: (_, __, eventId) => {
      // Clear loading state for this event
      setIsDeleting((prev) => {
        const newState = { ...prev };
        delete newState[eventId as number];
        return newState;
      });
    },
  });

  // Handle delete
  const handleDelete = (eventId: number) => {
    if (
      confirm(
        "Are you sure you want to delete this event? This cannot be undone."
      )
    ) {
      deleteMutation.mutate(eventId);
    }
  };

  return (
    <div className="container py-10 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Events Administration</h1>
        <Link href="/events/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create New Event
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              No events found. Create a new event to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Training Echelon</TableHead>
                    <TableHead>Execution Date</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event: any) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/events/${event.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {event.title}
                        </Link>
                      </TableCell>
                      <TableCell>{event.eventType}</TableCell>
                      <TableCell>{event.trainingEchelon}</TableCell>
                      <TableCell>
                        {event.executionDate
                          ? format(new Date(event.executionDate), "PPP")
                          : "Not scheduled"}
                      </TableCell>
                      <TableCell>
                        {event.createdBy === user?.id
                          ? "You"
                          : `User #${event.createdBy}`}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(event.id)}
                          disabled={isDeleting[event.id]}
                        >
                          {isDeleting[event.id] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
