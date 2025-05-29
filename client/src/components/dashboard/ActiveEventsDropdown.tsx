import React from "react";
import { Link } from "wouter";
import {
  ChevronRight,
  CalendarClock,
  Loader2,
  MapPin,
  CalendarDays,
  Users,
} from "lucide-react";
import { trainingStepInfo } from "../../lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { format } from "date-fns";
import { Event } from "../../lib/types";

interface ActiveEventsDropdownProps {
  events: Event[];
  isLoading?: boolean;
}

export default function ActiveEventsDropdown({
  events,
  isLoading = false,
}: ActiveEventsDropdownProps) {
  const [selectedEventId, setSelectedEventId] = React.useState<string>("");

  const handleEventSelect = (value: string) => {
    setSelectedEventId(value);
  };

  // Sort events by date (ascending)
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = a.date ? new Date(a.date) : new Date();
    const dateB = b.date ? new Date(b.date) : new Date();
    return dateA.getTime() - dateB.getTime();
  });

  // Set the first event as selected by default if none is selected and events exist
  React.useEffect(() => {
    if (sortedEvents.length > 0 && !selectedEventId) {
      setSelectedEventId(sortedEvents[0].id.toString());
    }
  }, [sortedEvents, selectedEventId]);

  const selectedEvent = selectedEventId
    ? events.find((e) => e.id.toString() === selectedEventId)
    : null;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <CalendarClock className="h-5 w-5" />
          <span>In-Progress Events</span>
        </CardTitle>
        <CardDescription>Current training activities</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No active events found
          </div>
        ) : (
          <div className="space-y-4">
            <Select value={selectedEventId} onValueChange={handleEventSelect}>
              <SelectTrigger className="w-full bg-muted/40">
                <SelectValue placeholder="Select an event" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Active Events</SelectLabel>
                  {sortedEvents.map((event) => (
                    <SelectItem key={event.id} value={event.id.toString()}>
                      <div className="flex items-center">
                        <span className="truncate">{event.title}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {selectedEvent && (
              <div className="rounded-lg border border-muted/80 bg-card shadow-sm overflow-hidden">
                <div className="bg-muted/20 px-4 py-3 border-b border-muted">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-base">
                      {selectedEvent.title}
                    </h3>
                    <Badge variant="outline">
                      {trainingStepInfo[selectedEvent.step - 1]?.name ||
                        `Step ${selectedEvent.step}`}
                    </Badge>
                  </div>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    {/* Training Progress Steps Visualization */}
                    <div className="mb-4">
                      <div className="mb-2">
                        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{
                              width: `${(selectedEvent.step / 8) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-8 gap-1 mt-2">
                        {trainingStepInfo.map((step, index) => {
                          const isCompleted = index + 1 < selectedEvent.step;
                          const isCurrent = index + 1 === selectedEvent.step;
                          const isPending = index + 1 > selectedEvent.step;

                          return (
                            <div key={step.id} className="text-center">
                              <div
                                className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center ${
                                  isCompleted
                                    ? "bg-primary"
                                    : isCurrent
                                    ? "bg-primary"
                                    : "bg-gray-200"
                                }`}
                              >
                                <span
                                  className={`text-xs font-medium ${
                                    isCompleted || isCurrent
                                      ? "text-white"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {step.id}
                                </span>
                              </div>
                              <div
                                className="mt-1 text-[10px] leading-tight"
                                title={step.name}
                              >
                                {step.name.length > 6
                                  ? `${step.name.slice(0, 6)}...`
                                  : step.name}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {selectedEvent.objectives && (
                      <p className="text-sm text-muted-foreground">
                        {selectedEvent.objectives}
                      </p>
                    )}

                    <div className="flex flex-col gap-2 text-sm">
                      {selectedEvent.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedEvent.location}</span>
                        </div>
                      )}
                      {selectedEvent.date && (
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {format(
                              new Date(selectedEvent.date),
                              "MMM d, yyyy"
                            )}
                          </span>
                        </div>
                      )}
                      {selectedEvent.participants &&
                        selectedEvent.participants.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {selectedEvent.participants.length} participants
                            </span>
                          </div>
                        )}
                    </div>

                    <Link href={`/events/${selectedEvent.id}`}>
                      <Button className="w-full mt-2" size="sm">
                        View Event Details
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
