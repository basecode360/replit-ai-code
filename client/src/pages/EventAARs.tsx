import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Helmet } from "react-helmet";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Users,
  Loader2,
  ArrowLeft,
  FileText,
  User,
  BrainCircuit
} from "lucide-react";
import { AIAnalysisDialog } from "@/components/AIAnalysisDialog";

// Interface for AAR items with metadata
interface AARItem {
  id: string;
  text: string;
  authorId: number;
  authorRank: string;
  unitId: number;
  unitLevel: string;
  createdAt: string;
  tags?: string[];
}

interface AAR {
  id: number;
  eventId: number;
  unitId: number;
  createdBy: number;
  sustainItems: AARItem[];
  improveItems: AARItem[];
  actionItems: AARItem[];
  createdAt: string;
  updatedAt: string;
}

interface Event {
  id: number;
  title: string;
  date: string;
  location: string;
  unitId: number;
  objectives: string;
  participants: number[];
  participatingUnits: number[];
  [key: string]: any;
}

interface User {
  id: number;
  username: string;
  name: string;
  rank: string;
  role: string;
  unitId: number;
  [key: string]: any;
}

interface Unit {
  id: number;
  name: string;
  unitLevel: string;
  parentId: number | null;
  [key: string]: any;
}

export default function EventAARs() {
  const { eventId } = useParams();
  const { toast } = useToast();
  const eventIdNum = parseInt(eventId);
  const [showAIAnalysisDialog, setShowAIAnalysisDialog] = useState(false);

  // Get event data
  const { data: event, isLoading: isEventLoading } = useQuery<Event>({
    queryKey: [`/api/events/${eventIdNum}`],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventIdNum}`);
      if (!res.ok) {
        throw new Error("Failed to fetch event");
      }
      return await res.json();
    },
    enabled: !isNaN(eventIdNum),
  });

  // Get all AARs for this event
  const { data: aars, isLoading: isAARsLoading } = useQuery<AAR[]>({
    queryKey: [`/api/aars/event/${eventIdNum}`],
    queryFn: async () => {
      const res = await fetch(`/api/aars/event/${eventIdNum}`);
      if (!res.ok) {
        throw new Error("Failed to fetch AARs for this event");
      }
      return await res.json();
    },
    enabled: !isNaN(eventIdNum),
  });

  // Get user data for displaying creator names
  const { data: users, isLoading: isUsersLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) {
        throw new Error('Failed to fetch users');
      }
      return await res.json();
    },
  });

  // Get unit data for displaying unit names
  const { data: units, isLoading: isUnitsLoading } = useQuery<Unit[]>({
    queryKey: ['/api/hierarchy/accessible-units'],
    queryFn: async () => {
      const res = await fetch('/api/hierarchy/accessible-units');
      if (!res.ok) {
        throw new Error('Failed to fetch units');
      }
      return await res.json();
    },
  });

  const getAARMetadata = (aar: AAR) => {
    // Extract planned and actual outcomes from AAR metadata item
    const metadataItem = aar.sustainItems?.find((item: AARItem) => 
      item.tags && item.tags.includes('aar_metadata')
    );
    
    let plannedOutcome = null;
    let actualOutcome = null;
    let tempRole = null;
    
    if (metadataItem && metadataItem.text) {
      const text = metadataItem.text;
      const plannedMatch = /Planned outcome: (.*?)(\n|$)/.exec(text);
      const actualMatch = /Actual outcome: (.*?)(\n|$)/.exec(text);
      const tempRoleMatch = /Temporary duty position: (.*?)(\n|$)/.exec(text);
      
      plannedOutcome = plannedMatch && plannedMatch[1] ? plannedMatch[1] : null;
      actualOutcome = actualMatch && actualMatch[1] ? actualMatch[1] : null;
      tempRole = tempRoleMatch && tempRoleMatch[1] ? tempRoleMatch[1] : null;
    }
    
    return { plannedOutcome, actualOutcome, tempRole };
  };

  const getCreatorName = (userId: number) => {
    if (!users) return "Unknown";
    const user = users.find(u => u.id === userId);
    return user ? `${user.rank} ${user.name}` : "Unknown";
  };

  const getUnitName = (unitId: number) => {
    if (!units) return "Unknown";
    const unit = units.find(u => u.id === unitId);
    return unit ? unit.name : "Unknown";
  };

  const isLoading = isEventLoading || isAARsLoading || isUsersLoading || isUnitsLoading;

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Event Not Found</CardTitle>
            <CardDescription>
              The event you are looking for does not exist or you do not have access to it.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" asChild>
              <Link href="/events">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Events
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>After-Action Reviews for {event.title} - Military AAR Management System</title>
        <meta name="description" content={`View all after-action reviews for ${event.title} training event.`} />
      </Helmet>

      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">{event.title}</h1>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="mr-2 h-4 w-4" />
                {new Date(event.date).toLocaleDateString()}
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Users className="mr-2 h-4 w-4" />
                {event.participants?.length || 0} Participants
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {aars && aars.length > 0 && (
              <Button 
                variant="default" 
                onClick={() => setShowAIAnalysisDialog(true)}
              >
                <BrainCircuit className="mr-2 h-4 w-4" />
                AI Analysis
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href={`/events/${event.id}`}>
                <FileText className="mr-2 h-4 w-4" />
                View Event
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/aars/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>After-Action Reviews</CardTitle>
            <CardDescription>
              All AARs submitted for this event
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!aars || aars.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No AARs have been submitted for this event yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Date Submitted</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aars.map((aar) => {
                    const metadata = getAARMetadata(aar);
                    const sustainCount = aar.sustainItems?.filter(item => !item.tags?.includes('aar_metadata'))?.length || 0;
                    const improveCount = aar.improveItems?.length || 0;
                    const actionCount = aar.actionItems?.length || 0;
                    
                    return (
                      <TableRow key={aar.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <User className="mr-2 h-4 w-4" />
                            <span>{getCreatorName(aar.createdBy)}</span>
                            {metadata.tempRole && (
                              <Badge variant="outline" className="ml-2">
                                {metadata.tempRole}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getUnitName(aar.unitId)}</TableCell>
                        <TableCell>
                          <span title={new Date(aar.createdAt).toLocaleString()}>
                            {formatDistanceToNow(new Date(aar.createdAt), { addSuffix: true })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Badge variant="secondary">{sustainCount} Sustain</Badge>
                            <Badge variant="secondary">{improveCount} Improve</Badge>
                            <Badge variant="secondary">{actionCount} Action</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/aars/${aar.id}`}>
                              View Details
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Analysis Dialog */}
      {event && (
        <AIAnalysisDialog
          open={showAIAnalysisDialog}
          onOpenChange={setShowAIAnalysisDialog}
          eventId={event.id}
          eventTitle={event.title}
        />
      )}
    </>
  );
}