import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUpCircle,
} from "lucide-react";
import type { VeniceAnalysis } from "@shared/schema";

interface AIAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: number;
  eventTitle: string;
}

export function AIAnalysisDialog({
  open,
  onOpenChange,
  eventId,
  eventTitle,
}: AIAnalysisDialogProps) {
  const [analysis, setAnalysis] = useState<VeniceAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch the analysis when the dialog opens
  React.useEffect(() => {
    if (open && !analysis && !loading) {
      fetchAnalysis();
    }
  }, [open, eventId]);

  // Function to fetch the analysis
  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/events/${eventId}/analyze`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate analysis");
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err: any) {
      console.error("Error fetching analysis:", err);
      setError(err.message || "Failed to generate analysis");
    } finally {
      setLoading(false);
    }
  };

  // Helper to get the proper badge color based on severity/impact/priority
  const getBadgeClass = (level: string) => {
    switch (level.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      case "medium":
        return "bg-amber-100 text-amber-800 hover:bg-amber-100";
      case "low":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      default:
        return "bg-slate-100 text-slate-800 hover:bg-slate-100";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            AI Analysis for {eventTitle}
          </DialogTitle>
          <DialogDescription>
            AI-generated insights based on the After-Action Reviews submitted
            for this event
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Generating analysis...</p>
            <p className="text-sm text-muted-foreground mt-2">
              This may take a moment as the AI analyzes all submitted AARs.
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-10">
            <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
            <p className="text-red-500 font-medium">
              Error generating analysis
            </p>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
            <Button onClick={fetchAnalysis} className="mt-4">
              Try Again
            </Button>
          </div>
        ) : analysis ? (
          <div className="space-y-6">
            {/* Trends Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-green-600">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Key Trends
                </CardTitle>
                <CardDescription>
                  Patterns identified across AARs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysis.trends.length === 0 ? (
                    <p className="text-muted-foreground italic">
                      No trends identified.
                    </p>
                  ) : (
                    analysis.trends.map((trend, index) => (
                      <div key={index} className="p-4 border rounded-md">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{trend.category}</h4>
                          <div className="flex items-center gap-2">
                            <Badge className={getBadgeClass(trend.severity)}>
                              {trend.severity} Priority
                            </Badge>
                            {trend.frequency > 0 && (
                              <Badge variant="outline">
                                {trend.frequency} occurrences
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-muted-foreground">
                          {trend.description}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Friction Points Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-amber-600">
                  <XCircle className="mr-2 h-5 w-5" />
                  Friction Points
                </CardTitle>
                <CardDescription>
                  Issues and challenges identified
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysis.frictionPoints.length === 0 ? (
                    <p className="text-muted-foreground italic">
                      No friction points identified.
                    </p>
                  ) : (
                    analysis.frictionPoints.map((point, index) => (
                      <div key={index} className="p-4 border rounded-md">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{point.category}</h4>
                          <Badge className={getBadgeClass(point.impact)}>
                            {point.impact} Impact
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">
                          {point.description}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recommendations Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-blue-600">
                  <ArrowUpCircle className="mr-2 h-5 w-5" />
                  Recommendations
                </CardTitle>
                <CardDescription>
                  Actionable steps for improvement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysis.recommendations.length === 0 ? (
                    <p className="text-muted-foreground italic">
                      No recommendations available.
                    </p>
                  ) : (
                    analysis.recommendations.map((recommendation, index) => (
                      <div key={index} className="p-4 border rounded-md">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">
                            {recommendation.category}
                          </h4>
                          <Badge
                            className={getBadgeClass(recommendation.priority)}
                          >
                            {recommendation.priority} Priority
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">
                          {recommendation.description}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10">
            <AlertCircle className="h-10 w-10 text-amber-500 mb-4" />
            <p className="text-muted-foreground">No analysis available</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!loading && analysis && (
            <Button onClick={fetchAnalysis}>Regenerate Analysis</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
