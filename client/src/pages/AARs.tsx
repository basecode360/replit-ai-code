import { useAuth } from "@/lib/auth-provider";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Calendar, 
  FileText, 
  Users, 
  MoreHorizontal, 
  Loader2,
  Download,
  Printer,
  Search
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export default function AARs() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Get AARs for the unit
  const { data: aars = [], isLoading: isAARsLoading } = useQuery({
    queryKey: ["/api/units", user?.unitId, "aars"],
    queryFn: async () => {
      if (!user) return [];
      const res = await fetch(`/api/units/${user.unitId}/aars`);
      if (!res.ok) {
        console.error("Failed to fetch AARs:", await res.text());
        return [];
      }
      const data = await res.json();
      console.log("Fetched AARs:", data);
      return data;
    },
    enabled: !!user,
  });

  // Get all events instead of just unit events to ensure we have all referenced events
  const { data: events = [], isLoading: isEventsLoading } = useQuery({
    queryKey: ["/api/events"],
    queryFn: async () => {
      if (!user) return [];
      const res = await fetch('/api/events');
      const data = await res.json();
      console.log("All events loaded:", data);
      return data;
    },
    enabled: !!user,
  });

  // Get users for attribution
  const { data: users = [], isLoading: isUsersLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch('/api/users');
      return await res.json();
    },
    enabled: !!user,
  });

  const isLoading = isAARsLoading || isEventsLoading || isUsersLoading;

  // Format AARs with event data
  const formattedAARs = aars.map((aar: any) => {
    // Make sure we have a valid event with its data
    const event = events.find((e: any) => e.id === aar.eventId);
    const creator = users.find((u: any) => u.id === aar.createdBy);
    
    // Get planned and actual outcomes from AAR metadata
    const metadataItem = aar.sustainItems && aar.sustainItems.find((item: any) => 
      item.tags && Array.isArray(item.tags) && item.tags.includes('aar_metadata')
    );
    
    let plannedOutcome = null;
    let actualOutcome = null;
    
    if (metadataItem && metadataItem.text) {
      const plannedMatch = /Planned outcome: (.*?)(\n|$)/.exec(metadataItem.text);
      const actualMatch = /Actual outcome: (.*?)(\n|$)/.exec(metadataItem.text);
      
      plannedOutcome = plannedMatch && plannedMatch[1] ? plannedMatch[1] : null;
      actualOutcome = actualMatch && actualMatch[1] ? actualMatch[1] : null;
    }
    
    // Log the event data to help troubleshoot
    if (!event) {
      console.log(`Event not found for AAR ${aar.id}, eventId: ${aar.eventId}`);
    } else {
      console.log(`Found event for AAR ${aar.id}:`, event.title);
    }
    
    return {
      ...aar,
      event,
      eventTitle: event && event.title ? event.title : `Event #${aar.eventId}`,
      location: event?.location || "Unknown",
      date: event?.date ? new Date(event.date) : new Date(aar.createdAt),
      creatorName: creator ? `${creator.rank} ${creator.name}` : "Unknown",
      participantCount: event?.participants?.length || 0,
      plannedOutcome,
      actualOutcome
    };
  });

  // Filter AARs based on search query
  const filteredAARs = formattedAARs.filter((aar: any) => {
    if (!searchQuery) return true;
    
    const searchTerms = searchQuery.toLowerCase().split(" ");
    const searchableText = `
      ${aar.eventTitle.toLowerCase()} 
      ${aar.location.toLowerCase()} 
      ${aar.creatorName.toLowerCase()}
      ${Array.isArray(aar.sustainItems) ? aar.sustainItems.map((item: any) => typeof item === 'object' ? item.text : item).join(" ").toLowerCase() : ''}
      ${Array.isArray(aar.improveItems) ? aar.improveItems.map((item: any) => typeof item === 'object' ? item.text : item).join(" ").toLowerCase() : ''}
      ${Array.isArray(aar.actionItems) ? aar.actionItems.map((item: any) => typeof item === 'object' ? item.text : item).join(" ").toLowerCase() : ''}
    `;
    
    return searchTerms.every(term => searchableText.includes(term));
  });

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-condensed font-bold text-gray-900 sm:text-3xl">
            After-Action Reviews
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review and manage all AARs for your unit
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search AARs..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
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
      </div>

      {/* AARs List */}
      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredAARs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <FileText className="h-12 w-12 text-muted-foreground/60 mb-4" />
            <h3 className="text-lg font-medium">No AARs found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery 
                ? "Try adjusting your search terms."
                : "There are no AARs for your unit yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAARs.map((aar: any) => (
            <Card key={aar.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{aar.eventTitle}</CardTitle>
                    <CardDescription>
                      Created by {aar.creatorName} on {format(new Date(aar.createdAt), 'MMM d, yyyy')}
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
                      <Link href={`/aars/${aar.id}`}>
                        <DropdownMenuItem>View Full AAR</DropdownMenuItem>
                      </Link>
                      <DropdownMenuItem>Print AAR</DropdownMenuItem>
                      <DropdownMenuItem>Export to PDF</DropdownMenuItem>
                      {aar.createdBy === user?.id && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>Edit AAR</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Delete AAR
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(aar.date, 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Users className="mr-2 h-4 w-4" />
                    {aar.participantCount} Participants
                  </div>
                  <Badge>
                    <FileText className="mr-1 h-3 w-3" />
                    AAR
                  </Badge>
                </div>
                
                {/* Planned and Actual Outcomes */}
                {(aar.plannedOutcome || aar.actualOutcome) && (
                  <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {aar.plannedOutcome && (
                      <div className="p-3 bg-muted rounded-md">
                        <h4 className="text-xs font-medium mb-1">What was supposed to happen</h4>
                        <p className="text-xs line-clamp-2">{aar.plannedOutcome}</p>
                      </div>
                    )}
                    {aar.actualOutcome && (
                      <div className="p-3 bg-muted rounded-md">
                        <h4 className="text-xs font-medium mb-1">What actually happened</h4>
                        <p className="text-xs line-clamp-2">{aar.actualOutcome}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Sustain</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {aar.sustainItems
                        .filter((item: any) => !(typeof item === 'object' && item.tags && item.tags.includes('aar_metadata')))
                        .slice(0, 3)
                        .map((item: any, idx: number) => (
                          <li key={`sustain-${idx}`} className="line-clamp-1">
                            {typeof item === 'object' ? item.text : item}
                          </li>
                        ))}
                      {aar.sustainItems.filter((item: any) => !(typeof item === 'object' && item.tags && item.tags.includes('aar_metadata'))).length > 3 && (
                        <li className="text-primary text-xs">
                          +{aar.sustainItems.filter((item: any) => !(typeof item === 'object' && item.tags && item.tags.includes('aar_metadata'))).length - 3} more...
                        </li>
                      )}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Improve</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {aar.improveItems.slice(0, 3).map((item: any, idx: number) => (
                        <li key={`improve-${idx}`} className="line-clamp-1">
                          {typeof item === 'object' ? item.text : item}
                        </li>
                      ))}
                      {aar.improveItems.length > 3 && (
                        <li className="text-primary text-xs">
                          +{aar.improveItems.length - 3} more...
                        </li>
                      )}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Action Items</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {aar.actionItems.slice(0, 3).map((item: any, idx: number) => (
                        <li key={`action-${idx}`} className="line-clamp-1">
                          {typeof item === 'object' ? item.text : item}
                        </li>
                      ))}
                      {aar.actionItems.length > 3 && (
                        <li className="text-primary text-xs">
                          +{aar.actionItems.length - 3} more...
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 justify-end">
                <Link href={`/aars/${aar.id}`}>
                  <Button variant="outline" size="sm">
                    View Full AAR
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
