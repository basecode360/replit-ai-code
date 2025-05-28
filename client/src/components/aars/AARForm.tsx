import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { apiRequest } from "./lib/queryClient";
import { queryClient } from "./lib/queryClient";
import { useToast } from "./hooks/use-toast";
import { useAuth } from "./lib/auth-provider";
import { useHierarchy } from "./hooks/use-hierarchy";

import { Button } from "./components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./components/ui/form";
import { Textarea } from "./components/ui/textarea";
import { Input } from "./components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "./components/ui/card";
import { X, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { Checkbox } from "./components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { MilitaryRoles } from "../../../shared/schema"

// Form schema for AAR submission
const aarFormSchema = z.object({
  plannedOutcome: z
    .string()
    .min(3, "Please describe what was supposed to happen"),
  actualOutcome: z.string().min(3, "Please describe what actually happened"),
  sustainItems: z.array(
    z.string().min(3, "Item must be at least 3 characters")
  ),
  improveItems: z.array(
    z.string().min(3, "Item must be at least 3 characters")
  ),
  actionItems: z.array(z.string().min(3, "Item must be at least 3 characters")),
  differentRole: z.boolean().default(false),
  tempRole: z.string().optional(),
});

type AARFormValues = z.infer<typeof aarFormSchema>;

interface AARFormProps {
  eventId: number;
}

export default function AARForm({ eventId }: AARFormProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { accessibleUnits } = useHierarchy();

  // Dynamic arrays for form items
  const [sustainInputs, setSustainInputs] = useState([""]);
  const [improveInputs, setImproveInputs] = useState([""]);
  const [actionInputs, setActionInputs] = useState([""]);

  // Get event data
  const { data: event, isLoading: isEventLoading } = useQuery<{
    title: string;
    [key: string]: any;
  }>({
    queryKey: ["/api/events", eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const res = await apiRequest("GET", `/api/events/${eventId}`);
      return await res.json();
    },
    enabled: !!eventId,
  });

  // Create form
  const form = useForm<AARFormValues>({
    resolver: zodResolver(aarFormSchema),
    defaultValues: {
      plannedOutcome: "",
      actualOutcome: "",
      sustainItems: [""],
      improveItems: [""],
      actionItems: [""],
      differentRole: false,
      tempRole: "",
    },
  });

  // Submit AAR mutation
  const submitAAR = useMutation({
    mutationFn: async (values: AARFormValues) => {
      // Filter out empty items and format them with metadata
      const formatItems = (items: string[]) => {
        return items
          .filter((item) => item && item.trim() !== "")
          .map((text) => ({
            id: crypto.randomUUID(), // Generate unique ID for each item
            text,
            authorId: user?.id || 0,
            authorRank: user?.rank || "Unknown",
            unitId: user?.unitId || 0,
            unitLevel:
              accessibleUnits?.find((unit) => unit.id === user?.unitId)
                ?.unitLevel || "Unknown",
            createdAt: new Date().toISOString(),
            tags: [], // Empty tags for now
          }));
      };

      // Format the AAR metadata and include it with the first sustain item as a tag
      const metadata = {
        plannedOutcome: values.plannedOutcome.trim(),
        actualOutcome: values.actualOutcome.trim(),
        differentRole: values.differentRole,
        tempRole: values.differentRole ? values.tempRole : null,
      };

      const filteredValues = {
        eventId,
        unitId: user?.unitId || 0,
        sustainItems: formatItems(values.sustainItems || []),
        improveItems: formatItems(values.improveItems || []),
        actionItems: formatItems(values.actionItems || []),
      };

      // Add metadata to a comment property on the filtered values object
      const metadataString = JSON.stringify(metadata);

      // Store metadata in a separate console.log for debugging
      console.log("AAR metadata:", metadata);

      // Add an additional comment to the form submission
      let comment = `Planned outcome: ${values.plannedOutcome}\n\nActual outcome: ${values.actualOutcome}`;

      // Add duty position information if the user was in a different role
      if (values.differentRole && values.tempRole) {
        comment += `\n\nTemporary duty position: ${values.tempRole}`;
      }

      // Add this comment as an additional sustain item
      if (values.plannedOutcome || values.actualOutcome) {
        const metadataItem = {
          id: crypto.randomUUID(),
          text: comment,
          authorId: user?.id || 0,
          authorRank: user?.rank || "Unknown",
          unitId: user?.unitId || 0,
          unitLevel:
            accessibleUnits?.find((unit) => unit.id === user?.unitId)
              ?.unitLevel || "Unknown",
          createdAt: new Date().toISOString(),
          tags: ["aar_metadata"],
        };

        // Add as first item in sustain items
        filteredValues.sustainItems = [
          metadataItem,
          ...filteredValues.sustainItems,
        ];
      }

      console.log("Submitting AAR data:", {
        eventId: filteredValues.eventId,
        sustainCount: filteredValues.sustainItems.length,
        improveCount: filteredValues.improveItems.length,
        actionCount: filteredValues.actionItems.length,
      });

      const res = await apiRequest("POST", "/api/aars", filteredValues);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "AAR submitted",
        description: "Your AAR has been submitted successfully",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/events", eventId, "aars"],
      });
      navigate("/aars");
    },
    onError: (error: any) => {
      toast({
        title: "Error submitting AAR",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (values: AARFormValues) => {
    submitAAR.mutateAsync(values);
  };

  // Helpers for dynamic form arrays
  const addSustainInput = () => {
    setSustainInputs([...sustainInputs, ""]);
    form.setValue("sustainItems", [...form.getValues("sustainItems"), ""]);
  };

  const removeSustainInput = (index: number) => {
    if (sustainInputs.length > 1) {
      const newInputs = sustainInputs.filter((_, i) => i !== index);
      setSustainInputs(newInputs);
      form.setValue(
        "sustainItems",
        form.getValues("sustainItems").filter((_, i) => i !== index)
      );
    }
  };

  const addImproveInput = () => {
    setImproveInputs([...improveInputs, ""]);
    form.setValue("improveItems", [...form.getValues("improveItems"), ""]);
  };

  const removeImproveInput = (index: number) => {
    if (improveInputs.length > 1) {
      const newInputs = improveInputs.filter((_, i) => i !== index);
      setImproveInputs(newInputs);
      form.setValue(
        "improveItems",
        form.getValues("improveItems").filter((_, i) => i !== index)
      );
    }
  };

  const addActionInput = () => {
    setActionInputs([...actionInputs, ""]);
    form.setValue("actionItems", [...form.getValues("actionItems"), ""]);
  };

  const removeActionInput = (index: number) => {
    if (actionInputs.length > 1) {
      const newInputs = actionInputs.filter((_, i) => i !== index);
      setActionInputs(newInputs);
      form.setValue(
        "actionItems",
        form.getValues("actionItems").filter((_, i) => i !== index)
      );
    }
  };

  if (isEventLoading) {
    return <div className="p-8 text-center">Loading event data...</div>;
  }

  if (!event) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold mb-2">Event not found</h2>
        <p>Could not find the specified event to create an AAR.</p>
        <Button className="mt-4" onClick={() => navigate("/events")}>
          Return to Events
        </Button>
      </div>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <h2 className="text-2xl font-bold">Submit After-Action Review</h2>
        {event && (
          <p className="text-sm text-muted-foreground mt-1">
            For: {event.title}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Event Information Summary */}
            {event && (
              <div className="p-4 bg-muted rounded-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium">Event Title</p>
                    <p className="text-sm font-bold">{event.title}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Execution Date</p>
                    <p className="text-sm">
                      {new Date(event.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-sm font-medium">Location</p>
                  <p className="text-sm">{event.location}</p>
                </div>
                <div className="mb-4">
                  <p className="text-sm font-medium">Mission Statement</p>
                  <p className="text-sm">
                    {event.missionStatement || "No mission statement provided"}
                  </p>
                </div>
                <div className="mb-4">
                  <p className="text-sm font-medium">Concept of Operation</p>
                  <p className="text-sm">
                    {event.conceptOfOperation ||
                      "No concept of operation provided"}
                  </p>
                </div>
                <div className="mb-4">
                  <p className="text-sm font-medium">Objectives</p>
                  <p className="text-sm">{event.objectives}</p>
                </div>
                {event.resources && (
                  <div className="mb-4">
                    <p className="text-sm font-medium">Resources</p>
                    <p className="text-sm">{event.resources}</p>
                  </div>
                )}

                {/* Personnel Role Information */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-medium mb-3">
                    Personnel Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-background p-3 rounded-md">
                      <span className="text-xs font-medium block mb-1">
                        Your Rank
                      </span>
                      <span className="text-sm">{user?.rank || "Unknown"}</span>
                    </div>
                    <div className="bg-background p-3 rounded-md">
                      <span className="text-xs font-medium block mb-1">
                        Your Role
                      </span>
                      <span className="text-sm">{user?.role || "Unknown"}</span>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="differentRole"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 mb-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            I was working in a different duty position during
                            this event
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  {form.watch("differentRole") && (
                    <FormField
                      control={form.control}
                      name="tempRole"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Temporary Duty Position</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your temporary role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(MilitaryRoles).map(
                                ([key, value]) => (
                                  <SelectItem key={key} value={value}>
                                    {value}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>
            )}

            {/* What was supposed to happen */}
            <FormField
              control={form.control}
              name="plannedOutcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold">
                    What was supposed to happen
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the planned outcome of this event"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* What actually happened */}
            <FormField
              control={form.control}
              name="actualOutcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold">
                    What actually happened
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what actually occurred during this event"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sustain Items */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                What Went Well (Sustain)
              </h3>
              <div className="space-y-4">
                {sustainInputs.map((_, index) => (
                  <FormField
                    key={`sustain-${index}`}
                    control={form.control}
                    name={`sustainItems.${index}`}
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input
                              placeholder={`Sustain item ${index + 1}`}
                              {...field}
                            />
                          </FormControl>
                          {sustainInputs.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSustainInput(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addSustainInput}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Sustain Item
                </Button>
              </div>
            </div>

            {/* Improve Items */}
            <div>
              <h3 className="text-lg font-semibold mb-4">What Could Improve</h3>
              <div className="space-y-4">
                {improveInputs.map((_, index) => (
                  <FormField
                    key={`improve-${index}`}
                    control={form.control}
                    name={`improveItems.${index}`}
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input
                              placeholder={`Improve item ${index + 1}`}
                              {...field}
                            />
                          </FormControl>
                          {improveInputs.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeImproveInput(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addImproveInput}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Improve Item
                </Button>
              </div>
            </div>

            {/* Action Items */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Action Items</h3>
              <div className="space-y-4">
                {actionInputs.map((_, index) => (
                  <FormField
                    key={`action-${index}`}
                    control={form.control}
                    name={`actionItems.${index}`}
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input
                              placeholder={`Action item ${index + 1}`}
                              {...field}
                            />
                          </FormControl>
                          {actionInputs.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeActionInput(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addActionInput}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Action Item
                </Button>
              </div>
            </div>

            <CardFooter className="flex justify-between px-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/events")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitAAR.isPending}>
                {submitAAR.isPending ? "Submitting..." : "Submit AAR"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
