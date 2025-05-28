import {
  User,
  Building,
  Shield,
  Calendar,
  FileText,
  BarChart,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import GuidedTour from "../../components/demo/GuidedTour";

// Sample user career history for demonstration
const userCareerHistory = [
  {
    id: 1,
    unitName: "1st Platoon, Bravo Company, 2-123 Infantry",
    role: "Platoon Leader",
    rank: "2LT",
    dateRange: "Jun 2023 - Feb 2025",
    totalEvents: 28,
    totalAARs: 18,
    current: false,
  },
  {
    id: 2,
    unitName: "Alpha Company, 1-456 Infantry",
    role: "Company XO",
    rank: "1LT",
    dateRange: "Feb 2025 - Present",
    totalEvents: 14,
    totalAARs: 9,
    current: true,
  },
];

// Sample AARs from different units in the user's history
const userAARs = [
  {
    id: 1,
    eventTitle: "Platoon Live Fire Exercise",
    unitName: "1st Platoon, Bravo Company, 2-123 Infantry",
    date: "Oct 15, 2023",
    fromPreviousUnit: true,
    sustainItems: [
      "Excellent squad leader initiative during unexpected obstacles",
      "Effective use of terrain for covered movement",
    ],
    improveItems: [
      "Radio communication discipline needs improvement",
      "Ammunition management was inconsistent",
    ],
  },
  {
    id: 2,
    eventTitle: "Company Movement to Contact",
    unitName: "Alpha Company, 1-456 Infantry",
    date: "Mar 18, 2025",
    fromPreviousUnit: false,
    sustainItems: [
      "Clear and concise orders from platoon leaders",
      "Effective coordination between platoons during movement",
    ],
    improveItems: [
      "Delay in consolidation reports after objectives secured",
      "Inconsistent use of proper radio procedures",
    ],
  },
  {
    id: 3,
    eventTitle: "Squad Tactics Course",
    unitName: "1st Platoon, Bravo Company, 2-123 Infantry",
    date: "Aug 05, 2023",
    fromPreviousUnit: true,
    sustainItems: [
      "Effective use of micro-terrain for cover and concealment",
      "Clear and concise commands from squad leaders",
    ],
    improveItems: [
      "Slow transitions between movement formations",
      "Security posture during halts needs improvement",
    ],
  },
  {
    id: 4,
    eventTitle: "Battalion Field Exercise",
    unitName: "Alpha Company, 1-456 Infantry",
    date: "Apr 22, 2025",
    fromPreviousUnit: false,
    sustainItems: [
      "Excellent integration of company elements into battalion operations",
      "Timely and accurate reporting to battalion headquarters",
    ],
    improveItems: [
      "Company CP setup took too long",
      "Redundant communication systems not properly tested",
    ],
  },
];

export default function DemoProfile() {
  return (
    <div className="container py-6">
      <GuidedTour />

      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Profile & Career History</h1>
            <p className="text-muted-foreground">
              View your complete training history across different unit
              assignments
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center mb-6">
                <Avatar className="h-20 w-20 mb-4">
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    MC
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">Michael Carter</h2>
                <p className="text-muted-foreground">@mcarter</p>

                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  <Badge variant="secondary">1LT</Badge>
                  <Badge variant="outline">Company XO</Badge>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Current Unit</p>
                    <p className="text-sm text-muted-foreground">
                      Alpha Company, 1-456 Infantry
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Role</p>
                    <p className="text-sm text-muted-foreground">
                      Company Executive Officer
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <h3 className="text-sm font-medium mb-2">Career Summary</h3>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/60 rounded p-2 text-center">
                    <p className="text-2xl font-bold">
                      {userCareerHistory.reduce(
                        (sum, unit) => sum + unit.totalEvents,
                        0
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total Events
                    </p>
                  </div>
                  <div className="bg-muted/60 rounded p-2 text-center">
                    <p className="text-2xl font-bold">
                      {userCareerHistory.reduce(
                        (sum, unit) => sum + unit.totalAARs,
                        0
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">Total AARs</p>
                  </div>
                  <div className="bg-muted/60 rounded p-2 text-center">
                    <p className="text-2xl font-bold">
                      {userCareerHistory.length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Unit Assignments
                    </p>
                  </div>
                  <div className="bg-muted/60 rounded p-2 text-center">
                    <p className="text-2xl font-bold">3</p>
                    <p className="text-xs text-muted-foreground">
                      Leadership Roles
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="md:col-span-2 space-y-6">
            <Tabs defaultValue="history" className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="history">Career History</TabsTrigger>
                <TabsTrigger value="aars">AARs</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="history" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Building className="mr-2 h-5 w-5" />
                      Unit Assignment History
                    </CardTitle>
                    <CardDescription>
                      Your career progression and unit assignments
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="user-history">
                    {" "}
                    {/* This div is targeted by the tour highlight */}
                    <div className="space-y-8">
                      {userCareerHistory.map((assignment, index) => (
                        <div key={assignment.id} className="relative">
                          {index < userCareerHistory.length - 1 && (
                            <div className="absolute left-6 top-14 bottom-0 w-px bg-muted-foreground/20" />
                          )}

                          <div className="flex gap-3">
                            <div className="mt-1 bg-primary/10 rounded-full p-2 z-10">
                              {assignment.current ? (
                                <Building className="h-6 w-6 text-primary" />
                              ) : (
                                <Building className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>

                            <div className="flex-1">
                              <div className="flex flex-col md:flex-row md:justify-between md:items-start">
                                <div>
                                  <h3 className="font-medium">
                                    {assignment.unitName}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {assignment.role} • {assignment.rank}
                                  </p>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {assignment.dateRange}
                                </p>
                              </div>

                              <div className="mt-2 flex flex-wrap gap-4">
                                <div className="flex items-center gap-1 text-sm">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span>{assignment.totalEvents} Events</span>
                                </div>
                                <div className="flex items-center gap-1 text-sm">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span>{assignment.totalAARs} AARs</span>
                                </div>
                              </div>

                              {index === 0 && (
                                <div className="mt-4 border-t pt-4">
                                  <div className="flex items-center gap-2 text-primary text-sm">
                                    <UserPlus className="h-4 w-4" />
                                    <span className="font-medium">
                                      Transfer to New Unit
                                    </span>
                                    <ArrowRight className="h-4 w-4 ml-1" />
                                  </div>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    When you transfer to a new unit, your event
                                    history and AAR insights move with you,
                                    preserving your training history and
                                    ensuring continuous improvement.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="aars" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="mr-2 h-5 w-5" />
                      Your After Action Reviews
                    </CardTitle>
                    <CardDescription>
                      AARs you've submitted across different units
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {userAARs.map((aar) => (
                        <Card
                          key={aar.id}
                          className={
                            aar.fromPreviousUnit
                              ? "border-dashed border-muted-foreground/30"
                              : ""
                          }
                        >
                          <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-2">
                              <div>
                                <h4 className="font-medium">
                                  {aar.eventTitle}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {aar.date} • {aar.unitName}
                                </p>
                              </div>

                              {aar.fromPreviousUnit && (
                                <Badge
                                  variant="outline"
                                  className="mt-2 md:mt-0"
                                >
                                  Previous Unit
                                </Badge>
                              )}
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 mt-4">
                              <div>
                                <h5 className="text-sm font-medium text-green-600 mb-1">
                                  SUSTAIN
                                </h5>
                                <ul className="space-y-1 pl-5 text-sm list-disc">
                                  {aar.sustainItems.map((item, index) => (
                                    <li key={`sustain-${index}`}>{item}</li>
                                  ))}
                                </ul>
                              </div>

                              <div>
                                <h5 className="text-sm font-medium text-amber-600 mb-1">
                                  IMPROVE
                                </h5>
                                <ul className="space-y-1 pl-5 text-sm list-disc">
                                  {aar.improveItems.map((item, index) => (
                                    <li key={`improve-${index}`}>{item}</li>
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
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart className="mr-2 h-5 w-5" />
                      Your Training Analytics
                    </CardTitle>
                    <CardDescription>
                      Personal training trends and insights across your career
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 border rounded-md bg-amber-500/10 mb-6 text-center">
                      <p className="text-amber-600 font-medium">
                        Analytics Preview
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        In the full version, this tab shows personalized
                        analytics based on your entire training history,
                        including cross-unit insights and performance trends.
                      </p>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-3">
                          Key Strengths
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="border rounded-md p-3">
                            <h4 className="font-medium text-green-600">
                              Leadership Development
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              Consistently positive feedback on leadership style
                              and decision-making across multiple units.
                            </p>
                          </div>
                          <div className="border rounded-md p-3">
                            <h4 className="font-medium text-green-600">
                              Communication
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              Strong pattern of clear and concise communication
                              noted throughout your career.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-medium mb-3">
                          Development Areas
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="border rounded-md p-3">
                            <h4 className="font-medium text-amber-600">
                              Radio Procedure
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              Recurring pattern of radio communication
                              challenges across both unit assignments.
                            </p>
                          </div>
                          <div className="border rounded-md p-3">
                            <h4 className="font-medium text-amber-600">
                              Command Post Operations
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              Opportunity to improve CP setup efficiency based
                              on recent AARs.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
