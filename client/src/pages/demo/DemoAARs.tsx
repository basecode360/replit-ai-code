import {
  FileText,
  Award,
  AlertTriangle,
  CheckCircle,
  Calendar,
  User,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import GuidedTour from "./components/demo/GuidedTour";

// Demo sample AARs
const demoAARs = [
  {
    id: 1,
    eventId: 1,
    eventTitle: "Platoon Live Fire Exercise",
    unitName: "1st Platoon, Alpha Company",
    date: "May 10, 2025",
    author: {
      name: "John Smith",
      rank: "Lieutenant",
      unitId: 3,
      unitName: "1st Platoon, Alpha Company",
    },
    sustainItems: [
      "Excellent communications between squad leaders during movement phases",
      "Well-executed fire and maneuver techniques across all teams",
      "Proper use of cover and concealment throughout the exercise",
    ],
    improveItems: [
      "Radio discipline needs work, especially during high-intensity phases",
      "Ammunition management could be more efficient",
      "Medical evacuation procedures were slow in sectors 2 and 3",
    ],
    actionItems: [
      "Conduct radio communication refresher training",
      "Implement squad-level ammunition tracking procedures",
      "Schedule dedicated MEDEVAC training session",
    ],
  },
  {
    id: 2,
    eventId: 1,
    eventTitle: "Platoon Live Fire Exercise",
    unitName: "1st Platoon, Alpha Company",
    date: "May 10, 2025",
    author: {
      name: "Michael Johnson",
      rank: "Sergeant",
      unitId: 4,
      unitName: "2nd Squad, 1st Platoon",
    },
    sustainItems: [
      "Squad maintained tight formations during movement",
      "Target acquisition and engagement was efficient",
      "Team leaders provided clear, concise direction",
    ],
    improveItems: [
      "Inter-squad communication broke down during phase 3",
      "Reload timings were inconsistent across team members",
      "Some team members showed fatigue early in the exercise",
    ],
    actionItems: [
      "Review inter-squad communication protocols",
      "Schedule tactical reload drills for all personnel",
      "Increase focus on physical conditioning in PT sessions",
    ],
  },
  {
    id: 3,
    eventId: 2,
    eventTitle: "Squad Movement Tactics",
    unitName: "2nd Squad, 1st Platoon",
    date: "May 15, 2025",
    author: {
      name: "Robert Davis",
      rank: "Staff Sergeant",
      unitId: 4,
      unitName: "2nd Squad, 1st Platoon",
    },
    sustainItems: [
      "Room clearing procedures followed proper protocol",
      "Team breaching techniques were executed flawlessly",
      "Squad maintained 360-degree security during all halts",
    ],
    improveItems: [
      "Initial building approach revealed the squad too early",
      "Communication during high-noise situations was inadequate",
      "Personnel struggled with quick transition between weapons systems",
    ],
    actionItems: [
      "Practice varied building approach techniques",
      "Implement hand signal refresher training",
      "Schedule regular weapons transition drills",
    ],
  },
];

export default function DemoAARs() {
  return (
    <div className="container py-6">
      <GuidedTour />

      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">After Action Reviews</h1>
            <p className="text-muted-foreground">
              Capture, analyze, and preserve training insights across your
              organization
            </p>
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all">All AARs</TabsTrigger>
              <TabsTrigger value="platoon">Platoon Exercise</TabsTrigger>
              <TabsTrigger value="squad">Squad Tactics</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="space-y-4 aar-list">
            {" "}
            {/* This div is targeted by the tour highlight */}
            <div className="grid gap-6">
              {demoAARs.map((aar) => (
                <AARCard key={aar.id} aar={aar} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="platoon" className="space-y-4">
            <div className="grid gap-6">
              {demoAARs
                .filter((aar) => aar.eventId === 1)
                .map((aar) => (
                  <AARCard key={aar.id} aar={aar} />
                ))}
            </div>
          </TabsContent>

          <TabsContent value="squad" className="space-y-4">
            <div className="grid gap-6">
              {demoAARs
                .filter((aar) => aar.eventId === 2)
                .map((aar) => (
                  <AARCard key={aar.id} aar={aar} />
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="mt-12">
        <Card>
          <CardHeader>
            <CardTitle>How AARs Work in GreenBookAAR</CardTitle>
            <CardDescription>
              After Action Reviews capture critical insights that follow
              personnel throughout their career
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="border rounded-md p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <h3 className="font-medium">Structured Feedback</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  AARs are organized into "Sustain," "Improve," and "Action
                  Items" categories, ensuring clear communication of what
                  worked, what didn't, and what needs to change.
                </p>
              </div>

              <div className="border rounded-md p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-medium">Personal History</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Unlike traditional systems where AARs are tied only to units,
                  GreenBookAAR associates AARs with both units AND individuals,
                  preserving insights when personnel transfer.
                </p>
              </div>

              <div className="border rounded-md p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h3 className="font-medium">Knowledge Preservation</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  When individuals transfer to new units, their AAR history
                  follows them, allowing new units to benefit from their
                  experiences and preventing institutional knowledge loss.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AARCard({ aar }: { aar: any }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{aar.eventTitle}</CardTitle>
            <CardDescription className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{aar.date}</span>
            </CardDescription>
          </div>
          <Badge variant="outline">{aar.unitName}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2">
          <User className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
          <div>
            <div className="font-medium">
              {aar.author.rank} {aar.author.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {aar.author.unitName}
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div>
            <div className="flex items-center mb-2">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <h4 className="font-medium text-sm">SUSTAIN</h4>
            </div>
            <ul className="space-y-1 pl-6 text-sm list-disc marker:text-green-500">
              {aar.sustainItems.map((item: string, index: number) => (
                <li key={`sustain-${index}`}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex items-center mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 mr-2" />
              <h4 className="font-medium text-sm">IMPROVE</h4>
            </div>
            <ul className="space-y-1 pl-6 text-sm list-disc marker:text-amber-500">
              {aar.improveItems.map((item: string, index: number) => (
                <li key={`improve-${index}`}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex items-center mb-2">
              <FileText className="w-4 h-4 text-blue-500 mr-2" />
              <h4 className="font-medium text-sm">ACTION ITEMS</h4>
            </div>
            <ul className="space-y-1 pl-6 text-sm list-disc marker:text-blue-500">
              {aar.actionItems.map((item: string, index: number) => (
                <li key={`action-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
