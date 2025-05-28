import { useState, useEffect } from "react";
import {
  format,
  startOfToday,
  eachDayOfInterval,
  endOfMonth,
  startOfMonth,
  isEqual,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  parseISO,
  isWithinInterval,
  getDay,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ExternalLink,
  Filter,
  Search,
  X,
} from "lucide-react";
import { cn } from "./lib/utils";
import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { ScrollArea } from "./components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip";
import { Event, Unit, User } from "./lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Link } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./components/ui/popover";
import { Checkbox } from "./components/ui/checkbox";
import { Input } from "./components/ui/input";
import { Separator } from "./components/ui/separator";

type EventCalendarProps = {
  events: Event[];
  units: Unit[];
  users: User[];
};

export default function EventCalendar({
  events,
  units,
  users,
}: EventCalendarProps) {
  const today = startOfToday();
  const [currentMonth, setCurrentMonth] = useState(today);
  const [selectedDay, setSelectedDay] = useState(today);
  const [activeView, setActiveView] = useState<"month" | "week">("month");
  const [filterOption, setFilterOption] = useState<
    "all" | "parent" | "specific"
  >("all");
  const [selectedUnitIds, setSelectedUnitIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  // Filter events based on search, units, and view
  const filteredEvents = events.filter((event) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = event.title.toLowerCase().includes(query);
      const matchesLocation =
        event.location?.toLowerCase().includes(query) || false;

      if (!matchesTitle && !matchesLocation) {
        return false;
      }
    }

    // Unit filter
    if (filterOption === "specific" && selectedUnitIds.length > 0) {
      const eventUnitId = event.unitId;
      const participatingUnits = event.participatingUnits || [];

      // Check if event's unit or any participating unit is in the selected units
      if (
        !selectedUnitIds.includes(eventUnitId) &&
        !participatingUnits.some((unitId) => selectedUnitIds.includes(unitId))
      ) {
        return false;
      }
    }

    return true;
  });

  // Get events for week view (next 7 days from today)
  const nextWeekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    return date;
  });

  // Group events by day for week view
  const weekEvents = nextWeekDates.map((date) => ({
    date,
    events: getEventsForDay(date),
  }));

  // Selected day events
  const selectedDayEvents = getEventsForDay(selectedDay);

  // Navigation functions
  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Get the first and last day of the current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Get all days to display in the calendar (including days from previous/next months)
  // This creates a grid that shows the full weeks, including some days from adjacent months
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  // Get all days for the calendar view
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  // Handle filter option changes
  const handleFilterOptionChange = (value: string) => {
    if (value === "all" || value === "parent" || value === "specific") {
      setFilterOption(value as "all" | "parent" | "specific");

      // Reset unit selection when changing filter type
      if (value !== "specific") {
        setSelectedUnitIds([]);
      }
    }
  };

  // Handle unit selection changes
  const handleUnitSelectionChange = (unitId: number, checked: boolean) => {
    if (checked) {
      setSelectedUnitIds((prev) => [...prev, unitId]);
    } else {
      setSelectedUnitIds((prev) => prev.filter((id) => id !== unitId));
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setFilterOption("all");
    setSelectedUnitIds([]);
    setSearchQuery("");
  };

  // Get events for the selected day
  function getEventsForDay(day: Date) {
    return filteredEvents.filter((event) => {
      // First check if it's a multi-day event
      if (event.isMultiDayEvent && event.endDate) {
        const startDate =
          typeof event.date === "string"
            ? parseISO(event.date)
            : new Date(event.date);

        const endDate =
          typeof event.endDate === "string"
            ? parseISO(event.endDate)
            : new Date(event.endDate);

        // Check if the day falls within the event's date range
        return (
          isWithinInterval(day, { start: startDate, end: endDate }) ||
          isEqual(startDate, day) ||
          isEqual(endDate, day)
        );
      }

      // For single day events with execution date
      if (event.executionDate) {
        const executionDate =
          typeof event.executionDate === "string"
            ? parseISO(event.executionDate)
            : event.executionDate;
        return isEqual(executionDate, day);
      }

      // For single day events with regular date
      if (event.date) {
        const eventDate =
          typeof event.date === "string"
            ? parseISO(event.date)
            : new Date(event.date);
        return isEqual(eventDate, day);
      }

      return false;
    });
  }

  // Get the count of events for a specific day
  const getEventCountForDay = (day: Date) => {
    return getEventsForDay(day).length;
  };

  // Check if there are overlapping events (more than 1 event on same day)
  const hasOverlappingEvents = (day: Date) => {
    return getEventCountForDay(day) > 1;
  };

  return (
    <Card className="w-full shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg md:text-xl">
            Training Calendar
          </CardTitle>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setActiveView(activeView === "month" ? "week" : "month")
              }
            >
              {activeView === "month" ? "Week View" : "Month View"}
            </Button>

            <Popover open={filterMenuOpen} onOpenChange={setFilterMenuOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filter</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Search Events</h4>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by title or location"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                      {searchQuery && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1.5 h-6 w-6 text-muted-foreground"
                          onClick={() => setSearchQuery("")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Filter by Unit</h4>
                    <Select
                      value={filterOption}
                      onValueChange={handleFilterOptionChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select filter type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Units</SelectItem>
                        <SelectItem value="parent">
                          Parent Units Only
                        </SelectItem>
                        <SelectItem value="specific">Specific Units</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {filterOption === "specific" && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Select Units</h4>
                      <ScrollArea className="h-[150px]">
                        <div className="space-y-2">
                          {units.map((unit) => (
                            <div
                              key={unit.id}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`unit-${unit.id}`}
                                checked={selectedUnitIds.includes(unit.id)}
                                onCheckedChange={(checked) =>
                                  handleUnitSelectionChange(
                                    unit.id,
                                    checked === true
                                  )
                                }
                              />
                              <label
                                htmlFor={`unit-${unit.id}`}
                                className="text-sm cursor-pointer"
                              >
                                {unit.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      Reset Filters
                    </Button>
                    <Button size="sm" onClick={() => setFilterMenuOpen(false)}>
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <CardDescription>
          View and manage upcoming training events
        </CardDescription>

        <Tabs
          value={activeView}
          onValueChange={(value) => setActiveView(value as "month" | "week")}
          className="mt-2"
        >
          <TabsList>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="pb-6">
        {/* Month View */}
        {activeView === "month" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {format(currentMonth, "MMMM yyyy")}
              </h2>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" onClick={previousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextMonth}>
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
                      isToday(day) && "border-primary"
                    )}
                    onClick={() => setSelectedDay(day)}
                  >
                    <div
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                        isToday(day) && "bg-primary text-primary-foreground",
                        isEqual(day, selectedDay) &&
                          !isToday(day) &&
                          "bg-accent-foreground text-accent"
                      )}
                    >
                      {format(day, "d")}
                      <span className="sr-only">{format(day, "EEEE")}</span>
                    </div>

                    {eventCount > 0 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="absolute bottom-1 right-1">
                              <Badge
                                variant={hasOverlap ? "destructive" : "default"}
                                className="text-xs"
                              >
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
                              <span>
                                {eventCount} event{eventCount > 1 ? "s" : ""}
                              </span>
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
                  Events on {format(selectedDay, "MMMM d, yyyy")}
                </h3>
                <ScrollArea className="h-[120px] mt-2">
                  <div className="space-y-2">
                    {selectedDayEvents.map((event) => (
                      <Link key={event.id} href={`/events/${event.id}`}>
                        <div className="flex items-center space-x-2 p-2 border rounded-md text-sm hover:bg-muted cursor-pointer">
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full",
                              event.step >= 7 ? "bg-green-500" : "bg-blue-500"
                            )}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{event.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {event.location || "No location"} • Step{" "}
                              {event.step}
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
            <h2 className="text-lg font-semibold mb-4">Next 7 Days</h2>

            <div className="space-y-3">
              {weekEvents.map(({ date, events }) => (
                <div
                  key={date.toString()}
                  className="flex items-start border-l-2 pl-3 py-1 hover:bg-muted/50 rounded-sm"
                >
                  <div
                    className={cn(
                      "w-16 mr-4 flex-shrink-0",
                      isToday(date) && "font-bold text-primary"
                    )}
                  >
                    <div>{format(date, "EEE")}</div>
                    <div>{format(date, "MMM d")}</div>
                  </div>

                  <div className="flex-1">
                    {events.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-1">
                        No events scheduled
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {events.map((event) => (
                          <Link key={event.id} href={`/events/${event.id}`}>
                            <div className="flex items-center space-x-2 p-2 border rounded-md text-sm bg-card hover:bg-muted cursor-pointer">
                              <div
                                className={cn(
                                  "h-2 w-2 rounded-full",
                                  event.step >= 7
                                    ? "bg-green-500"
                                    : "bg-blue-500"
                                )}
                              />
                              <div className="flex-1">
                                <div className="font-medium">{event.title}</div>
                                <div className="text-xs text-muted-foreground">
                                  {event.location || "No location"} • Step{" "}
                                  {event.step}
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
