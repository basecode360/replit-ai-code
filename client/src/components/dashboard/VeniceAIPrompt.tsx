import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import { Loader2, BrainCircuit } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { VeniceAnalysis } from "../../lib/types";

interface VeniceAIPromptProps {
  unitId: number;
}

export function VeniceAIPrompt({ unitId }: VeniceAIPromptProps) {
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysis, setAnalysis] = useState<VeniceAnalysis | null>(null);
  const { toast } = useToast();

  // Function to submit the prompt to the Venice AI API
  const submitPrompt = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Empty prompt",
        description: "Please enter a prompt for the AI analysis.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/units/${unitId}/prompt-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setAnalysis(data);
      toast({
        title: "Analysis complete",
        description: "Venice AI has analyzed your prompt.",
      });
    } catch (error) {
      console.error("Error submitting prompt to Venice AI:", error);
      toast({
        title: "Analysis failed",
        description:
          "There was an error analyzing your prompt. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <BrainCircuit className="mr-2 h-5 w-5" />
          Venice AI Analysis
        </CardTitle>
        <CardDescription>
          Ask Venice AI to analyze your AARs for specific insights and patterns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Enter your prompt, e.g., 'What are the most common training issues in night operations?' or 'Identify recurring communication challenges in the last 3 months.'"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[120px]"
        />

        {analysis && (
          <div className="mt-4 border rounded-md p-4 bg-muted/30">
            <h3 className="font-medium mb-2">AI Analysis Results</h3>

            {analysis.trends && analysis.trends.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold mb-1">
                  Identified Trends:
                </h4>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.trends.map((trend, index) => (
                    <li key={index} className="text-sm">
                      <span className="font-medium">{trend.category}:</span>{" "}
                      {trend.description}
                      {trend.frequency && ` (Frequency: ${trend.frequency})`}
                      {trend.severity && ` - Severity: ${trend.severity}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.frictionPoints && analysis.frictionPoints.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold mb-1">Friction Points:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.frictionPoints.map((point, index) => (
                    <li key={index} className="text-sm">
                      <span className="font-medium">{point.category}:</span>{" "}
                      {point.description}
                      {point.impact && ` - Impact: ${point.impact}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.recommendations &&
              analysis.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">
                    Recommendations:
                  </h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {analysis.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm">
                        <span className="font-medium">{rec.category}:</span>{" "}
                        {rec.description}
                        {rec.priority && ` - Priority: ${rec.priority}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={submitPrompt}
          disabled={isSubmitting || !prompt.trim()}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Submit for Analysis"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
