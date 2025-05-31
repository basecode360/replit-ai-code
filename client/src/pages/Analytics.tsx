import React from "react";
import { useAuth } from "../lib/auth-provider";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import {
  Download,
  Loader2,
  BarChart2,
  Calendar,
  Users,
  PieChart as PieChartIcon,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import VeniceInsights from "../components/dashboard/VeniceInsights";
import { VeniceAIPrompt } from "../components/dashboard/VeniceAIPrompt";

// Custom colors for charts
const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function Analytics() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Get Venice AI analysis
  const { data: veniceAnalysis, isLoading: isVeniceLoading } = useQuery({
    queryKey: user?.unitId ? ["/api/units", user.unitId, "analysis"] : [],
    enabled: !!user?.unitId,
  });

  // Get events and AARs
  const { data: events = [], isLoading: isEventsLoading } = useQuery({
    queryKey: user?.unitId ? ["/api/units", user.unitId, "events"] : [],
    enabled: !!user?.unitId,
  });

  const { data: aars = [], isLoading: isAARsLoading } = useQuery({
    queryKey: user?.unitId ? ["/api/units", user.unitId, "aars"] : [],
    enabled: !!user?.unitId,
  });

  const isLoading = isVeniceLoading || isEventsLoading || isAARsLoading;

  // Generate chart data

  // Events by step
  const eventsByStep = [
    {
      name: "Risk Assessment",
      count: events.filter((e: any) => e.step === 1).length,
    },
    { name: "Planning", count: events.filter((e: any) => e.step === 2).length },
    {
      name: "Preparation",
      count: events.filter((e: any) => e.step === 3).length,
    },
    {
      name: "Rehearsal",
      count: events.filter((e: any) => e.step === 4).length,
    },
    {
      name: "Execution",
      count: events.filter((e: any) => e.step === 5).length,
    },
    { name: "AAR", count: events.filter((e: any) => e.step === 6).length },
    {
      name: "Retraining",
      count: events.filter((e: any) => e.step === 7).length,
    },
    {
      name: "Certification",
      count: events.filter((e: any) => e.step === 8).length,
    },
  ];

  // Events by month
  const eventsThisYear = events.filter(
    (e: any) => new Date(e.date).getFullYear() === new Date().getFullYear()
  );

  const eventsByMonth = Array(12)
    .fill(null)
    .map((_, i) => ({
      name: new Date(0, i).toLocaleString("default", { month: "short" }),
      count: eventsThisYear.filter(
        (e: any) => new Date(e.date).getMonth() === i
      ).length,
    }));

  // Sustainment vs Improvement items ratio
  let totalSustainItems = 0;
  let totalImproveItems = 0;

  aars.forEach((aar: any) => {
    if (Array.isArray(aar.sustainItems)) {
      totalSustainItems += aar.sustainItems.length;
    }
    if (Array.isArray(aar.improveItems)) {
      totalImproveItems += aar.improveItems.length;
    }
  });

  const aarRatioData = [
    { name: "Sustain", value: totalSustainItems },
    { name: "Improve", value: totalImproveItems },
  ];

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-condensed font-bold text-gray-900 sm:text-3xl">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Training performance metrics and trends
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs
        defaultValue="overview"
        className="w-full"
        onValueChange={setActiveTab}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="venice">GreenBook Analysis</TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="flex justify-center items-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Stats Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart2 className="mr-2 h-5 w-5" />
                      Training Stats
                    </CardTitle>
                    <CardDescription>
                      Summary of training activities and AARs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="border rounded-md p-3">
                          <div className="text-sm text-muted-foreground">
                            Total Events
                          </div>
                          <div className="text-2xl font-bold mt-1">
                            {events.length}
                          </div>
                        </div>
                        <div className="border rounded-md p-3">
                          <div className="text-sm text-muted-foreground">
                            AARs Submitted
                          </div>
                          <div className="text-2xl font-bold mt-1">
                            {aars.length}
                          </div>
                        </div>
                        <div className="border rounded-md p-3">
                          <div className="text-sm text-muted-foreground">
                            Completed Training
                          </div>
                          <div className="text-2xl font-bold mt-1">
                            {events.filter((e: any) => e.step === 8).length}
                          </div>
                        </div>
                        <div className="border rounded-md p-3">
                          <div className="text-sm text-muted-foreground">
                            In Progress
                          </div>
                          <div className="text-2xl font-bold mt-1">
                            {
                              events.filter(
                                (e: any) => e.step < 8 && !e.isDeleted
                              ).length
                            }
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-sm font-semibold mb-2">
                          Events by Stage
                        </h3>
                        <div className="space-y-2">
                          {eventsByStep.map((step, idx) => (
                            <div key={idx} className="flex items-center">
                              <div className="w-32 text-xs">{step.name}</div>
                              <div className="flex-1">
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary"
                                    style={{
                                      width: `${Math.max(
                                        (step.count /
                                          Math.max(
                                            ...eventsByStep.map((s) => s.count),
                                            1
                                          )) *
                                          100,
                                        step.count > 0 ? 5 : 0
                                      )}%`,
                                    }}
                                  ></div>
                                </div>
                              </div>
                              <div className="w-8 text-right text-xs font-medium">
                                {step.count}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Sustain vs Improve Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <PieChartIcon className="mr-2 h-5 w-5" />
                      Sustain vs Improve Ratio
                    </CardTitle>
                    <CardDescription>
                      Distribution of AAR feedback items
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {aars.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64">
                        <PieChartIcon className="h-12 w-12 text-muted-foreground/40 mb-4" />
                        <p className="text-muted-foreground">
                          No AAR data available
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={aarRatioData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                label={({ name, percent }) =>
                                  `${name} ${(percent * 100).toFixed(0)}%`
                                }
                              >
                                {aarRatioData.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value) => [`${value} items`, ""]}
                                contentStyle={{
                                  borderRadius: "0.375rem",
                                  border: "1px solid hsl(var(--border))",
                                  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                                }}
                              />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex justify-around text-center mt-4">
                          <div>
                            <div className="text-2xl font-bold">
                              {totalSustainItems}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Sustain Items
                            </div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold">
                              {totalImproveItems}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Improve Items
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Events By Month Chart */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="mr-2 h-5 w-5" />
                      Events by Month
                    </CardTitle>
                    <CardDescription>
                      Training activity over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={eventsByMonth}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} />
                          <Tooltip
                            formatter={(value) => [`${value} events`, ""]}
                            contentStyle={{
                              borderRadius: "0.375rem",
                              border: "1px solid hsl(var(--border))",
                              boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                            }}
                          />
                          <Bar
                            dataKey="count"
                            fill="hsl(var(--primary))"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="mr-2 h-5 w-5" />
                      Top Training Trends
                    </CardTitle>
                    <CardDescription>
                      Frequently mentioned items in AARs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Placeholder trends - in a real application, these would be derived from Venice AI analysis */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold mb-2">
                          Sustain Trends
                        </h3>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <Badge className="mr-2 bg-green-100 text-green-800 hover:bg-green-100">
                              75%
                            </Badge>
                            <div>
                              Strong squad leader performance mentioned in
                              majority of AARs
                            </div>
                          </div>
                          <div className="flex items-center">
                            <Badge className="mr-2 bg-green-100 text-green-800 hover:bg-green-100">
                              68%
                            </Badge>
                            <div>
                              Effective communication during execution phases
                            </div>
                          </div>
                          <div className="flex items-center">
                            <Badge className="mr-2 bg-green-100 text-green-800 hover:bg-green-100">
                              55%
                            </Badge>
                            <div>
                              Medical treatment procedures consistently followed
                              correctly
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-sm font-semibold mb-2">
                          Improve Trends
                        </h3>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <Badge className="mr-2 bg-amber-100 text-amber-800 hover:bg-amber-100">
                              82%
                            </Badge>
                            <div>
                              Radio communication issues during night operations
                            </div>
                          </div>
                          <div className="flex items-center">
                            <Badge className="mr-2 bg-amber-100 text-amber-800 hover:bg-amber-100">
                              64%
                            </Badge>
                            <div>Land navigation skills need improvement</div>
                          </div>
                          <div className="flex items-center">
                            <Badge className="mr-2 bg-amber-100 text-amber-800 hover:bg-amber-100">
                              43%
                            </Badge>
                            <div>
                              Pre-operation equipment checks inconsistently
                              performed
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Additional trend charts would go here */}
                <Card>
                  <CardHeader>
                    <CardTitle>Training Effectiveness</CardTitle>
                    <CardDescription>
                      Comparison between initial and retraining performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { name: "Radio Ops", initial: 45, retrained: 78 },
                            { name: "Navigation", initial: 35, retrained: 65 },
                            { name: "Medical", initial: 70, retrained: 85 },
                            { name: "Weapons", initial: 65, retrained: 75 },
                            {
                              name: "Call for Fire",
                              initial: 40,
                              retrained: 80,
                            },
                          ]}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" domain={[0, 100]} />
                          <YAxis dataKey="name" type="category" />
                          <Tooltip />
                          <Legend />
                          <Bar
                            dataKey="initial"
                            name="Initial Training"
                            fill="hsl(var(--chart-2))"
                          />
                          <Bar
                            dataKey="retrained"
                            name="After Retraining"
                            fill="hsl(var(--chart-3))"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Action Item Completion</CardTitle>
                    <CardDescription>
                      Percentage of action items completed from AARs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: "Completed", value: 68 },
                              { name: "In Progress", value: 17 },
                              { name: "Not Started", value: 15 },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            <Cell fill="hsl(var(--chart-1))" />
                            <Cell fill="hsl(var(--chart-3))" />
                            <Cell fill="hsl(var(--chart-4))" />
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Venice AI Analysis Tab */}
            <TabsContent value="venice">
              <div className="grid grid-cols-1 gap-6">
                {/* Custom prompt analysis component - always show this */}
                <VeniceAIPrompt unitId={user?.unitId as number} />

                {veniceAnalysis ? (
                  <>
                    <VeniceInsights analysis={veniceAnalysis} />

                    <Card>
                      <CardHeader>
                        <CardTitle>GreenBook Recommendations</CardTitle>
                        <CardDescription>
                          Actionable steps based on analysis of all AARs
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {veniceAnalysis.recommendations.map((rec, idx) => (
                            <div key={idx} className="p-4 border rounded-md">
                              <div className="flex items-center mb-2">
                                <Badge
                                  className={`mr-2 ${
                                    rec.priority === "High"
                                      ? "bg-red-100 text-red-800 hover:bg-red-100"
                                      : rec.priority === "Medium"
                                      ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                                      : "bg-blue-100 text-blue-800 hover:bg-blue-100"
                                  }`}
                                >
                                  {rec.priority} Priority
                                </Badge>
                                <h3 className="font-medium">{rec.category}</h3>
                              </div>
                              <p className="text-sm">{rec.description}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center p-12">
                      <PieChartIcon className="h-12 w-12 text-muted-foreground/40 mb-4" />
                      <h3 className="text-lg font-medium mb-2">
                        GreenBook Analysis Unavailable
                      </h3>
                      <p className="text-muted-foreground text-center max-w-md">
                        GreenBook automatic analysis is not available at this
                        time. This could be due to insufficient AAR data or a
                        temporary system issue. However, you can still use the
                        prompt feature above to ask specific questions about
                        your AAR data.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
