import { Card, CardHeader, CardContent } from "./components/ui/card";
import { Info, AlertTriangle, CheckCircle, FileQuestion } from "lucide-react";
import { VeniceAnalysis } from "./lib/types";
import { Button } from "./components/ui/button";
import { Link } from "wouter";

interface VeniceInsightsProps {
  analysis: VeniceAnalysis;
}

export default function VeniceInsights({ analysis }: VeniceInsightsProps) {
  // Check if we have meaningful analysis data
  const hasData =
    analysis.trends.length > 0 &&
    analysis.frictionPoints.length > 0 &&
    analysis.recommendations.length > 0;

  // Special case: Check if this is a "not enough data" message
  const notEnoughData =
    analysis.trends.length === 1 &&
    analysis.trends[0].category === "Insufficient Data";

  return (
    <Card>
      <CardHeader className="border-b border-border pb-3">
        <h3 className="text-lg font-medium text-gray-900">
          Venice AI Insights
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Based on analysis of recent AARs
        </p>
      </CardHeader>

      <CardContent className="p-6">
        {notEnoughData ? (
          <div className="text-center py-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 mb-4">
              <FileQuestion className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              More AARs Required
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
              {analysis.trends[0].description}
            </p>
            <div className="mt-6">
              <Link href="/events">
                <Button>Create More AARs</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Trends */}
            {analysis.trends.map((trend, idx) => (
              <div key={idx} className="insight-card info">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Info className="h-5 w-5 text-primary" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-primary-900">
                      {trend.category}
                    </h3>
                    <div className="mt-2 text-sm text-primary-800">
                      <p>{trend.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Friction Points */}
            {analysis.frictionPoints.map((point, idx) => (
              <div key={idx} className="insight-card warning">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">
                      {point.category}
                    </h3>
                    <div className="mt-2 text-sm text-amber-700">
                      <p>{point.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Recommendations */}
            {analysis.recommendations.map((rec, idx) => (
              <div key={idx} className="insight-card success">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-green-700" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      {rec.category} - {rec.priority} Priority
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>{rec.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
