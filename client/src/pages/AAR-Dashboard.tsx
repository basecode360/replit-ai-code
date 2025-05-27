import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useHierarchy } from "@/hooks/use-hierarchy";
import { useAuth } from "@/lib/auth-provider";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

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

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Clipboard,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Calendar,
  MapPin,
  Building,
  Users,
  Filter,
  Search,
  PlusCircle,
} from "lucide-react";

// Interfaces for event and AAR data
interface Event {
  id: number;
  title: string;
  unitId: number;
  createdBy: number;
  step: number;
  date: string;
  location: string;
  objectives: string;
  resources: string;
  participants: number[];
  participatingUnits: number[];
  notifyParticipants: boolean;
}

// AARItem represents a single comment in an AAR with metadata
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
  event?: Event;
  createdByUser?: {
    id: number;
    name: string;
    rank: string;
  };
  unitName?: string;
}

interface Unit {
  id: number;
  name: string;
  parentId: number | null;
  unitLevel: string;
}

interface User {
  id: number;
  name: string;
  rank: string;
}

// Function to format date strings
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export default function AARDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { accessibleUnits } = useHierarchy();
  
  // State for filtering and sorting
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeframe, setTimeframe] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedUnitLevel, setSelectedUnitLevel] = useState<string | null>(null);
  
  // Advanced comment filtering options
  const [selectedCommentUnitLevel, setSelectedCommentUnitLevel] = useState<string | null>(null);
  const [selectedCommentUnitId, setSelectedCommentUnitId] = useState<number | null>(null);
  const [selectedRank, setSelectedRank] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Query to fetch all AARs for units the user has access to
  const { data: aars, isLoading: aarsLoading } = useQuery({
    queryKey: ['/api/aars/accessible'],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/aars/accessible`);
        if (!response.ok) {
          console.error('Failed to fetch AARs:', await response.text());
          return []; // Return empty array instead of throwing
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching AARs:', error);
        return []; // Return empty array on error
      }
    }
  });
  
  // Query to fetch all events (we'll filter them based on AAR associations)
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/events'],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/events`);
        if (!response.ok) {
          console.error('Failed to fetch events:', await response.text());
          return []; // Return empty array instead of throwing
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching events:', error);
        return []; // Return empty array on error
      }
    }
  });
  
  // Query to fetch users for displaying who created AARs
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/users`);
        if (!response.ok) {
          console.error('Failed to fetch users:', await response.text());
          return []; // Return empty array instead of throwing
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching users:', error);
        return []; // Return empty array on error
      }
    }
  });
  
  // Create a map of event and user data for easy lookup
  const eventsMap = events && Array.isArray(events) ? events.reduce((map: Record<number, Event>, event: Event) => {
    map[event.id] = event;
    return map;
  }, {}) : {};
  
  const usersMap = users && Array.isArray(users) ? users.reduce((map: Record<number, User>, user: User) => {
    map[user.id] = user;
    return map;
  }, {}) : {};
  
  const unitsMap = accessibleUnits && Array.isArray(accessibleUnits) ? accessibleUnits.reduce((map: Record<number, Unit>, unit: Unit) => {
    map[unit.id] = unit;
    return map;
  }, {}) : {};
  
  // Process AARs to add event, creator, and unit data
  const processedAARs = aars && Array.isArray(aars) ? aars.map((aar: AAR) => {
    return {
      ...aar,
      event: eventsMap ? eventsMap[aar.eventId] : undefined,
      createdByUser: usersMap ? usersMap[aar.createdBy] : undefined,
      unitName: unitsMap && unitsMap[aar.unitId] ? unitsMap[aar.unitId].name : 'Unknown Unit'
    };
  }) : [];
  
  // Group AARs by event, only including those with valid events
  const groupedAARs = processedAARs.reduce((grouped: Record<number, AAR[]>, aar: AAR) => {
    // Skip AARs with no valid event data
    if (!aar.eventId || !eventsMap || !eventsMap[aar.eventId]) {
      return grouped;
    }
    
    if (!grouped[aar.eventId]) {
      grouped[aar.eventId] = [];
    }
    grouped[aar.eventId].push(aar);
    return grouped;
  }, {});
  
  // Filter AARs based on selected filters
  const filteredAAREvents = Object.entries(groupedAARs).filter(([eventId, eventAARs]) => {
    const event = eventsMap[Number(eventId)];
    
    // Skip filtering if event is undefined
    if (!event) {
      return false;
    }
    
    // Filter by unit if selected
    if (selectedUnitId && 
        event.unitId !== selectedUnitId && 
        (!event.participatingUnits || !event.participatingUnits.includes(selectedUnitId))) {
      return false;
    }
    
    // Filter by unit level if selected
    if (selectedUnitLevel && 
        (!unitsMap[event.unitId] || unitsMap[event.unitId]?.unitLevel !== selectedUnitLevel)) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesTitle = event.title?.toLowerCase().includes(searchLower) || false;
      const matchesObjectives = event.objectives?.toLowerCase().includes(searchLower) || false;
      const matchesLocation = event.location?.toLowerCase().includes(searchLower) || false;
      
      // Also search through AAR content
      const matchesAARContent = Array.isArray(eventAARs) && eventAARs.some(aar => {
        if (!aar.sustainItems || !aar.improveItems || !aar.actionItems) {
          return false;
        }
        
        const sustainMatches = Array.isArray(aar.sustainItems) && 
          aar.sustainItems.some(item => typeof item === 'object' && item.text && item.text.toLowerCase().includes(searchLower));
        const improveMatches = Array.isArray(aar.improveItems) && 
          aar.improveItems.some(item => typeof item === 'object' && item.text && item.text.toLowerCase().includes(searchLower));
        const actionMatches = Array.isArray(aar.actionItems) && 
          aar.actionItems.some(item => typeof item === 'object' && item.text && item.text.toLowerCase().includes(searchLower));
          
        return sustainMatches || improveMatches || actionMatches;
      });
      
      if (!(matchesTitle || matchesObjectives || matchesLocation || matchesAARContent)) {
        return false;
      }
    }
    
    // Filter by timeframe
    if (timeframe !== "all" && event.date) {
      const eventDate = new Date(event.date);
      const now = new Date();
      
      if (timeframe === "week" && (now.getTime() - eventDate.getTime() > 7 * 24 * 60 * 60 * 1000)) {
        return false;
      } else if (timeframe === "month" && (now.getTime() - eventDate.getTime() > 30 * 24 * 60 * 60 * 1000)) {
        return false;
      } else if (timeframe === "quarter" && (now.getTime() - eventDate.getTime() > 90 * 24 * 60 * 60 * 1000)) {
        return false;
      }
    }
    
    return true;
  });
  
  // Sort the filtered AARs
  const sortedAAREvents = [...filteredAAREvents].sort(([eventIdA, aarsA], [eventIdB, aarsB]) => {
    const eventA = eventsMap[Number(eventIdA)];
    const eventB = eventsMap[Number(eventIdB)];
    
    // Safety check - if either event is undefined, don't try to sort
    if (!eventA || !eventB) {
      return 0;
    }
    
    if (sortBy === "recent") {
      return new Date(eventB.date || '').getTime() - new Date(eventA.date || '').getTime();
    } else if (sortBy === "oldest") {
      return new Date(eventA.date || '').getTime() - new Date(eventB.date || '').getTime();
    } else if (sortBy === "unit") {
      return (eventA.unitId || 0) - (eventB.unitId || 0);
    } else if (sortBy === "title") {
      return (eventA.title || '').localeCompare(eventB.title || '');
    } else if (sortBy === "most-feedback") {
      return (aarsB ? aarsB.length : 0) - (aarsA ? aarsA.length : 0);
    }
    
    return 0;
  });
  
  // Get available unit levels from accessible units
  const unitLevels = accessibleUnits
    ? [...new Set(accessibleUnits.map(unit => unit.unitLevel))]
    : [];
    
  // Function to filter and process AAR items for display
  const getFilteredItems = (eventAARs: AAR[], type: 'sustainItems' | 'improveItems' | 'actionItems') => {
    return eventAARs.flatMap(aar => {
      // Get the original items from the AAR
      const items = aar[type] || [];
      
      // Apply advanced filters if they're set
      return items.filter((item: AARItem) => {
        // Skip if item is not properly structured
        if (!item || typeof item !== 'object') {
          return false;
        }
        
        // Filter out metadata items (these should only appear in their own section)
        if (item.tags && Array.isArray(item.tags) && item.tags.includes('aar_metadata')) {
          return false;
        }
        
        // Filter by comment unit ID
        if (selectedCommentUnitId !== null && item.unitId !== selectedCommentUnitId) {
          return false;
        }
        
        // Filter by comment unit level (echelon)
        if (selectedCommentUnitLevel !== null && item.unitLevel !== selectedCommentUnitLevel) {
          return false;
        }
        
        // Filter by rank
        if (selectedRank !== null && item.authorRank !== selectedRank) {
          return false;
        }
        
        // Comment passed all filters
        return true;
      });
    });
  };
  
  // Loading state
  if (aarsLoading || eventsLoading || usersLoading) {
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">After Action Reviews</h1>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-4 w-1/4" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">After Action Reviews</h1>
        <Link href="/submit-aar">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create AAR
          </Button>
        </Link>
      </div>
      
      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Filter & Sort</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            {showAdvancedFilters ? "Hide Advanced Filters" : "Advanced Filters"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="search"
                  placeholder="Search events and AARs..." 
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="unit-filter">Filter Events by Unit</Label>
              <Select value={selectedUnitId?.toString() || "_all"} onValueChange={(value) => setSelectedUnitId(value !== "_all" ? Number(value) : null)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Units</SelectItem>
                  {accessibleUnits?.map(unit => (
                    <SelectItem key={unit.id} value={unit.id.toString()}>
                      {unit.name} ({unit.unitLevel})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="unit-level-filter">Filter Events by Unit Level</Label>
              <Select value={selectedUnitLevel || "_all"} onValueChange={(value) => setSelectedUnitLevel(value !== "_all" ? value : null)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Unit Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Unit Levels</SelectItem>
                  {unitLevels.map(level => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="timeframe">Timeframe</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger>
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">Past Week</SelectItem>
                  <SelectItem value="month">Past Month</SelectItem>
                  <SelectItem value="quarter">Past Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="sort-by">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Most Recent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="unit">Unit</SelectItem>
                  <SelectItem value="title">Event Title</SelectItem>
                  <SelectItem value="most-feedback">Most Feedback</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Advanced Comment Filters */}
          {showAdvancedFilters && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-md font-semibold mb-4">Comment Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="comment-unit-filter">Filter Comments by Unit</Label>
                  <Select 
                    value={selectedCommentUnitId?.toString() || "_all"} 
                    onValueChange={(value) => setSelectedCommentUnitId(value !== "_all" ? Number(value) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Units" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">All Units</SelectItem>
                      {accessibleUnits?.map(unit => (
                        <SelectItem key={`comment-${unit.id}`} value={unit.id.toString()}>
                          {unit.name} ({unit.unitLevel})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="comment-unit-level-filter">Filter Comments by Echelon</Label>
                  <Select 
                    value={selectedCommentUnitLevel || "_all"} 
                    onValueChange={(value) => setSelectedCommentUnitLevel(value !== "_all" ? value : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Echelons" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">All Echelons</SelectItem>
                      {unitLevels.map(level => (
                        <SelectItem key={`comment-${level}`} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="rank-filter">Filter Comments by Rank</Label>
                  <Select 
                    value={selectedRank || "_all"} 
                    onValueChange={(value) => setSelectedRank(value !== "_all" ? value : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Ranks" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">All Ranks</SelectItem>
                      <SelectItem value="Private">Private</SelectItem>
                      <SelectItem value="Specialist">Specialist</SelectItem>
                      <SelectItem value="Corporal">Corporal</SelectItem>
                      <SelectItem value="Sergeant">Sergeant</SelectItem>
                      <SelectItem value="Staff Sergeant">Staff Sergeant</SelectItem>
                      <SelectItem value="Lieutenant">Lieutenant</SelectItem>
                      <SelectItem value="Captain">Captain</SelectItem>
                      <SelectItem value="Major">Major</SelectItem>
                      <SelectItem value="Colonel">Colonel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Results */}
      <div className="grid gap-6">
        {sortedAAREvents.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No AARs found matching your filters.</p>
            <Button variant="outline" onClick={() => {
              setSearchTerm("");
              setSelectedUnitId(null);
              setSelectedUnitLevel(null);
              setTimeframe("all");
              setSortBy("recent");
            }}>
              Clear Filters
            </Button>
          </Card>
        ) : (
          sortedAAREvents.map(([eventId, eventAARs]) => {
            const event = eventsMap[Number(eventId)];
            const eventUnit = unitsMap[event.unitId];
            
            return (
              <Card key={eventId} className="overflow-hidden">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{event.title}</CardTitle>
                      <CardDescription>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="flex items-center">
                            <Calendar className="mr-1 h-3 w-3" />
                            {formatDate(event.date)}
                          </Badge>
                          <Badge variant="outline" className="flex items-center">
                            <MapPin className="mr-1 h-3 w-3" />
                            {event.location}
                          </Badge>
                          <Badge variant="outline" className="flex items-center">
                            <Building className="mr-1 h-3 w-3" />
                            {eventUnit?.name || 'Unknown Unit'}
                          </Badge>
                          <Badge variant="outline" className="flex items-center">
                            <Users className="mr-1 h-3 w-3" />
                            {event.participants.length} participants
                          </Badge>
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/events/${event.id}`}>
                        <Button variant="outline" size="sm">View Event</Button>
                      </Link>
                      <Link href={`/aars/new?eventId=${event.id}`}>
                        <Button size="sm">Add Feedback</Button>
                      </Link>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">{event.objectives}</p>
                  
                  <Tabs defaultValue="all">
                    <TabsList>
                      <TabsTrigger value="all">All Feedback ({eventAARs.length})</TabsTrigger>
                      <TabsTrigger value="sustain">Sustain</TabsTrigger>
                      <TabsTrigger value="improve">Improve</TabsTrigger>
                      <TabsTrigger value="action">Action Items</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="all">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
                        <Card>
                          <CardHeader className="py-3">
                            <CardTitle className="text-lg flex items-center text-green-600">
                              <CheckCircle2 className="mr-2 h-5 w-5" />
                              Sustain
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {getFilteredItems(eventAARs, 'sustainItems').map((item: AARItem, i) => (
                                <li key={item.id || i} className="flex items-start">
                                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                                  <div className="flex flex-col">
                                    <span>{typeof item === 'object' ? item.text : item}</span>
                                    {typeof item === 'object' && (
                                      <span className="text-xs text-muted-foreground mt-1">
                                        {usersMap[item.authorId]?.name || 'Unknown'} ({item.authorRank}) - {unitsMap[item.unitId]?.name || 'Unknown Unit'}
                                      </span>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="py-3">
                            <CardTitle className="text-lg flex items-center text-amber-600">
                              <XCircle className="mr-2 h-5 w-5" />
                              Improve
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {getFilteredItems(eventAARs, 'improveItems').map((item: AARItem, i) => (
                                <li key={item.id || i} className="flex items-start">
                                  <XCircle className="mr-2 h-4 w-4 text-amber-600 mt-1 flex-shrink-0" />
                                  <div className="flex flex-col">
                                    <span>{typeof item === 'object' ? item.text : item}</span>
                                    {typeof item === 'object' && (
                                      <span className="text-xs text-muted-foreground mt-1">
                                        {usersMap[item.authorId]?.name || 'Unknown'} ({item.authorRank}) - {unitsMap[item.unitId]?.name || 'Unknown Unit'}
                                      </span>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="py-3">
                            <CardTitle className="text-lg flex items-center text-blue-600">
                              <Clipboard className="mr-2 h-5 w-5" />
                              Action Items
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {getFilteredItems(eventAARs, 'actionItems').map((item: AARItem, i) => (
                                <li key={item.id || i} className="flex items-start">
                                  <Clipboard className="mr-2 h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                                  <div className="flex flex-col">
                                    <span>{typeof item === 'object' ? item.text : item}</span>
                                    {typeof item === 'object' && (
                                      <span className="text-xs text-muted-foreground mt-1">
                                        {usersMap[item.authorId]?.name || 'Unknown'} ({item.authorRank}) - {unitsMap[item.unitId]?.name || 'Unknown Unit'}
                                      </span>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="sustain">
                      <div className="my-4">
                        <ul className="space-y-3">
                          {getFilteredItems(eventAARs, 'sustainItems').map((item: AARItem, i) => (
                            <li key={i} className="flex items-start p-3 border rounded-md hover:bg-muted/50">
                              <CheckCircle2 className="mr-3 h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="font-medium">{item.text}</div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {unitsMap[item.unitId]?.name || "Unknown Unit"} · {item.authorRank} {usersMap[item.authorId]?.name || "Unknown"}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="improve">
                      <div className="my-4">
                        <ul className="space-y-3">
                          {getFilteredItems(eventAARs, 'improveItems').map((item: AARItem, i) => (
                            <li key={i} className="flex items-start p-3 border rounded-md hover:bg-muted/50">
                              <XCircle className="mr-3 h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="font-medium">{item.text}</div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {unitsMap[item.unitId]?.name || "Unknown Unit"} · {item.authorRank} {usersMap[item.authorId]?.name || "Unknown"}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="action">
                      <div className="my-4">
                        <ul className="space-y-3">
                          {getFilteredItems(eventAARs, 'actionItems').map((item: AARItem, i) => (
                            <li key={i} className="flex items-start p-3 border rounded-md hover:bg-muted/50">
                              <Clipboard className="mr-3 h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="font-medium">{item.text}</div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {unitsMap[item.unitId]?.name || "Unknown Unit"} · {item.authorRank} {usersMap[item.authorId]?.name || "Unknown"}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
                <CardFooter className="bg-muted/50 justify-between">
                  <div className="text-sm text-muted-foreground">
                    {eventAARs.length} total feedback submissions
                  </div>
                  <Link href={`/aars/event/${event.id}`}>
                    <Button variant="outline" size="sm">View All Details</Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}