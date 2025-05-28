import { Calendar, Users, ClipboardList, CheckSquare } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import GuidedTour from "./components/demo/GuidedTour";

// Demo sample events
const demoEvents = [
  {
    id: 1,
    title: "Platoon Live Fire Exercise",
    date: "May 10, 2025",
    step: 5,
    status: "In Progress",
    unitName: "1st Platoon, Alpha Company",
    participants: 32,
    objective:
      "Conduct platoon-level live fire training focused on squad movement techniques and fire coordination.",
  },
  {
    id: 2,
    title: "Squad Movement Tactics",
    date: "May 15, 2025",
    step: 3,
    status: "Preparation",
    unitName: "2nd Squad, 1st Platoon",
    participants: 8,
    objective:
      "Practice urban movement and room clearing tactics with emphasis on team coordination.",
  },
  {
    id: 3,
    title: "Company Combat Maneuvers",
    date: "April 28, 2025",
    step: 7,
    status: "Evaluation",
    unitName: "Alpha Company",
    participants: 128,
    objective:
      "Execute company-wide maneuvers focusing on combined arms coordination and communication.",
  },
  {
    id: 4,
    title: "NCO Leadership Training",
    date: "May 22, 2025",
    step: 1,
    status: "Planning",
    unitName: "Battalion HQ",
    participants: 24,
    objective:
      "Develop leadership skills and tactical decision making for squad and team leaders.",
  },
];

export default function DemoEvents() {
  return (
    <div className="container py-6">
      <GuidedTour />

      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Training Events</h1>
            <p className="text-muted-foreground">
              Plan, execute, and evaluate your unit's training events in one
              place
            </p>
          </div>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="all">All Events</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="upcoming" className="space-y-4">
            <div className="event-calendar">
              {" "}
              {/* This div is targeted by the tour highlight */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {demoEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {demoEvents
                .filter((e) => e.step >= 4 && e.step <= 6)
                .map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {demoEvents
                .filter((e) => e.step >= 7)
                .map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
            </div>
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {demoEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="mt-8">
        <TrainingProcess />
      </div>
    </div>
  );
}

function EventCard({ event }: { event: any }) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{event.title}</CardTitle>
          <Badge
            variant={
              event.step >= 7
                ? "success"
                : event.step >= 4
                ? "default"
                : "outline"
            }
          >
            Step {event.step}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          <span>{event.date}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm space-y-2">
          <div className="flex items-start gap-2">
            <Users className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">{event.unitName}</div>
              <div className="text-xs text-muted-foreground">
                {event.participants} participants
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              {event.objective}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrainingProcess() {
  const steps = [
    { id: 1, name: "Plan", description: "Create detailed training plan" },
    {
      id: 2,
      name: "Train the Trainers",
      description: "Prepare instructors for training delivery",
    },
    {
      id: 3,
      name: "Recon the Site",
      description: "Inspect and prepare training location",
    },
    {
      id: 4,
      name: "Issue the Order",
      description: "Communicate detailed instructions",
    },
    { id: 5, name: "Rehearse", description: "Practice and refine procedures" },
    { id: 6, name: "Execute", description: "Conduct the training event" },
    {
      id: 7,
      name: "Evaluate",
      description: "Review and identify lessons learned",
    },
    { id: 8, name: "Retrain", description: "Address identified gaps" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Army 8-Step Training Model</CardTitle>
        <CardDescription>
          GreenBookAAR tracks each event through the Army's 8-step training
          model
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {steps.map((step) => (
            <div key={step.id} className="p-3 border rounded-md bg-card">
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant="outline"
                  className="h-6 w-6 flex items-center justify-center p-0 rounded-full"
                >
                  {step.id}
                </Badge>
                <span className="font-medium">{step.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
