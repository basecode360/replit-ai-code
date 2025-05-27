import { useState, useEffect } from "react";
import { 
  format, startOfToday, eachDayOfInterval, endOfMonth, startOfMonth, isEqual, 
  isSameMonth, isToday, addMonths, subMonths, parseISO, isWithinInterval, getDay,
  addDays, startOfWeek, endOfWeek, getDate, getMonth, getYear
} from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, AlertCircle, ExternalLink, Filter, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Event, Unit, User } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { useHierarchy } from "@/hooks/use-hierarchy";

interface EventCalendarProps {
  events: Event[];
  viewType?: "week" | "month";
  accessibleUnits?: Unit[];
  accessibleUsers?: User[];
}

export default function EventCalendar({ events, viewType = "month", accessibleUnits, accessibleUsers }: EventCalendarProps) {
  const today = startOfToday();
  const [currentMonth, setCurrentMonth] = useState(today);
  const [selectedDay, setSelectedDay] = useState(today);
  const [activeView, setActiveView] = useState(viewType);
  
  // Filter state
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedUnitIds, setSelectedUnitIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOption, setFilterOption] = useState<"all" | "parent" | "specific">("all");
  
  // Get hierarchy data for filtering
  const { accessibleUnits: units, accessibleUsers: users } = useHierarchy();
  
  // Apply filters to events
  const filteredEvents = events.filter(event => {
    // No filters applied
    if (filterOption === "all" && !searchQuery) {
      return true;
    }
    
    // Filter by specific units
    if (filterOption === "specific" && selectedUnitIds.length > 0) {
      if (!event.unitId || !selectedUnitIds.includes(event.unitId)) {
        return false;
      }
    }
    
    // Search query matching
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = event.title?.toLowerCase().includes(query);
      const matchesLocation = event.location?.toLowerCase().includes(query);
      
      // Search by participating unit names
      const matchesUnit = units?.some(unit => 
        unit.id === event.unitId && unit.name.toLowerCase().includes(query)
      );
      
      // Search by participating users
      const matchesParticipants = event.participants?.some(participantId => 
        users?.some(user => 
          user.id === participantId && 
          (user.name?.toLowerCase().includes(query) || 
           user.username?.toLowerCase().includes(query))
        )
      );
      
      return matchesTitle || matchesLocation || matchesUnit || matchesParticipants;
    }
    
    return true;
  });
  
  // Function to go to previous month
  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };
  
  // Function to go to next month
  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };
  
  // Generate days for the current month view
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  // Generate all visible calendar days, including those from previous/next months
  // that appear in the calendar grid to complete the weeks
  const firstDayOfMonth = getDay(monthStart); // 0-6 (Sunday-Saturday)
  const daysFromPrevMonth = firstDayOfMonth;
  
  // Calculate days from next month to complete the grid
  const lastDayOfMonth = getDay(monthEnd); // 0-6 (Sunday-Saturday)
  const daysFromNextMonth = 6 - lastDayOfMonth; 
  
  // Get all calendar days, including those from adjacent months for a complete grid
  const calendarStart = addDays(monthStart, -daysFromPrevMonth);
  const calendarEnd = addDays(monthEnd, daysFromNextMonth);
  
  // Generate all days for the calendar
  const calendarDays = eachDayOfInterval({ 
    start: calendarStart, 
    end: calendarEnd 
  });

  
  // Handle filter option changes
  const handleFilterOptionChange = (value: string) => {
    if (value === "all" || value === "parent" || value === "specific") {
      setFilterOption(value);
      
      // Reset unit selection when changing filter type
      if (value !== "specific") {
        setSelectedUnitIds([]);
      }
    }
  };
  
  // Handle unit selection changes
  const handleUnitSelectionChange = (unitId: number, checked: boolean) => {
    if (checked) {
      setSelectedUnitIds(prev => [...prev, unitId]);
    } else {
      setSelectedUnitIds(prev => prev.filter(id => id !== unitId));
    }
  };
  
  // Reset all filters
  const resetFilters = () => {
    setFilterOption("all");
    setSelectedUnitIds([]);
    setSearchQuery("");
  };
  
  // Get events for the selected day
  const getEventsForDay = (day: Date) => {
    return filteredEvents.filter(event => {
      // First check if it's a multi-day event
      if (event.isMultiDayEvent && event.endDate) {
        const startDate = typeof event.date === 'string' 
          ? parseISO(event.date) 
          : new Date(event.date);
          
        const endDate = typeof event.endDate === 'string' 
          ? parseISO(event.endDate) 
          : new Date(event.endDate);
          
        // Check if the day falls within the event's date range
        return isWithinInterval(day, { start: startDate, end: endDate }) ||
               isEqual(startDate, day) || 
               isEqual(endDate, day);
      }
      
      // For single day events with execution date
      if (event.executionDate) {
        const executionDate = typeof event.executionDate === 'string' 
          ? parseISO(event.executionDate) 
          : event.executionDate;
        return isEqual(executionDate, day);
      }
      
      // For single day events with regular date
      if (event.date) {
        const eventDate = typeof event.date === 'string' 
          ? parseISO(event.date) 
          : new Date(event.date);
        return isEqual(eventDate, day);
      }
      
      return false;
    });
  };
  
  // Get all events for the next 7 days (week view)
  const next7Days = eachDayOfInterval({ 
    start: today, 
    end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6) 
  });
  
  // Get events for the week
  const weekEvents = next7Days.map(day => {
    return {
      date: day,
      events: getEventsForDay(day)
    };
  });
  
  // Count events for each day to display indicators
  const getEventCountForDay = (day: Date) => {
    return getEventsForDay(day).length;
  };
  
  // Check if any events overlap on the same day
  const hasOverlappingEvents = (day: Date) => {
    return getEventCountForDay(day) > 1;
  };
  
  // Get events for the selected day
  const selectedDayEvents = getEventsForDay(selectedDay);

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <CalendarIcon className="mr-2 h-5 w-5" />
            Event Calendar
          </div>
          <div className="flex gap-2">
            <Button 
              variant={activeView === "week" ? "default" : "outline"} 
              size="sm"
              onClick={() => setActiveView("week")}
            >
              Week
            </Button>
            <Button 
              variant={activeView === "month" ? "default" : "outline"} 
              size="sm"
              onClick={() => setActiveView("month")}
            >
              Month
            </Button>
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-1",
                    (selectedUnitIds.length > 0 || searchQuery) && "bg-accent text-accent-foreground"
                  )}
                >
                  <Filter className="h-3.5 w-3.5" />
                  {(selectedUnitIds.length > 0 || searchQuery) ? "Filters Applied" : "Filter"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Filter Events</h4>
                    <p className="text-sm text-muted-foreground">
                      Show events for specific units or find events by name, location, or participating personnel.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="filter-option">Display events from</Label>
                    <Select 
                      value={filterOption} 
                      onValueChange={handleFilterOptionChange}
                    >
                      <SelectTrigger id="filter-option">
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All units</SelectItem>
                        <SelectItem value="parent">Parent unit only</SelectItem>
                        <SelectItem value="specific">Specific units</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {filterOption === "specific" && units && units.length > 0 && (
                    <div className="space-y-2">
                      <Label>Select units</Label>
                      <ScrollArea className="h-32 w-full rounded-md border">
                        <div className="p-2 space-y-2">
                          {units.map(unit => (
                            <div key={unit.id} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`unit-${unit.id}`}
                                checked={selectedUnitIds.includes(unit.id)}
                                onCheckedChange={(checked) => 
                                  handleUnitSelectionChange(unit.id, checked === true)
                                }
                              />
                              <Label 
                                htmlFor={`unit-${unit.id}`}
                                className="text-sm cursor-pointer"
                              >
                                {unit.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="search-events">Search events</Label>
                    <div className="flex items-center">
                      <Input
                        id="search-events"
                        placeholder="Search by name, location, units or personnel"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1"
                      />
                      {searchQuery && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSearchQuery("")}
                          className="ml-1 h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Find events by name, location, participating units, or users
                    </p>
                  </div>
                  
                  <div className="flex justify-between">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={resetFilters}
                    >
                      Reset filters
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => setFilterOpen(false)}
                    >
                      Apply filters
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardTitle>
        <CardDescription>
          {selectedUnitIds.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {selectedUnitIds.map(id => {
                const unit = units?.find(u => u.id === id);
                return unit ? (
                  <Badge 
                    key={unit.id} 
                    variant="outline" 
                    className="text-xs flex items-center gap-1"
                  >
                    {unit.name}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-3 w-3 p-0" 
                      onClick={() => handleUnitSelectionChange(unit.id, false)}
                    >
                      <X className="h-2 w-2" />
                    </Button>
                  </Badge>
                ) : null;
              })}
            </div>
          )}
          {searchQuery ? (
            <div className="mt-1">
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                Search: {searchQuery}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-3 w-3 p-0" 
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            </div>
          ) : (
            "Upcoming events and training sessions"
          )}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-4">
        {/* Month View */}
        {activeView === "month" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={previousMonth}
                  className="h-7 w-7"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={nextMonth}
                  className="h-7 w-7"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 text-center text-xs leading-6 text-muted-foreground mb-1">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>
            
            <div className="grid grid-cols-7 text-sm">
              {calendarDays.map((day) => {
                const eventCount = getEventCountForDay(day);
                const hasOverlap = hasOverlappingEvents(day);
                
                return (
                  <div
                    key={day.toString()}
                    className={cn(
                      "relative h-14 border p-1",
                      !isSameMonth(day, currentMonth) && "bg-muted/50",
                      isEqual(day, selectedDay) && "bg-accent",
                      isToday(day) && "border-primary",
                    )}
                    onClick={() => setSelectedDay(day)}
                  >
                    <div className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                      isToday(day) && "bg-primary text-primary-foreground",
                      isEqual(day, selectedDay) && !isToday(day) && "bg-accent-foreground text-accent"
                    )}>
                      {/* Show day number and add day of week for screen readers */}
                      {format(day, 'd')}
                      <span className="sr-only">{format(day, 'EEEE')}</span>
                    </div>
                    
                    {eventCount > 0 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="absolute bottom-1 right-1">
                              <Badge variant={hasOverlap ? "destructive" : "default"} className="text-xs">
                                {eventCount}
                              </Badge>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {hasOverlap ? (
                              <span className="flex items-center">
                                <AlertCircle className="h-3 w-3 mr-1 text-destructive" />
                                Multiple events scheduled
                              </span>
                            ) : (
                              <span>{eventCount} event{eventCount > 1 ? 's' : ''}</span>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                );
              })}
            </div>
            
            {selectedDayEvents.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium text-sm">
                  Events on {format(selectedDay, 'MMMM d, yyyy')}
                </h3>
                <ScrollArea className="h-[120px] mt-2">
                  <div className="space-y-2">
                    {selectedDayEvents.map((event) => (
                      <Link key={event.id} href={`/events/${event.id}`}>
                        <div className="flex items-center space-x-2 p-2 border rounded-md text-sm hover:bg-muted cursor-pointer">
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            event.step >= 7 ? "bg-green-500" : "bg-blue-500"
                          )} />
                          <div className="flex-1">
                            <div className="font-medium">{event.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {event.location || "No location"} • Step {event.step}
                            </div>
                          </div>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
        
        {/* Week View */}
        {activeView === "week" && (
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Next 7 Days
            </h2>
            
            <div className="space-y-3">
              {weekEvents.map(({ date, events }) => (
                <div key={date.toString()} className="flex items-start border-l-2 pl-3 py-1 hover:bg-muted/50 rounded-sm">
                  <div className={cn(
                    "w-16 mr-4 flex-shrink-0",
                    isToday(date) && "font-bold text-primary"
                  )}>
                    <div>{format(date, 'EEE')}</div>
                    <div>{format(date, 'MMM d')}</div>
                  </div>
                  
                  <div className="flex-1">
                    {events.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-1">No events scheduled</div>
                    ) : (
                      <div className="space-y-2">
                        {events.map(event => (
                          <Link key={event.id} href={`/events/${event.id}`}>
                            <div className="flex items-center space-x-2 p-2 border rounded-md text-sm bg-card hover:bg-muted cursor-pointer">
                              <div className={cn(
                                "h-2 w-2 rounded-full",
                                event.step >= 7 ? "bg-green-500" : "bg-blue-500"
                              )} />
                              <div className="flex-1">
                                <div className="font-medium">{event.title}</div>
                                <div className="text-xs text-muted-foreground">
                                  {event.location || "No location"} • Step {event.step}
                                </div>
                              </div>
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}