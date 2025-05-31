import React from "react";
import { useAuth } from "../lib/auth-provider";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import {
  Calendar,
  FileText,
  Users,
  MapPin,
  ArrowLeft,
  Printer,
  Download,
  User,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
import { Skeleton } from "../components/ui/skeleton";

export default function AARDetail() {
  const { user } = useAuth();
  const params = useParams();
  const aarId = parseInt(params.id || "0");

  // Get the AAR details
  const { data: aar, isLoading: isAARLoading } = useQuery({
    queryKey: [`/api/aars/${aarId}`],
    queryFn: async () => {
      const res = await fetch(`/api/aars/${aarId}`);
      if (!res.ok) {
        console.error(`Failed to fetch AAR #${aarId}:`, await res.text());
        throw new Error(`Failed to fetch AAR #${aarId}`);
      }
      return await res.json();
    },
    enabled: !!aarId,
  });

  // Get the event associated with the AAR
  const { data: event, isLoading: isEventLoading } = useQuery({
    queryKey: [`/api/events/${aar?.eventId}`],
    queryFn: async () => {
      const res = await fetch(`/api/events/${aar.eventId}`);
      if (!res.ok) {
        console.error(
          `Failed to fetch Event #${aar.eventId}:`,
          await res.text()
        );
        throw new Error(`Failed to fetch Event #${aar.eventId}`);
      }
      return await res.json();
    },
    enabled: !!aar?.eventId,
  });

  // Get creator info
  const { data: creator, isLoading: isCreatorLoading } = useQuery({
    queryKey: ["/api/users", aar?.createdBy],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }
      const users = await res.json();
      return users.find((u: any) => u.id === aar.createdBy);
    },
    enabled: !!aar?.createdBy,
  });

  const isLoading = isAARLoading || isEventLoading || isCreatorLoading;

  // Extract planned and actual outcomes from AAR items
  const getAARMetadata = () => {
    if (!aar) return { plannedOutcome: null, actualOutcome: null };

    // Look for items with 'aar_metadata' tag
    const sustainItems = aar.sustainItems || [];
    const metadataItem = sustainItems.find(
      (item: any) =>
        item.tags &&
        Array.isArray(item.tags) &&
        item.tags.includes("aar_metadata")
    );

    // If we found a metadata item, extract the planned and actual outcomes from the text
    if (metadataItem) {
      const text = metadataItem.text || "";

      // Try to parse out the planned and actual outcomes from the text
      const plannedMatch = /Planned outcome: (.*?)(\n|$)/.exec(text);
      const actualMatch = /Actual outcome: (.*?)(\n|$)/.exec(text);

      return {
        plannedOutcome:
          plannedMatch && plannedMatch[1] ? plannedMatch[1] : null,
        actualOutcome: actualMatch && actualMatch[1] ? actualMatch[1] : null,
      };
    }

    return { plannedOutcome: null, actualOutcome: null };
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-28" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="flex justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-32" />
              </div>
              <Skeleton className="h-48 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!aar) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <FileText className="h-12 w-12 text-muted-foreground/60 mb-4" />
            <h3 className="text-lg font-medium">AAR Not Found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              The requested AAR could not be found or may have been deleted.
            </p>
            <Button asChild className="mt-4">
              <Link href="/aars">Return to AARs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const creatorName = creator ? `${creator.rank} ${creator.name}` : "Unknown";
  const eventDate = event ? new Date(event.date) : new Date(aar.createdAt);
  const eventLocation = event?.location || "Unknown";
  const participantCount = event?.participants?.length || 0;

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="mr-2" asChild>
            <Link href="/aars">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-condensed font-bold text-gray-900 sm:text-3xl">
              {event?.title || `AAR #${aar.id}`}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              After-Action Review Details
            </p>
          </div>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0">
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* AAR Info Card */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle>AAR Information</CardTitle>
          <CardDescription>
            Created by {creatorName} on{" "}
            {format(new Date(aar.createdAt), "MMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center text-muted-foreground">
              <Calendar className="mr-2 h-4 w-4" />
              {format(eventDate, "MMM d, yyyy")}
            </div>
            <div className="flex items-center text-muted-foreground">
              <MapPin className="mr-2 h-4 w-4" />
              {eventLocation}
            </div>
            <div className="flex items-center text-muted-foreground">
              <Users className="mr-2 h-4 w-4" />
              {participantCount} Participants
            </div>
            {event && (
              <Badge>
                <FileText className="mr-1 h-3 w-3" />
                {event.step === 8 ? "Completed" : `Step ${event.step}`}
              </Badge>
            )}
            <Badge variant="outline" className="text-primary">
              <User className="mr-1 h-3 w-3" />
              {creatorName}
            </Badge>
          </div>

          {/* Planned and Actual Outcomes */}
          {(() => {
            const { plannedOutcome, actualOutcome } = getAARMetadata();
            if (plannedOutcome || actualOutcome) {
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {plannedOutcome && (
                    <div className="p-4 bg-muted rounded-md">
                      <h4 className="font-medium mb-2">
                        What was supposed to happen
                      </h4>
                      <p className="text-sm">{plannedOutcome}</p>
                    </div>
                  )}
                  {actualOutcome && (
                    <div className="p-4 bg-muted rounded-md">
                      <h4 className="font-medium mb-2">
                        What actually happened
                      </h4>
                      <p className="text-sm">{actualOutcome}</p>
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })()}
        </CardContent>
      </Card>

      {/* AAR Tabs */}
      <Tabs defaultValue="sustain" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="sustain">Sustain</TabsTrigger>
          <TabsTrigger value="improve">Improve</TabsTrigger>
          <TabsTrigger value="action">Action Items</TabsTrigger>
        </TabsList>
        <TabsContent
          value="sustain"
          className="p-4 bg-background rounded-md border"
        >
          <h2 className="text-lg font-semibold mb-4">What Went Well</h2>
          <ul className="space-y-5">
            {aar.sustainItems
              .filter((item: any) => {
                // Filter out items that have the aar_metadata tag
                return !(
                  item.tags &&
                  Array.isArray(item.tags) &&
                  item.tags.includes("aar_metadata")
                );
              })
              .map((item: any, index: number) => (
                <li key={`sustain-${index}`} className="pt-2">
                  <div className="text-sm">{item.text}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center">
                      <User className="mr-1 h-3 w-3" />
                      {item.authorRank} - {item.unitLevel}
                    </span>
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.tags.map((tag: string, tagIdx: number) => (
                          <Badge
                            key={`tag-${tagIdx}`}
                            variant="outline"
                            className="text-xs px-1 py-0"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            {aar.sustainItems.filter(
              (item: any) =>
                !(
                  item.tags &&
                  Array.isArray(item.tags) &&
                  item.tags.includes("aar_metadata")
                )
            ).length === 0 && (
              <p className="text-sm text-muted-foreground">
                No sustain items were recorded.
              </p>
            )}
          </ul>
        </TabsContent>
        <TabsContent
          value="improve"
          className="p-4 bg-background rounded-md border"
        >
          <h2 className="text-lg font-semibold mb-4">Areas for Improvement</h2>
          <ul className="space-y-5">
            {aar.improveItems.map((item: any, index: number) => (
              <li key={`improve-${index}`} className="pt-2">
                <div className="text-sm">{item.text}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center">
                    <User className="mr-1 h-3 w-3" />
                    {item.authorRank} - {item.unitLevel}
                  </span>
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.tags.map((tag: string, tagIdx: number) => (
                        <Badge
                          key={`tag-${tagIdx}`}
                          variant="outline"
                          className="text-xs px-1 py-0"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
            {aar.improveItems.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No improvement items were recorded.
              </p>
            )}
          </ul>
        </TabsContent>
        <TabsContent
          value="action"
          className="p-4 bg-background rounded-md border"
        >
          <h2 className="text-lg font-semibold mb-4">Action Items</h2>
          <ul className="space-y-5">
            {aar.actionItems.map((item: any, index: number) => (
              <li key={`action-${index}`} className="pt-2">
                <div className="text-sm">{item.text}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center">
                    <User className="mr-1 h-3 w-3" />
                    {item.authorRank} - {item.unitLevel}
                  </span>
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.tags.map((tag: string, tagIdx: number) => (
                        <Badge
                          key={`tag-${tagIdx}`}
                          variant="outline"
                          className="text-xs px-1 py-0"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
            {aar.actionItems.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No action items were recorded.
              </p>
            )}
          </ul>
        </TabsContent>
      </Tabs>

      {event && (
        <div className="mt-8">
          <Separator className="my-4" />
          <h2 className="text-lg font-semibold mb-4">Event Details</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-medium mb-2">Objectives</h3>
              <p className="text-sm text-muted-foreground">
                {event.objectives}
              </p>
            </div>
            {event.resources && (
              <div>
                <h3 className="font-medium mb-2">Resources</h3>
                <p className="text-sm text-muted-foreground">
                  {event.resources}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
