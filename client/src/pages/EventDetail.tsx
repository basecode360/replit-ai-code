import { useEffect, useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Loader2,
  Calendar,
  MapPin,
  Users,
  Target,
  Box,
  Clipboard,
  ArrowLeft,
  FileText,
  PlusCircle,
  UserPlus,
  Building,
  Shield,
  X,
} from "lucide-react";
import { format, isPast } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { TrainingSteps } from "../../../shared/schema"
import { Separator } from "../components/ui/separator";
import { apiRequest, queryClient } from "../lib/queryClient";
import { Event, Unit, User } from "@shared/schema";
import EventTimeline from "../components/events/EventTimeline";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../lib/auth-provider";
import { useHierarchy } from "../hooks/use-hierarchy";
import { RequestAARFeedbackDialog } from "../components/aars/RequestAARFeedbackDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "../components/ui/form";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

// Define an interface for the timeline steps
interface TimelineStep {
  id: number;
  status: "complete" | "in-progress" | "pending";
  date?: Date;
}

// Input schema for the form (before transformation)
const addParticipantsInputSchema = z.object({
  participantIds: z.string().min(1, "At least one participant ID is required"),
});

// Schema with transformation logic
const addParticipantsSchema = addParticipantsInputSchema.transform((data) => ({
  participantIds: data.participantIds
    .split(",")
    .map((id) => parseInt(id.trim())),
}));

// Types for the form and the transformed data
type AddParticipantsInputValues = z.infer<typeof addParticipantsInputSchema>;
type AddParticipantsFormValues = z.infer<typeof addParticipantsSchema>;

// Input schema for adding units
const addUnitInputSchema = z.object({
  unitId: z.string().min(1, "Unit ID is required"),
});

// Schema with transformation logic
const addUnitSchema = addUnitInputSchema.transform((data) => ({
  unitId: parseInt(data.unitId),
}));

// Types for the form and the transformed data
type AddUnitInputValues = z.infer<typeof addUnitInputSchema>;
type AddUnitFormValues = z.infer<typeof addUnitSchema>;

// Schema for editing event details
const editEventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  date: z.string().min(1, "Date is required"),
  endDate: z.string().optional(),
  isMultiDayEvent: z.boolean().default(false),
  location: z.string().min(3, "Location must be at least 3 characters"),
  objectives: z.string().min(10, "Objectives must be at least 10 characters"),
  missionStatement: z.string().optional(),
  conceptOfOperation: z.string().optional(),
  resources: z.string().optional(),
  participantIds: z.array(z.number()).optional(),
  participatingUnitIds: z.array(z.number()).optional(),
  notifyParticipants: z.boolean().default(true),
  eventType: z.string().default("training"),
  step: z.number().optional(),
  // Step notes
  step1Notes: z.string().optional(),
  step2Notes: z.string().optional(),
  step3Notes: z.string().optional(),
  step4Notes: z.string().optional(),
  step5Notes: z.string().optional(),
  step6Notes: z.string().optional(),
  step7Notes: z.string().optional(),
  step8Notes: z.string().optional(),
  // Step dates
  step1Date: z.string().optional(),
  step2Date: z.string().optional(),
  step3Date: z.string().optional(),
  step4Date: z.string().optional(),
  step5Date: z.string().optional(),
  step6Date: z.string().optional(),
  step7Date: z.string().optional(),
  step8Date: z.string().optional(),
});

// Type for the edit form values
type EditEventFormValues = z.infer<typeof editEventSchema>;

export default function EventDetail() {
  const [, params] = useRoute<{ id: string }>("/events/:id");
  const eventId = params ? parseInt(params.id) : 0;
  const [showAddParticipantsDialog, setShowAddParticipantsDialog] =
    useState(false);
  const [showAddUnitDialog, setShowAddUnitDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showRequestAARDialog, setShowRequestAARDialog] = useState(false);
  const [showAIAnalysisDialog, setShowAIAnalysisDialog] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  // Query for event details
  const {
    data: event,
    isLoading: eventLoading,
    isError: eventError,
    refetch: refetchEvent,
  } = useQuery({
    queryKey: ["/api/events", eventId],
    queryFn: async () => {
      if (eventId <= 0) return null;
      const res = await apiRequest("GET", `/api/events/${eventId}`);
      return await res.json();
    },
    enabled: eventId > 0,
  });

  // Query for AARs related to this event
  const { data: aars, isLoading: aarsLoading } = useQuery({
    queryKey: ["/api/events", eventId, "aars"],
    queryFn: async () => {
      if (eventId <= 0) return [];
      const res = await apiRequest("GET", `/api/events/${eventId}/aars`);
      return await res.json();
    },
    enabled: eventId > 0,
  });

  // Query for users to display participant names
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      return await res.json();
    },
  });

  // Query for units to display unit names
  const { data: units, isLoading: unitsLoading } = useQuery({
    queryKey: ["/api/units"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/units");
      return await res.json();
    },
  });

  // Form for adding participants
  const addParticipantsForm = useForm<AddParticipantsInputValues>({
    resolver: zodResolver(addParticipantsInputSchema),
    defaultValues: {
      participantIds: "",
    },
  });

  // Form for adding units
  const addUnitForm = useForm<AddUnitInputValues>({
    resolver: zodResolver(addUnitInputSchema),
    defaultValues: {
      unitId: "",
    },
  });

  // Form for editing event details
  const editEventForm = useForm<EditEventFormValues>({
    resolver: zodResolver(editEventSchema),
    defaultValues: {
      title: "",
      location: "",
      objectives: "",
      resources: "",
      date: "",
      isMultiDayEvent: false,
      endDate: "",
    },
  });

  // Set edit form values when event data is loaded
  useEffect(() => {
    if (event) {
      editEventForm.reset({
        title: event.title,
        location: event.location,
        objectives: event.objectives,
        resources: event.resources || "",
        date: event.date
          ? new Date(event.date).toISOString().split("T")[0]
          : "",
        isMultiDayEvent: event.isMultiDayEvent,
        endDate: event.endDate
          ? new Date(event.endDate).toISOString().split("T")[0]
          : "",
        missionStatement: event.missionStatement || "",
        conceptOfOperation: event.conceptOfOperation || "",
        participantIds: event.participants || [],
        participatingUnitIds: event.participatingUnits || [],
        notifyParticipants: event.notifyParticipants !== false,
        eventType: event.eventType || "training",
        step: event.step,
        // Step notes
        step1Notes: event.step1Notes || "",
        step2Notes: event.step2Notes || "",
        step3Notes: event.step3Notes || "",
        step4Notes: event.step4Notes || "",
        step5Notes: event.step5Notes || "",
        step6Notes: event.step6Notes || "",
        step7Notes: event.step7Notes || "",
        step8Notes: event.step8Notes || "",
        // Step dates
        step1Date: event.step1Date
          ? new Date(event.step1Date).toISOString().split("T")[0]
          : "",
        step2Date: event.step2Date
          ? new Date(event.step2Date).toISOString().split("T")[0]
          : "",
        step3Date: event.step3Date
          ? new Date(event.step3Date).toISOString().split("T")[0]
          : "",
        step4Date: event.step4Date
          ? new Date(event.step4Date).toISOString().split("T")[0]
          : "",
        step5Date: event.step5Date
          ? new Date(event.step5Date).toISOString().split("T")[0]
          : "",
        step6Date: event.step6Date
          ? new Date(event.step6Date).toISOString().split("T")[0]
          : "",
        step7Date: event.step7Date
          ? new Date(event.step7Date).toISOString().split("T")[0]
          : "",
        step8Date: event.step8Date
          ? new Date(event.step8Date).toISOString().split("T")[0]
          : "",
      });
    }
  }, [event, editEventForm]);

  // Mutation for adding participants to event
  const addParticipantsMutation = useMutation({
    mutationFn: async (formData: AddParticipantsFormValues) => {
      const res = await apiRequest(
        "POST",
        `/api/events/${eventId}/add-participants`,
        formData
      );
      return await res.json();
    },
    onSuccess: () => {
      setShowAddParticipantsDialog(false);
      addParticipantsForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({
        title: "Success",
        description: "Participants added to event",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add participants: " + error,
        variant: "destructive",
      });
    },
  });

  // Mutation for adding unit to event
  const addUnitMutation = useMutation({
    mutationFn: async (formData: AddUnitFormValues) => {
      const res = await apiRequest(
        "POST",
        `/api/events/${eventId}/add-unit`,
        formData
      );
      return await res.json();
    },
    onSuccess: () => {
      setShowAddUnitDialog(false);
      addUnitForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({
        title: "Success",
        description: "Unit added to event",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add unit: " + error,
        variant: "destructive",
      });
    },
  });

  // Mutation for editing event details
  const editEventMutation = useMutation({
    mutationFn: async (formData: EditEventFormValues) => {
      const res = await apiRequest("PATCH", `/api/events/${eventId}`, formData);
      return await res.json();
    },
    onSuccess: () => {
      setShowEditDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Success",
        description: "Event details updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update event: " + error,
        variant: "destructive",
      });
    },
  });

  // Mutation for marking event as complete (advancing to step 8)
  const completeEventMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/events/${eventId}`, {
        step: 8,
      });
      return await res.json();
    },
    onSuccess: () => {
      setShowCompleteDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Success",
        description: "Event marked as complete",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to complete event: " + error,
        variant: "destructive",
      });
    },
  });

  // Handler for submitting the add participants form
  const onAddParticipantsSubmit = (values: AddParticipantsInputValues) => {
    const transformedValues = addParticipantsSchema.parse(values);
    addParticipantsMutation.mutate(transformedValues);
  };

  // Handler for submitting the add unit form
  const onAddUnitSubmit = (values: AddUnitInputValues) => {
    const transformedValues = addUnitSchema.parse(values);
    addUnitMutation.mutate(transformedValues);
  };

  // Handler for submitting the edit event form
  const onEditEventSubmit = (values: EditEventFormValues) => {
    // Handle empty string dates by converting them to null
    const dateFields = [
      "step1Date",
      "step2Date",
      "step3Date",
      "step4Date",
      "step5Date",
      "step6Date",
      "step7Date",
      "step8Date",
    ];

    const processedValues = { ...values };

    // Process all step date fields
    for (const field of dateFields) {
      if (
        field in processedValues &&
        (!processedValues[field] || processedValues[field] === "")
      ) {
        processedValues[field] = null;
      }
    }

    // Handle endDate special case
    const updatedValues = {
      ...processedValues,
      endDate: processedValues.isMultiDayEvent ? processedValues.endDate : null,
    };

    editEventMutation.mutate(updatedValues);
  };

  // Handler for confirming event completion
  const onConfirmEventComplete = () => {
    completeEventMutation.mutate();
  };

  // Function to generate AI analysis of AARs
  const generateAIAnalysis = async () => {
    try {
      setAiAnalysisLoading(true);

      // Get the unit ID from the event
      const unitId = event.unitId;

      // Call the API endpoint for GreenBookAAR analysis
      const response = await apiRequest(
        "GET",
        `/api/events/${eventId}/analysis`
      );

      if (!response.ok) {
        throw new Error("Failed to generate analysis");
      }

      const data = await response.json();
      setAiAnalysis(data);
    } catch (error) {
      toast({
        title: "Analysis failed",
        description:
          "There was an error generating the GreenBookAAR analysis. Please try again.",
        variant: "destructive",
      });
      console.error("AI analysis error:", error);
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  if (eventLoading || usersLoading || unitsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading event details...</span>
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-xl font-bold">Event not found or error loading</h1>
        <p className="text-muted-foreground">
          There was an issue loading this event.
        </p>
        <Button asChild className="mt-4">
          <Link href="/events">Go Back to Events</Link>
        </Button>
      </div>
    );
  }

  // Create timeline steps based on the 8-step training model
  const timelineSteps: TimelineStep[] = Array.from({ length: 8 }, (_, i) => {
    // Get the corresponding step date from the event
    const stepNum = i + 1;
    const stepDateKey = `step${stepNum}Date` as keyof typeof event;
    const stepDate = event[stepDateKey]
      ? new Date(event[stepDateKey] as string)
      : undefined;

    return {
      id: stepNum,
      status:
        stepNum < event.step
          ? "complete"
          : stepNum === event.step
          ? "in-progress"
          : "pending",
      date: stepDate,
    };
  });

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <Button variant="outline" size="sm" asChild className="mb-2">
            <Link href="/events">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Events
            </Link>
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold">{event.title}</h1>
          <p className="text-muted-foreground">
            Step {event.step}:{" "}
            {Object.entries(TrainingSteps)[event.step - 1][1]}
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 mt-4 md:mt-0">
          <Button variant="outline" onClick={() => setShowEditDialog(true)}>
            Edit Event
          </Button>
          {event.step < 8 && (
            <Button onClick={() => setShowCompleteDialog(true)}>
              Mark as Complete
            </Button>
          )}
          <Button asChild>
            <Link href={`/submit-aar/${event.id}`}>
              <FileText className="mr-2 h-4 w-4" /> Submit AAR
            </Link>
          </Button>
          {(event.step === 8 || isPast(new Date(event.date))) && (
            <Button
              onClick={() => setShowRequestAARDialog(true)}
              variant="secondary"
            >
              <Users className="mr-2 h-4 w-4" /> Request AAR Feedback
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-muted-foreground">
                Date
              </span>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{format(new Date(event.date), "MMMM d, yyyy")}</span>
                {event.isMultiDayEvent && event.endDate && (
                  <span>
                    {" "}
                    - {format(new Date(event.endDate), "MMMM d, yyyy")}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-muted-foreground">
                Location
              </span>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{event.location}</span>
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-muted-foreground">
                Objectives
              </span>
              <div className="flex items-start">
                <Target className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                <span>{event.objectives}</span>
              </div>
            </div>

            {event.resources && (
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-muted-foreground">
                  Resources
                </span>
                <div className="flex items-start">
                  <Box className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                  <span>{event.resources}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-muted-foreground">
                Participants
              </span>
              <div className="flex items-start">
                <Users className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                <div className="flex flex-wrap gap-2">
                  {event.participants && event.participants.length > 0 ? (
                    event.participants.map((participantId) => {
                      const participant = users?.find(
                        (u) => u.id === participantId
                      );
                      return participant ? (
                        <Badge key={participant.id} variant="outline">
                          {participant.rank} {participant.name}
                        </Badge>
                      ) : (
                        <Badge key={participantId} variant="outline">
                          Unknown User {participantId}
                        </Badge>
                      );
                    })
                  ) : (
                    <span className="text-muted-foreground">
                      No participants assigned
                    </span>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2 h-6"
                    onClick={() => setShowAddParticipantsDialog(true)}
                  >
                    <PlusCircle className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-muted-foreground">
                Participating Units
              </span>
              <div className="flex items-start">
                <Shield className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                <div className="flex flex-wrap gap-2">
                  {event.participatingUnits &&
                  event.participatingUnits.length > 0 ? (
                    event.participatingUnits.map((unitId) => {
                      const unit = units?.find((u) => u.id === unitId);
                      return (
                        <Badge key={unitId} variant="outline">
                          {unit?.name || `Unknown Unit ${unitId}`}
                        </Badge>
                      );
                    })
                  ) : (
                    <span className="text-muted-foreground">
                      No units assigned
                    </span>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2 h-6"
                    onClick={() => setShowAddUnitDialog(true)}
                  >
                    <PlusCircle className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Training Progress</CardTitle>
            <CardDescription>
              Track the 8-step training model progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EventTimeline steps={timelineSteps} />
          </CardContent>
        </Card>

        {aars && aars.length > 0 && (
          <Card className="md:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>After Action Reviews</CardTitle>
                <CardDescription>
                  {aars.length} AAR{aars.length !== 1 ? "s" : ""} submitted for
                  this event
                </CardDescription>
              </div>
              <Button
                onClick={() => setShowAIAnalysisDialog(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                GreenBookAAR Analysis
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {aars.map((aar) => (
                  <Card key={aar.id}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        AAR from{" "}
                        {units?.find((u) => u.id === aar.unitId)?.name ||
                          `Unit ${aar.unitId}`}
                      </CardTitle>
                      <CardDescription>
                        Submitted{" "}
                        {format(new Date(aar.createdAt), "MMM d, yyyy")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">
                            Sustains ({aar.sustainItems?.length || 0})
                          </h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {aar.sustainItems?.map((item) => (
                              <li key={item.id}>{item.text}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">
                            Improves ({aar.improveItems?.length || 0})
                          </h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {aar.improveItems?.map((item) => (
                              <li key={item.id}>{item.text}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">
                            Action Items ({aar.actionItems?.length || 0})
                          </h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {aar.actionItems?.map((item) => (
                              <li key={item.id}>{item.text}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Participants Dialog */}
      <Dialog
        open={showAddParticipantsDialog}
        onOpenChange={setShowAddParticipantsDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Participants</DialogTitle>
            <DialogDescription>
              Select users to add as participants
            </DialogDescription>
          </DialogHeader>
          <Form {...addParticipantsForm}>
            <form
              onSubmit={addParticipantsForm.handleSubmit(
                onAddParticipantsSubmit
              )}
              className="space-y-4"
            >
              <FormField
                control={addParticipantsForm.control}
                name="participantIds"
                render={({ field }) => (
                  <FormItem>
                    <Label>Select Participants</Label>
                    <FormControl>
                      <div className="space-y-2">
                        <div className="flex flex-col relative">
                          <Input
                            placeholder="Search for a user by name or rank"
                            className="w-full"
                            onChange={(e) => {
                              // Update search term for filtering users
                              setUserSearchTerm(e.target.value);
                            }}
                            value={userSearchTerm}
                          />

                          {userSearchTerm && userSearchTerm.length > 0 && (
                            <div className="absolute top-full z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                              {users
                                ?.filter((user) => {
                                  const searchLower =
                                    userSearchTerm.toLowerCase();
                                  return (
                                    user.name
                                      ?.toLowerCase()
                                      .includes(searchLower) ||
                                    user.rank
                                      ?.toLowerCase()
                                      .includes(searchLower) ||
                                    user.username
                                      ?.toLowerCase()
                                      .includes(searchLower)
                                  );
                                })
                                .map((user) => {
                                  // Check if user is already selected
                                  const currentIds = field.value
                                    ? field.value
                                        .split(",")
                                        .map((id) => id.trim())
                                        .filter((id) => id)
                                    : [];
                                  const isSelected = currentIds.includes(
                                    user.id.toString()
                                  );

                                  return (
                                    <div
                                      key={user.id}
                                      className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${
                                        isSelected
                                          ? "bg-accent text-accent-foreground"
                                          : ""
                                      }`}
                                      onClick={() => {
                                        if (!isSelected) {
                                          // Add the user to the selected list
                                          const newValue =
                                            currentIds.length > 0
                                              ? `${field.value}, ${user.id}`
                                              : user.id.toString();
                                          field.onChange(newValue);
                                          // Clear search after selection
                                          setUserSearchTerm("");
                                        }
                                      }}
                                    >
                                      <span className="font-medium">
                                        {user.rank} {user.name}
                                      </span>
                                      <span className="ml-auto text-xs text-muted-foreground">
                                        {user.username}
                                      </span>
                                    </div>
                                  );
                                })}

                              {users?.filter((user) => {
                                const searchLower =
                                  userSearchTerm.toLowerCase();
                                return (
                                  user.name
                                    ?.toLowerCase()
                                    .includes(searchLower) ||
                                  user.rank
                                    ?.toLowerCase()
                                    .includes(searchLower) ||
                                  user.username
                                    ?.toLowerCase()
                                    .includes(searchLower)
                                );
                              }).length === 0 && (
                                <div className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-sm text-muted-foreground">
                                  No users found
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </FormControl>
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground mb-2">
                        Selected participants:
                      </p>
                      {field.value ? (
                        <div className="flex flex-wrap gap-2">
                          {field.value
                            .split(",")
                            .map((id) => id.trim())
                            .filter((id) => id)
                            .map((id) => {
                              const userId = parseInt(id);
                              const user = users?.find((u) => u.id === userId);
                              return (
                                <Badge
                                  key={id}
                                  variant="secondary"
                                  className="flex items-center gap-1"
                                >
                                  {user
                                    ? `${user.rank} ${user.name}`
                                    : `User ${id}`}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // Remove this ID from the list
                                      const newValue = field.value
                                        .split(",")
                                        .map((val) => val.trim())
                                        .filter((val) => val && val !== id)
                                        .join(", ");
                                      field.onChange(newValue);
                                    }}
                                    className="ml-1 rounded-full hover:bg-accent p-0.5"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              );
                            })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No participants selected
                        </p>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddParticipantsDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addParticipantsMutation.isPending}
                >
                  {addParticipantsMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Participants
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Unit Dialog */}
      <Dialog open={showAddUnitDialog} onOpenChange={setShowAddUnitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Unit</DialogTitle>
            <DialogDescription>
              Select a unit to add to this event
            </DialogDescription>
          </DialogHeader>
          <Form {...addUnitForm}>
            <form
              onSubmit={addUnitForm.handleSubmit(onAddUnitSubmit)}
              className="space-y-4"
            >
              <FormField
                control={addUnitForm.control}
                name="unitId"
                render={({ field }) => (
                  <FormItem>
                    <Label>Unit</Label>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {units?.map((unit) => (
                            <SelectItem
                              key={unit.id}
                              value={unit.id.toString()}
                            >
                              {unit.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddUnitDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={addUnitMutation.isPending}>
                  {addUnitMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Unit
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event Details</DialogTitle>
            <DialogDescription>
              Update the details for this event
            </DialogDescription>
          </DialogHeader>
          <Form {...editEventForm}>
            <form
              onSubmit={editEventForm.handleSubmit(onEditEventSubmit)}
              className="space-y-6"
            >
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editEventForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <Label>Event Title</Label>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editEventForm.control}
                    name="eventType"
                    render={({ field }) => (
                      <FormItem>
                        <Label>Event Type</Label>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select event type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="training">Training</SelectItem>
                              <SelectItem value="exercise">Exercise</SelectItem>
                              <SelectItem value="mission">Mission</SelectItem>
                              <SelectItem value="certification">
                                Certification
                              </SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editEventForm.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <Label>Start Date</Label>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-4">
                    <FormField
                      control={editEventForm.control}
                      name="isMultiDayEvent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4 mt-1"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <Label>Multi-day Event</Label>
                            <p className="text-sm text-muted-foreground">
                              This event spans multiple days
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {editEventForm.watch("isMultiDayEvent") && (
                  <FormField
                    control={editEventForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <Label>End Date</Label>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={editEventForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Location</Label>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Mission & Objectives</h3>
                <FormField
                  control={editEventForm.control}
                  name="objectives"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Objectives</Label>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editEventForm.control}
                  name="missionStatement"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Mission Statement (Optional)</Label>
                      <FormControl>
                        <Textarea rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editEventForm.control}
                  name="conceptOfOperation"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Concept of Operation (Optional)</Label>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Resources</h3>
                <FormField
                  control={editEventForm.control}
                  name="resources"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Resources (Optional)</Label>
                      <FormControl>
                        <Textarea
                          rows={3}
                          {...field}
                          placeholder="List equipment, facilities, and other resources needed"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Training Step Timeline</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4 border p-4 rounded-md">
                    <h4 className="font-medium">Step 1: Plan</h4>
                    <FormField
                      control={editEventForm.control}
                      name="step1Date"
                      render={({ field }) => (
                        <FormItem>
                          <Label>Target Date</Label>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editEventForm.control}
                      name="step1Notes"
                      render={({ field }) => (
                        <FormItem>
                          <Label>Notes</Label>
                          <FormControl>
                            <Textarea
                              rows={2}
                              {...field}
                              placeholder="Planning notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4 border p-4 rounded-md">
                    <h4 className="font-medium">Step 2: Train the Trainers</h4>
                    <FormField
                      control={editEventForm.control}
                      name="step2Date"
                      render={({ field }) => (
                        <FormItem>
                          <Label>Target Date</Label>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editEventForm.control}
                      name="step2Notes"
                      render={({ field }) => (
                        <FormItem>
                          <Label>Notes</Label>
                          <FormControl>
                            <Textarea
                              rows={2}
                              {...field}
                              placeholder="Trainer preparation notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4 border p-4 rounded-md">
                    <h4 className="font-medium">Step 3: Recon the Site</h4>
                    <FormField
                      control={editEventForm.control}
                      name="step3Date"
                      render={({ field }) => (
                        <FormItem>
                          <Label>Target Date</Label>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editEventForm.control}
                      name="step3Notes"
                      render={({ field }) => (
                        <FormItem>
                          <Label>Notes</Label>
                          <FormControl>
                            <Textarea
                              rows={2}
                              {...field}
                              placeholder="Site reconnaissance notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4 border p-4 rounded-md">
                    <h4 className="font-medium">Step 4: Issue the Order</h4>
                    <FormField
                      control={editEventForm.control}
                      name="step4Date"
                      render={({ field }) => (
                        <FormItem>
                          <Label>Target Date</Label>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editEventForm.control}
                      name="step4Notes"
                      render={({ field }) => (
                        <FormItem>
                          <Label>Notes</Label>
                          <FormControl>
                            <Textarea
                              rows={2}
                              {...field}
                              placeholder="Order and instructions notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4 border p-4 rounded-md">
                    <h4 className="font-medium">Step 5: Rehearse</h4>
                    <FormField
                      control={editEventForm.control}
                      name="step5Date"
                      render={({ field }) => (
                        <FormItem>
                          <Label>Target Date</Label>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editEventForm.control}
                      name="step5Notes"
                      render={({ field }) => (
                        <FormItem>
                          <Label>Notes</Label>
                          <FormControl>
                            <Textarea
                              rows={2}
                              {...field}
                              placeholder="Rehearsal notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4 border p-4 rounded-md">
                    <h4 className="font-medium">Step 6: Execute</h4>
                    <FormField
                      control={editEventForm.control}
                      name="step6Date"
                      render={({ field }) => (
                        <FormItem>
                          <Label>Target Date</Label>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editEventForm.control}
                      name="step6Notes"
                      render={({ field }) => (
                        <FormItem>
                          <Label>Notes</Label>
                          <FormControl>
                            <Textarea
                              rows={2}
                              {...field}
                              placeholder="Execution notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4 border p-4 rounded-md">
                    <h4 className="font-medium">
                      Step 7: Evaluate the Training
                    </h4>
                    <FormField
                      control={editEventForm.control}
                      name="step7Date"
                      render={({ field }) => (
                        <FormItem>
                          <Label>Target Date</Label>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editEventForm.control}
                      name="step7Notes"
                      render={({ field }) => (
                        <FormItem>
                          <Label>Notes</Label>
                          <FormControl>
                            <Textarea
                              rows={2}
                              {...field}
                              placeholder="Evaluation notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4 border p-4 rounded-md">
                    <h4 className="font-medium">Step 8: Retrain</h4>
                    <FormField
                      control={editEventForm.control}
                      name="step8Date"
                      render={({ field }) => (
                        <FormItem>
                          <Label>Target Date</Label>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editEventForm.control}
                      name="step8Notes"
                      render={({ field }) => (
                        <FormItem>
                          <Label>Notes</Label>
                          <FormControl>
                            <Textarea
                              rows={2}
                              {...field}
                              placeholder="Retraining notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <FormField
                control={editEventForm.control}
                name="notifyParticipants"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 mt-1"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <Label>Notify Participants</Label>
                      <p className="text-sm text-muted-foreground">
                        Send notification to participants when updating this
                        event
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={editEventMutation.isPending}>
                  {editEventMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Complete Event Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Event as Complete</DialogTitle>
            <DialogDescription>
              This will mark the event as completed and advance it to the final
              step.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>
              Are you sure you want to mark this event as complete? This action
              can't be undone.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCompleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirmEventComplete}
              disabled={completeEventMutation.isPending}
              variant="default"
            >
              {completeEventMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request AAR Feedback Dialog */}
      {event && (
        <RequestAARFeedbackDialog
          eventId={event.id}
          eventTitle={event.title}
          participants={event.participants || []}
          open={showRequestAARDialog}
          onOpenChange={setShowRequestAARDialog}
        />
      )}

      {/* GreenBookAAR Analysis Dialog */}
      <Dialog
        open={showAIAnalysisDialog}
        onOpenChange={setShowAIAnalysisDialog}
      >
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>GreenBookAAR Analysis</DialogTitle>
            <DialogDescription>
              AI-powered analysis of AARs for {event.title}
            </DialogDescription>
          </DialogHeader>

          {aiAnalysisLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Analyzing AARs with GreenBookAAR...</p>
            </div>
          ) : aiAnalysis ? (
            <div className="space-y-6">
              {/* Trends Section */}
              <div>
                <h3 className="text-lg font-medium mb-3">Key Trends</h3>
                <div className="space-y-3">
                  {aiAnalysis.trends.map((trend: any, index: number) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{trend.category}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {trend.description}
                            </p>
                          </div>
                          <Badge
                            className={
                              trend.severity === "High"
                                ? "bg-red-100 text-red-800"
                                : trend.severity === "Medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }
                          >
                            {trend.severity}
                          </Badge>
                        </div>
                        <div className="mt-2">
                          <div className="h-2 bg-secondary rounded-full mt-2">
                            <div
                              className="h-2 bg-primary rounded-full"
                              style={{
                                width: `${Math.min(
                                  100,
                                  trend.frequency * 100
                                )}%`,
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-xs mt-1">
                            <span>Low frequency</span>
                            <span>High frequency</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Friction Points Section */}
              <div>
                <h3 className="text-lg font-medium mb-3">Friction Points</h3>
                <div className="space-y-3">
                  {aiAnalysis.frictionPoints.map(
                    (point: any, index: number) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold">
                                {point.category}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {point.description}
                              </p>
                            </div>
                            <Badge
                              className={
                                point.impact === "High"
                                  ? "bg-red-100 text-red-800"
                                  : point.impact === "Medium"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-green-100 text-green-800"
                              }
                            >
                              {point.impact} Impact
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  )}
                </div>
              </div>

              {/* Recommendations Section */}
              <div>
                <h3 className="text-lg font-medium mb-3">Recommendations</h3>
                <div className="space-y-3">
                  {aiAnalysis.recommendations.map((rec: any, index: number) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{rec.category}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {rec.description}
                            </p>
                          </div>
                          <Badge
                            className={
                              rec.priority === "High"
                                ? "bg-red-100 text-red-800"
                                : rec.priority === "Medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }
                          >
                            {rec.priority} Priority
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <Button onClick={generateAIAnalysis} className="mb-4">
                Generate Analysis
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Click to analyze all AARs for this event using GreenBookAAR's AI
                capabilities
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAIAnalysisDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
