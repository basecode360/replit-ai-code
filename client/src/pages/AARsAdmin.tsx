import React from "react";
import { useState, useEffect } from "react";
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
  CardDescription,
} from "../components/ui/card";
import { Trash, FileText, Loader2, Eye, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "../lib/queryClient";
import { useAuth } from "../lib/auth-provider";
import { Link } from "wouter";
import { Badge } from "../components/ui/badge";

const queryClient = new QueryClient();

export default function AARsAdmin() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState<Record<number, boolean>>({});

  // Define the AAR type for proper TypeScript typing
  interface AAR {
    id: number;
    eventId: number;
    unitId: number;
    createdBy: number;
    createdAt: string;
    updatedAt: string;
    sustainItems: any[];
    improveItems: any[];
    actionItems: any[];
    isDeleted: boolean;
    [key: string]: any;
  }

  // State to track locally deleted AAR IDs
  const [locallyDeletedIds, setLocallyDeletedIds] = useState<number[]>([]);

  // Fetch all AARs
  const {
    data: allAars = [],
    isLoading,
    refetch,
  } = useQuery<AAR[]>({
    queryKey: ["/api/aars/accessible"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter out locally deleted AARs
  const aars = allAars.filter((aar) => !locallyDeletedIds.includes(aar.id));

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (aarId: number) => {
      // Update local state to show loading for this AAR
      setIsDeleting((prev) => ({ ...prev, [aarId]: true }));

      const response = await apiRequest("DELETE", `/api/aars/${aarId}`);
      return { response, aarId };
    },
    onSuccess: (data) => {
      // Manually update the UI by tracking the deleted AAR locally
      const deletedAarId = data.aarId;

      // Add to locally deleted IDs
      setLocallyDeletedIds((prev) => [...prev, deletedAarId]);

      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ["/api/aars/accessible"] });

      toast({
        title: "AAR Deleted",
        description: "The AAR was successfully deleted.",
      });
    },
    onError: (error) => {
      console.error("Error deleting AAR:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete the AAR. Please try again.",
      });
    },
    onSettled: (_, __, aarId) => {
      // Clear loading state for this AAR
      setIsDeleting((prev) => {
        const newState = { ...prev };
        delete newState[aarId as number];
        return newState;
      });
    },
  });

  // Handle delete
  const handleDelete = (aarId: number) => {
    if (
      confirm(
        "Are you sure you want to delete this AAR? This cannot be undone."
      )
    ) {
      deleteMutation.mutate(aarId);
    }
  };

  // Count the total items for an AAR
  const getTotalItems = (aar: AAR) => {
    const sustainCount = Array.isArray(aar.sustainItems)
      ? aar.sustainItems.length
      : 0;
    const improveCount = Array.isArray(aar.improveItems)
      ? aar.improveItems.length
      : 0;
    const actionCount = Array.isArray(aar.actionItems)
      ? aar.actionItems.length
      : 0;
    return sustainCount + improveCount + actionCount;
  };

  return (
    <div className="container py-10 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">AARs Administration</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All AARs</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : aars.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              No AARs found. Create an AAR for an event to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event ID</TableHead>
                    <TableHead>Unit ID</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Date Created</TableHead>
                    <TableHead>Item Count</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aars.map((aar: AAR) => (
                    <TableRow key={aar.id}>
                      <TableCell>
                        <Link
                          href={`/events/${aar.eventId}`}
                          className="text-blue-600 hover:underline flex items-center"
                        >
                          <FileText className="mr-1 h-4 w-4" />
                          Event #{aar.eventId}
                        </Link>
                      </TableCell>
                      <TableCell>{aar.unitId}</TableCell>
                      <TableCell>
                        {aar.createdBy === user?.id
                          ? "You"
                          : `User #${aar.createdBy}`}
                      </TableCell>
                      <TableCell>
                        {format(new Date(aar.createdAt), "PP")}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Badge variant="outline" className="bg-green-50">
                            Sustain:{" "}
                            {Array.isArray(aar.sustainItems)
                              ? aar.sustainItems.length
                              : 0}
                          </Badge>
                          <Badge variant="outline" className="bg-amber-50">
                            Improve:{" "}
                            {Array.isArray(aar.improveItems)
                              ? aar.improveItems.length
                              : 0}
                          </Badge>
                          <Badge variant="outline" className="bg-blue-50">
                            Action:{" "}
                            {Array.isArray(aar.actionItems)
                              ? aar.actionItems.length
                              : 0}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Link href={`/aars/${aar.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(aar.id)}
                            disabled={isDeleting[aar.id]}
                          >
                            {isDeleting[aar.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
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
