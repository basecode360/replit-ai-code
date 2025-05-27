import { Sparkles, BarChart3, TrendingUp, AlertTriangle, CheckCircle, Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import GuidedTour from "@/components/demo/GuidedTour";

export default function DemoAnalysis() {
  return (
    <div className="container py-6">
      <GuidedTour />
      
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">AI-Powered Analysis</h1>
            <p className="text-muted-foreground">
              Automatically identify trends, friction points, and recommendations from your training data
            </p>
          </div>
        </div>

        <div className="analysis-results"> {/* This div is targeted by the tour highlight */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <CardTitle>Battalion Training Analysis</CardTitle>
              </div>
              <CardDescription>
                Analysis of 28 training events and 142 after action reviews from the past 90 days
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
                  Key Training Trends
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {analysisData.trends.map((trend, index) => (
                    <TrendCard key={index} trend={trend} />
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
                  Identified Friction Points
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {analysisData.frictionPoints.map((point, index) => (
                    <FrictionCard key={index} point={point} />
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                  Recommended Actions
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {analysisData.recommendations.map((rec, index) => (
                    <RecommendationCard key={index} recommendation={rec} />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>How AI Analysis Works</CardTitle>
              <CardDescription>
                GreenBookAAR analyzes your unit's training data to surface actionable insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="border rounded-md p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    <h3 className="font-medium">Trend Analysis</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    GreenBookAAR identifies recurring patterns across hundreds of AARs, recognizing 
                    both positive trends to reinforce and negative trends to address.
                  </p>
                </div>
                
                <div className="border rounded-md p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <h3 className="font-medium">Friction Detection</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The system automatically identifies consistent points of friction in your 
                    training, helping leadership focus resources on the most critical issues.
                  </p>
                </div>
                
                <div className="border rounded-md p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <h3 className="font-medium">Actionable Recommendations</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Based on identified trends and friction points, GreenBookAAR generates specific, 
                    actionable recommendations that your unit can implement immediately.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TrendCard({ trend }: { trend: any }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-semibold">{trend.category}</h4>
          <Badge 
            variant={
              trend.severity === "High" ? "destructive" : 
              trend.severity === "Medium" ? "default" : 
              "outline"
            }
          >
            {trend.severity}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{trend.description}</p>
        <div className="mt-2 text-xs flex items-center">
          <BarChart3 className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
          <span className="text-muted-foreground">Frequency: {trend.frequency}/10</span>
        </div>
      </CardContent>
    </Card>
  );
}

function FrictionCard({ point }: { point: any }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-semibold">{point.category}</h4>
          <Badge 
            variant={
              point.impact === "High" ? "destructive" : 
              point.impact === "Medium" ? "default" : 
              "outline"
            }
          >
            {point.impact}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{point.description}</p>
      </CardContent>
    </Card>
  );
}

function RecommendationCard({ recommendation }: { recommendation: any }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-semibold">{recommendation.category}</h4>
          <Badge 
            variant={
              recommendation.priority === "High" ? "destructive" : 
              recommendation.priority === "Medium" ? "default" : 
              "outline"
            }
          >
            {recommendation.priority}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{recommendation.description}</p>
      </CardContent>
    </Card>
  );
}

// Sample AI analysis data
const analysisData = {
  trends: [
    {
      category: "Communications",
      description: "Radio discipline and clarity consistently cited as problematic during multi-echelon operations, particularly in high-noise environments.",
      frequency: 8,
      severity: "High"
    },
    {
      category: "Squad Tactics",
      description: "Improved squad movement techniques and positioning observed across multiple platoons following the implementation of standardized training.",
      frequency: 7,
      severity: "Medium"
    },
    {
      category: "Medical Response",
      description: "MEDEVAC procedures show inconsistent execution times, with significant variance between different squads within the same platoon.",
      frequency: 6,
      severity: "High"
    },
    {
      category: "Leadership Development",
      description: "Junior NCOs demonstrating increased tactical decision making capabilities following recent leadership training focus.",
      frequency: 9,
      severity: "Low"
    }
  ],
  frictionPoints: [
    {
      category: "Inter-Squad Coordination",
      description: "Handoffs between squads during complex maneuvers show consistent timing and positioning issues, creating potential gaps in security.",
      impact: "High"
    },
    {
      category: "Equipment Readiness",
      description: "Multiple AARs report NVG battery management issues leading to unexpected equipment failures during night operations.",
      impact: "Medium"
    },
    {
      category: "Training Tempo",
      description: "Compressed training schedules are limiting adequate preparation time, particularly for technical training requirements.",
      impact: "Medium"
    },
    {
      category: "Urban Operations",
      description: "Building clearing procedures are inconsistently applied between different teams, creating potential safety concerns.",
      impact: "High"
    }
  ],
  recommendations: [
    {
      category: "Communications Training",
      description: "Implement targeted radio discipline training with practical exercises in high-noise/stress environments on a monthly basis.",
      priority: "High"
    },
    {
      category: "Medical Procedures",
      description: "Standardize MEDEVAC training across all squads with monthly timed exercises and immediate feedback.",
      priority: "High"
    },
    {
      category: "Equipment Management",
      description: "Institute pre-operation equipment verification procedures with specific focus on power management for nighttime operations.",
      priority: "Medium"
    },
    {
      category: "Inter-Unit Coordination",
      description: "Conduct regular multi-echelon exercises focusing specifically on handoff procedures between squads and platoons.",
      priority: "Medium"
    }
  ]
};