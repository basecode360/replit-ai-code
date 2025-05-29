import React from "react";

import { useAuth } from "../lib/auth-provider";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Users,
  Calendar,
  FileText,
  PieChart,
  AlertTriangle,
  Bell,
} from "lucide-react";
import { Button } from "../components/ui/button";
import StatCard from "../components/dashboard/StatCard";
import RecentAARs, { RecentAAR } from "../components/dashboard/RecentAARs";
import VeniceInsights from "../components/dashboard/VeniceInsights";
import EventCalendar from "../components/dashboard/EventCalendar";
import ActiveEventsDropdown from "../components/dashboard/ActiveEventsDropdown";
import { Separator } from "../components/ui/separator";
import { useHierarchy } from "../hooks/use-hierarchy";
import { useToast } from "../hooks/use-toast";

import {
  Event,
  AAR,
  VeniceAnalysis as VeniceAnalysisType,
  Unit,
  User as UserType,
} from "../lib/types";

export default function Dashboard() {
  const { user } = useAuth();
  const { accessibleUnits, getSubordinateUnits, getUsersInUnit } =
    useHierarchy();
  const { toast } = useToast();

  // Handler for sending a test notification
  const handleTestNotification = async () => {
    try {
      const response = await fetch("/api/notifications/test", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "Test Notification Sent",
          description:
            "A test notification has been sent. Check the notification bell in the header.",
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send test notification",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending test notification:", error);
      toast({
        title: "Error",
        description: "Failed to send test notification",
        variant: "destructive",
      });
    }
  };

  // Get unit data
  const { data: unitData } = useQuery<Unit>({
    queryKey: [user ? `/api/units/${user.unitId}` : "no-unit"],
    enabled: !!user,
  });

  // Get events for the unit (from unit-specific endpoint)
  const { data: unitEvents = [] as Event[] } = useQuery<Event[]>({
    queryKey: [user ? `/api/units/${user.unitId}/events` : "no-unit-events"],
    enabled: !!user,
  });

  // Get all events (additional data source)
  const { data: allEvents = [] as Event[] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    enabled: !!user,
  });

  // Combine events from both sources and remove duplicates
  const events = [...(unitEvents || []), ...(allEvents || [])].filter(
    (event, index, self) => index === self.findIndex((e) => e?.id === event?.id)
  );

  // Get AARs for the unit
  const { data: aars = [] as AAR[] } = useQuery<AAR[]>({
    queryKey: [user ? `/api/units/${user.unitId}/aars` : "no-aars"],
    enabled: !!user,
  });

  // Get Venice AI analysis for the unit
  const {
    data: veniceAnalysis = {
      trends: [],
      frictionPoints: [],
      recommendations: [],
    } as VeniceAnalysisType,
  } = useQuery<VeniceAnalysisType>({
    queryKey: [user ? `/api/units/${user.unitId}/analysis` : "no-analysis"],
    enabled: !!user,
  });

  // Get users for the unit
  const { data: users = [] as UserType[] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    enabled: !!user,
  });

  // Get total personnel (parent unit and all subunits)
  const getTotalPersonnel = (): number => {
    if (!user || !accessibleUnits.length) return 0;

    // Get the current user's unit
    const userUnit = accessibleUnits.find((u) => u.id === user.unitId);
    if (!userUnit) return 0;

    // Get direct personnel in the unit
    const directPersonnel = getUsersInUnit(user.unitId).length;

    // Recursive function to get personnel in subunits
    const getPersonnelInSubunits = (unitId: number): number => {
      const subunits = getSubordinateUnits(unitId);

      // Sum the personnel in this level of subunits
      const subunitPersonnel = subunits.reduce((total, unit) => {
        return total + getUsersInUnit(unit.id).length;
      }, 0);

      // Recursively add personnel from deeper subunits
      const deeperSubunitPersonnel = subunits.reduce((total, unit) => {
        return total + getPersonnelInSubunits(unit.id);
      }, 0);

      return subunitPersonnel + deeperSubunitPersonnel;
    };

    // Sum direct personnel and all personnel in subunits
    return directPersonnel + getPersonnelInSubunits(user.unitId);
  };

  // Find active events based on new requirements
  console.log("Events before filtering:", events);

  const activeEvents = events.filter((event: any) => {
    console.log("Checking event:", event.id, event.title, "Step:", event.step);

    if (event.isDeleted) {
      console.log("Event is deleted, skipping:", event.id);
      return false;
    }

    const today = new Date();

    // Check if event has already been issued
    if (event.step < 1) {
      console.log("Event step < 1, skipping:", event.id);
      return false;
    }

    // Check if event has been completed (step 7 or 8 with dates in the past)
    if (event.step === 7 || event.step === 8) {
      // If step has a date and it's in the past, the event is complete
      if (event.step7Date && new Date(event.step7Date) < today) {
        console.log("Event step7Date in past, skipping:", event.id);
        return false;
      }
      if (event.step8Date && new Date(event.step8Date) < today) {
        console.log("Event step8Date in past, skipping:", event.id);
        return false;
      }
    }

    // Check if execution date is in the past
    if (event.executionDate && new Date(event.executionDate) < today) {
      console.log(
        "Event executionDate in past, skipping:",
        event.id,
        "Date:",
        event.executionDate
      );
      return false;
    }

    // If none of the above conditions are met, the event is active
    console.log("Event is active:", event.id);
    return true;
  });

  console.log("Active events after filtering:", activeEvents);

  // Get current training event (most recent active event)
  const currentTrainingEvent =
    activeEvents.length > 0
      ? activeEvents.sort(
          (a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0]
      : null;

  // We no longer need this since we're showing the training progress in the ActiveEventsDropdown component

  // Format recent AARs for display
  const recentAARs: RecentAAR[] = aars
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 3)
    .map((aar: any) => {
      // Find associated event
      const event = events.find((e: any) => e.id === aar.eventId);
      return {
        id: aar.id,
        title: event?.title || `AAR #${aar.id}`,
        status: "Completed",
        date: new Date(aar.createdAt),
        location: event?.location || "Unknown",
        participants: Array.isArray(event?.participants)
          ? event.participants.length
          : 0,
      };
    });

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-condensed font-bold text-gray-900 sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {user?.rank} {user?.name}
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Button
            variant="outline"
            className="mr-2"
            onClick={handleTestNotification}
          >
            <Bell className="h-4 w-4 mr-2" />
            Test Notification
          </Button>
          <Button variant="outline" className="mr-2">
            Export Data
          </Button>
          <Link href="/events/create">
            <Button>Create Event</Button>
          </Link>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Personnel"
          value={getTotalPersonnel()}
          icon={<Users className="h-5 w-5 text-white" />}
          iconBgColor="bg-secondary"
          linkText="View all personnel"
          linkHref="/units"
        />

        <StatCard
          title="Active Events"
          value={activeEvents.length}
          icon={<Calendar className="h-5 w-5 text-white" />}
          iconBgColor="bg-primary"
          linkText="View all events"
          linkHref="/events"
        />

        <StatCard
          title="Completed AARs"
          value={aars.length}
          icon={<FileText className="h-5 w-5 text-white" />}
          iconBgColor="bg-accent"
          linkText="View all AARs"
          linkHref="/aars"
        />

        <StatCard
          title="Pending AARs"
          value={
            events.filter(
              (event: any) =>
                !event.isDeleted &&
                !aars.some((aar: any) => aar.eventId === event.id)
            ).length
          }
          icon={<AlertTriangle className="h-5 w-5 text-white" />}
          iconBgColor="bg-amber-500"
          linkText="View pending"
          linkHref="/aars"
        />
      </div>

      {/* Training Progress has been merged into the ActiveEventsDropdown component */}

      {/* Event Calendar */}
      <div className="mb-8">
        <EventCalendar events={events} />
      </div>

      {/* Three-column layout for Active Events, Recent AARs and Venice AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Active Events Dropdown */}
        <div className="lg:col-span-1">
          <ActiveEventsDropdown events={activeEvents} isLoading={!events} />
        </div>

        {/* Recent AARs */}
        <div className="lg:col-span-1">
          <RecentAARs aars={recentAARs} />
        </div>

        {/* Venice AI Insights */}
        <div className="lg:col-span-1">
          {veniceAnalysis && <VeniceInsights analysis={veniceAnalysis} />}
        </div>
      </div>
    </div>
  );
}
