import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "./lib/queryClient";
import { queryClient } from "./lib/queryClient";
import { useToast } from "./hooks/use-toast";
import { format } from "date-fns";
import {
  CalendarIcon,
  Loader2,
  X,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "./lib/auth-provider";

// 8-Step Training Model
const trainingSteps = [
  { id: 1, name: "Plan" },
  { id: 2, name: "Train the Trainers" },
  { id: 3, name: "Recon the Site" },
  { id: 4, name: "Issue the Order" },
  { id: 5, name: "Rehearse" },
  { id: 6, name: "Execute" },
  { id: 7, name: "Evaluate the Training" },
  { id: 8, name: "Retrain" },
];

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./components/ui/form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./components/ui/accordion";

import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Checkbox } from "./components/ui/checkbox";
import { Card, CardContent, CardHeader } from "./components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./components/ui/popover";
import { Calendar } from "./components/ui/calendar";
import { cn } from "./lib/utils";
import { Badge } from "./components/ui/badge";

// Form schema for event creation
const eventFormSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    executionDate: z.date({
      required_error: "Execution date is required",
    }),
    endDate: z.date().optional(),
    isMultiDayEvent: z.boolean().default(false),
    receivedDate: z.date({
      required_error: "Date task was received is required",
    }),
    location: z.string().min(3, "Location must be at least 3 characters"),
    objectives: z.string().min(10, "Objectives must be at least 10 characters"),
    missionStatement: z.string().optional(),
    conceptOfOperation: z.string().optional(),
    resources: z.string().optional(),
    participants: z.string().optional(),
    participatingUnits: z.string().optional(),
    notifyParticipants: z.boolean().default(true),
    eventType: z.string().default("training"),
    trainingEchelon: z.string().default("squad"), // Training echelon (squad, platoon, company, etc.)
    trainingElements: z.string().optional(), // Specific elements being trained
    attachments: z.any().optional(), // For file attachments
    planningNotes: z.string().optional(),
    step1Date: z.date().optional(),
    step2Date: z.date().optional(),
    step3Date: z.date().optional(),
    step4Date: z.date().optional(),
    step5Date: z.date().optional(),
    step6Date: z.date().optional(),
    step7Date: z.date().optional(),
    step8Date: z.date().optional(),
    step1Notes: z.string().optional(),
    step2Notes: z.string().optional(),
    step3Notes: z.string().optional(),
    step4Notes: z.string().optional(),
    step5Notes: z.string().optional(),
    step6Notes: z.string().optional(),
    step7Notes: z.string().optional(),
    step8Notes: z.string().optional(),
  })
  .refine(
    (data) => !data.isMultiDayEvent || (data.isMultiDayEvent && data.endDate),
    {
      message: "End date is required for multi-day events",
      path: ["endDate"],
    }
  )
  .refine(
    (data) =>
      !data.isMultiDayEvent ||
      (data.isMultiDayEvent &&
        data.endDate &&
        data.endDate >= data.executionDate),
    {
      message: "End date must be after or the same as the start date",
      path: ["endDate"],
    }
  );

type EventFormValues = z.infer<typeof eventFormSchema>;

export default function EventForm() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [searchParticipant, setSearchParticipant] = useState("");
  const [searchUnit, setSearchUnit] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<
    { id: number; name: string }[]
  >([]);
  const [selectedUnits, setSelectedUnits] = useState<
    { id: number; name: string; unitLevel?: string }[]
  >([]);
  const [showParticipantResults, setShowParticipantResults] = useState(false);
  const [showUnitResults, setShowUnitResults] = useState(false);

  // Get default values for the form
  const defaultValues: Partial<EventFormValues> = {
    executionDate: new Date(new Date().setDate(new Date().getDate() + 30)), // Default to 30 days from now
    isMultiDayEvent: false,
    receivedDate: new Date(), // Default to today
    participants: "",
    resources: "",
    participatingUnits: "",
    notifyParticipants: true,
    eventType: "training",
    trainingEchelon: "squad",
    trainingElements: "",
    missionStatement: "",
    conceptOfOperation: "",
    planningNotes: "",
    step1Notes: "",
    step2Notes: "",
    step3Notes: "",
    step4Notes: "",
    step5Notes: "",
    step6Notes: "",
    step7Notes: "",
    step8Notes: "",
  };

  // Create form
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues,
  });

  // Set up effect to auto-populate Step 6 date with execution date
  useEffect(() => {
    const executionDate = form.getValues("executionDate");
    if (executionDate) {
      form.setValue("step6Date", executionDate);
    }

    // Set up subscription to execution date changes
    const subscription = form.watch((value, { name }) => {
      if (name === "executionDate" && value.executionDate) {
        form.setValue("step6Date", value.executionDate);
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  // Fetch users for autocomplete
  const { data: usersData = [] } = useQuery({
    queryKey: ["/api/users"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch units for autocomplete - get accessible units to ensure we get them all
  const { data: unitsData = [] } = useQuery({
    queryKey: ["/api/hierarchy/accessible-units"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter users based on search text
  const filteredUsers = searchParticipant
    ? (usersData as any[])
        .filter(
          (user: any) =>
            (user.name &&
              user.name
                .toLowerCase()
                .includes(searchParticipant.toLowerCase())) ||
            (user.username &&
              user.username
                .toLowerCase()
                .includes(searchParticipant.toLowerCase())) ||
            (user.rank &&
              user.rank.toLowerCase().includes(searchParticipant.toLowerCase()))
        )
        .slice(0, 5) // Limit to 5 suggestions
    : [];

  // Helper function to find parent unit by ID
  const findParentUnit = (parentId: number | null) => {
    if (!parentId || !unitsData || !Array.isArray(unitsData)) return null;
    return unitsData.find((unit: any) => unit.id === parentId);
  };

  // Add full unit hierarchical name (with parent units)
  const unitsWithHierarchy = Array.isArray(unitsData)
    ? unitsData.map((unit: any) => {
        let parentUnit = findParentUnit(unit.parentId);
        let grandparentUnit = parentUnit
          ? findParentUnit(parentUnit.parentId)
          : null;

        let fullName = unit.name;

        if (parentUnit) {
          fullName += ` (${parentUnit.unitLevel}: ${parentUnit.name}`;

          if (grandparentUnit) {
            fullName += `, ${grandparentUnit.unitLevel}: ${grandparentUnit.name}`;
          }

          fullName += ")";
        }

        return {
          ...unit,
          fullName,
        };
      })
    : [];

  // Filter units based on search text
  const filteredUnits =
    searchUnit && unitsWithHierarchy && Array.isArray(unitsWithHierarchy)
      ? unitsWithHierarchy
          .filter((unit: any) => {
            return (
              (unit.fullName &&
                unit.fullName
                  .toLowerCase()
                  .includes(searchUnit.toLowerCase())) ||
              (unit.name &&
                unit.name.toLowerCase().includes(searchUnit.toLowerCase())) ||
              (unit.unitLevel &&
                unit.unitLevel.toLowerCase().includes(searchUnit.toLowerCase()))
            );
          })
          .slice(0, 5) // Limit to 5 suggestions
      : [];

  // Add participant to selected list
  const addParticipant = (participant: any) => {
    if (!selectedParticipants.find((p) => p.id === participant.id)) {
      const newParticipants = [
        ...selectedParticipants,
        {
          id: participant.id,
          name: `${participant.rank || ""} ${participant.name}`.trim(),
        },
      ];

      setSelectedParticipants(newParticipants);

      // Update the form field with comma-separated IDs
      form.setValue("participants", newParticipants.map((p) => p.id).join(","));
    }
    setSearchParticipant("");
    setShowParticipantResults(false);
  };

  // Add unit to selected list
  const addUnit = (unit: any) => {
    console.log("Adding unit:", unit);
    if (!selectedUnits.find((u) => u.id === unit.id)) {
      const newUnits = [
        ...selectedUnits,
        {
          id: unit.id,
          name: unit.name,
          unitLevel: unit.unitLevel,
        },
      ];
      setSelectedUnits(newUnits);

      // Update the form field with comma-separated IDs
      form.setValue("participatingUnits", newUnits.map((u) => u.id).join(","));
    }
    setSearchUnit("");
    setShowUnitResults(false);
  };

  // Remove participant from selected list
  const removeParticipant = (id: number) => {
    const updated = selectedParticipants.filter((p) => p.id !== id);
    setSelectedParticipants(updated);

    // Update the form field
    form.setValue("participants", updated.map((p) => p.id).join(","));
  };

  // Remove unit from selected list
  const removeUnit = (id: number) => {
    const updated = selectedUnits.filter((u) => u.id !== id);
    setSelectedUnits(updated);

    // Update the form field
    form.setValue("participatingUnits", updated.map((u) => u.id).join(","));
  };

  // Create event mutation
  const createEvent = useMutation({
    mutationFn: async (values: EventFormValues) => {
      // Format participants as array of numbers
      const participantIds = values.participants
        ? values.participants
            .split(",")
            .map((id) => parseInt(id.trim()))
            .filter((id) => !isNaN(id))
        : [];

      // Format participating units as array of numbers
      const unitIds = values.participatingUnits
        ? values.participatingUnits
            .split(",")
            .map((id) => parseInt(id.trim()))
            .filter((id) => !isNaN(id))
        : [];

      // Add current user as a participant
      if (user && !participantIds.includes(user.id)) {
        participantIds.push(user.id);
      }

      // Ensure current unit is included
      const unitIdArray = user?.unitId ? [user.unitId] : [];
      if (unitIds.length > 0) {
        unitIds.forEach((id) => {
          if (!unitIdArray.includes(id)) {
            unitIdArray.push(id);
          }
        });
      }

      // Format step dates if present
      const stepDates = {
        step1Date: values.step1Date?.toISOString() || null,
        step2Date: values.step2Date?.toISOString() || null,
        step3Date: values.step3Date?.toISOString() || null,
        step4Date: values.step4Date?.toISOString() || null,
        step5Date: values.step5Date?.toISOString() || null,
        step6Date: values.step6Date?.toISOString() || null,
        step7Date: values.step7Date?.toISOString() || null,
        step8Date: values.step8Date?.toISOString() || null,
      };

      // Ensure all data is in the correct format
      const eventData = {
        title: values.title,
        unitId: user?.unitId || 1, // Default to main unit if not available
        step: 1, // Default to step 1 (Planning) - we'll maintain this for compatibility
        date: values.executionDate.toISOString(), // Use execution date as the main date
        isMultiDayEvent: values.isMultiDayEvent,
        endDate:
          values.isMultiDayEvent && values.endDate
            ? values.endDate.toISOString()
            : null,
        receivedDate: values.receivedDate.toISOString(),
        location: values.location,
        objectives: values.objectives,
        missionStatement: values.missionStatement || "",
        conceptOfOperation: values.conceptOfOperation || "",
        resources: values.resources || "", // Ensure it's not undefined
        participants: participantIds, // This should be an array of numbers
        participatingUnits: unitIdArray, // This should be an array of numbers
        notifyParticipants: values.notifyParticipants,
        eventType: values.eventType || "training",
        trainingEchelon: values.trainingEchelon || "squad",
        trainingElements: values.trainingElements || "",
        planningNotes: values.planningNotes || "",
        // Step notes
        step1Notes: values.step1Notes || "",
        step2Notes: values.step2Notes || "",
        step3Notes: values.step3Notes || "",
        step4Notes: values.step4Notes || "",
        step5Notes: values.step5Notes || "",
        step6Notes: values.step6Notes || "",
        step7Notes: values.step7Notes || "",
        step8Notes: values.step8Notes || "",
        // Step dates
        ...stepDates,
        // Attachments will be handled separately in a multipart request if needed
      };

      console.log("Submitting event data:", eventData);

      try {
        const response = await apiRequest("POST", "/api/events", eventData);

        // Invalidate the events query to refresh the list
        queryClient.invalidateQueries({ queryKey: ["/api/events"] });

        return response;
      } catch (error) {
        console.error("Error creating event:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Event created successfully",
        description:
          "Your event has been created and participants have been notified.",
      });

      // Navigate to the events page
      navigate("/events");
    },
    onError: (error) => {
      console.error("Error creating event:", error);
      toast({
        title: "Error creating event",
        description:
          "There was an error creating your event. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Add a callback to handle date field changes
  const handleDateChange = (date: Date, fieldName: string) => {
    // If this is the execution date field being changed, update Step 6 date
    if (fieldName === "executionDate") {
      form.setValue("step6Date", date);
    }
  };

  // Form submission handler
  const onSubmit = (values: EventFormValues) => {
    createEvent.mutateAsync(values);
  };

  return (
    <Card className="max-w-5xl mx-auto">
      <CardHeader>
        <h2 className="text-2xl font-bold">Create New Event</h2>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Event Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Basic Event Information</h3>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter event title (e.g. Urban Operations Training)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isMultiDayEvent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Multi-day Event</FormLabel>
                      <FormDescription>
                        Check this box if the event spans multiple days
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="executionDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>
                        {form.watch("isMultiDayEvent")
                          ? "Start Date"
                          : "Execution Date"}
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>
                                  Pick{" "}
                                  {form.watch("isMultiDayEvent")
                                    ? "start"
                                    : "execution"}{" "}
                                  date
                                </span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        {form.watch("isMultiDayEvent")
                          ? "The date when the event begins"
                          : "The date when the event will be executed"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("isMultiDayEvent") && (
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick end date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              initialFocus
                              disabled={(date) =>
                                date < form.watch("executionDate")
                              }
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          The date when the event ends
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="receivedDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date Task Received</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick received date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        When the task was received from higher headquarters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="eventType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select event type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="training">Training</SelectItem>
                          <SelectItem value="field_exercise">
                            Field Exercise
                          </SelectItem>
                          <SelectItem value="qualification">
                            Qualification
                          </SelectItem>
                          <SelectItem value="briefing">Briefing</SelectItem>
                          <SelectItem value="planning">
                            Planning Session
                          </SelectItem>
                          <SelectItem value="inspection">Inspection</SelectItem>
                          <SelectItem value="maintenance">
                            Maintenance
                          </SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Training Area, Base Name, etc."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <FormField
                  control={form.control}
                  name="trainingEchelon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Training Echelon</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select training echelon" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fire_team">Fire Team</SelectItem>
                          <SelectItem value="squad">Squad</SelectItem>
                          <SelectItem value="platoon">Platoon</SelectItem>
                          <SelectItem value="company">Company</SelectItem>
                          <SelectItem value="battalion">Battalion</SelectItem>
                          <SelectItem value="brigade">Brigade</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The echelon level of the training audience
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trainingElements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Training Elements</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Specific elements being trained (e.g. 1st and 3rd Squad)"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Specific elements that will participate in the training
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Event Details */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Event Details</h3>

              <FormField
                control={form.control}
                name="objectives"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objectives</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the objectives of this training event"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="missionStatement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mission Statement</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter the mission statement (e.g., Who, What, When, Where, Why)"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The mission statement provides the task and purpose of the
                      operation
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="conceptOfOperation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Concept of the Operation</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe how the mission will be executed"
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The concept of operation outlines the commander's intent
                      and how forces will be employed
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="resources"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resources (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="List any required resources or equipment"
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 8-Step Training Model */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium">8-Step Training Model</h3>
              <p className="text-sm text-muted-foreground">
                The 8-Step Training Model timeline helps you plan and track each
                phase of the training event. You can set target dates and add
                notes for each step.
              </p>

              <Accordion type="multiple" className="w-full">
                {trainingSteps.map((step) => (
                  <AccordionItem key={step.id} value={`step-${step.id}`}>
                    <AccordionTrigger className="hover:bg-muted/50 px-4 rounded-md">
                      Step {step.id}: {step.name}
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pt-2">
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name={`step${step.id}Date` as any}
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Target Date for {step.name}</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP")
                                      ) : (
                                        <span>Set target date (optional)</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-auto p-0"
                                  align="start"
                                >
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`step${step.id}Notes` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes for {step.name}</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder={`Add notes for ${step.name} phase`}
                                  className="min-h-[100px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* Planning Notes and Attachments */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Additional Planning Notes</h3>

              <FormField
                control={form.control}
                name="planningNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Overall Planning Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional planning notes or coordination details"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Attachments</h4>
                <div className="border border-dashed rounded-md p-6 flex flex-col items-center justify-center bg-muted/50">
                  <Input
                    type="file"
                    multiple
                    className="mx-auto mb-2"
                    onChange={(e) => {
                      const fileList = e.target.files;
                      if (fileList) {
                        setFiles(Array.from(fileList));
                      }
                    }}
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Upload OPORD, maps, diagrams or any relevant documents (Max
                    5MB each)
                  </p>

                  {files.length > 0 && (
                    <div className="mt-4 w-full">
                      <h5 className="text-sm font-medium mb-2">
                        Selected Files ({files.length})
                      </h5>
                      <ul className="space-y-2">
                        {files.map((file, index) => (
                          <li
                            key={index}
                            className="flex items-center justify-between p-2 bg-background rounded border"
                          >
                            <span className="text-sm truncate max-w-[300px]">
                              {file.name}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setFiles(files.filter((_, i) => i !== index))
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Participants and Units */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Participants and Units</h3>

              {/* Participant autocomplete */}
              <div className="space-y-4">
                <FormLabel>Participants</FormLabel>
                <div className="relative">
                  <div className="flex items-center relative">
                    <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search for participants by name, rank or username"
                      className="pl-8 pr-10"
                      value={searchParticipant}
                      onChange={(e) => {
                        setSearchParticipant(e.target.value);
                        if (e.target.value) {
                          setShowParticipantResults(true);
                        }
                      }}
                      onFocus={() => {
                        if (searchParticipant) {
                          setShowParticipantResults(true);
                        }
                      }}
                    />
                    <UserPlus className="absolute right-2.5 h-4 w-4 text-muted-foreground" />
                  </div>

                  {showParticipantResults && searchParticipant && (
                    <div className="absolute z-10 mt-1 w-full bg-background border rounded-md shadow-md">
                      {filteredUsers.length > 0 ? (
                        <ul className="py-1 max-h-60 overflow-auto">
                          {filteredUsers.map((user: any) => (
                            <li
                              key={user.id}
                              className="px-4 py-2 hover:bg-accent cursor-pointer flex items-center"
                              onClick={() => addParticipant(user)}
                            >
                              <span className="text-sm font-medium mr-2">
                                {user.rank}
                              </span>
                              <span>{user.name}</span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {user.username}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="px-4 py-2 text-sm text-muted-foreground">
                          No users found
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedParticipants.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedParticipants.map((participant) => (
                      <Badge
                        key={participant.id}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {participant.name}
                        <button
                          type="button"
                          onClick={() => removeParticipant(participant.id)}
                          className="ml-1 rounded-full hover:bg-accent p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <FormDescription>
                  Search and select participants for this event
                </FormDescription>

                <input type="hidden" {...form.register("participants")} />
              </div>

              {/* Units autocomplete */}
              <div className="space-y-4">
                <FormLabel>Participating Units</FormLabel>
                <div className="relative">
                  <div className="flex items-center relative">
                    <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search for units by name or type"
                      className="pl-8 pr-10"
                      value={searchUnit}
                      onChange={(e) => {
                        setSearchUnit(e.target.value);
                        if (e.target.value) {
                          setShowUnitResults(true);
                        }
                      }}
                      onFocus={() => {
                        if (searchUnit) {
                          setShowUnitResults(true);
                        }
                      }}
                    />
                    <Users className="absolute right-2.5 h-4 w-4 text-muted-foreground" />
                  </div>

                  {showUnitResults && searchUnit && (
                    <div className="absolute z-10 mt-1 w-full bg-background border rounded-md shadow-md">
                      {filteredUnits.length > 0 ? (
                        <ul className="py-1 max-h-60 overflow-auto">
                          {filteredUnits.map((unit: any) => (
                            <li
                              key={unit.id}
                              className="px-4 py-2 hover:bg-accent cursor-pointer flex items-center"
                              onClick={() => addUnit(unit)}
                            >
                              <span>{unit.fullName || unit.name}</span>
                              {unit.unitLevel && (
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {unit.unitLevel}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="px-4 py-2 text-sm text-muted-foreground">
                          No units found
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedUnits.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedUnits.map((unit) => (
                      <Badge
                        key={unit.id}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {unit.name} {unit.unitLevel && `(${unit.unitLevel})`}
                        <button
                          type="button"
                          onClick={() => removeUnit(unit.id)}
                          className="ml-1 rounded-full hover:bg-accent p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <FormDescription>
                  Search and select units participating in this event
                </FormDescription>

                <input type="hidden" {...form.register("participatingUnits")} />
              </div>

              <FormField
                control={form.control}
                name="notifyParticipants"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Notify Participants</FormLabel>
                      <FormDescription>
                        Send notifications to all participants about this event
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={createEvent.isPending}>
                {createEvent.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Event
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
