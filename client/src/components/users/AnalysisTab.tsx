import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ZapIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface AnalysisTabProps {
  userId: number;
}

export default function AnalysisTab({ userId }: AnalysisTabProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Empty prompt",
        description: "Please enter a prompt for analysis",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/users/${userId}/custom-analysis`, {
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
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis failed",
        description: "There was an error generating the analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ZapIcon className="mr-2 h-5 w-5" />
            AI-Powered Analysis
          </CardTitle>
          <CardDescription>
            Enter a prompt to analyze your events and AARs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea 
            placeholder="Enter your prompt here... (e.g., 'What are the common themes in my AARs?' or 'Analyze my unit's training effectiveness')"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[120px]"
          />
          <div className="flex justify-end">
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading || !prompt.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Generate Analysis"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>
              Based on your events and after-action reviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {analysis.content ? (
                  <div className="whitespace-pre-line text-sm">{analysis.content}</div>
                ) : (
                  <>
                    {analysis.trends && analysis.trends.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-md font-semibold flex items-center">
                          <Badge variant="outline" className="mr-2">Trends</Badge>
                          Key Trends Identified
                        </h3>
                        <ul className="space-y-2">
                          {analysis.trends.map((trend: any, i: number) => (
                            <li key={`trend-${i}`} className="border p-3 rounded-md">
                              <div className="flex justify-between items-start">
                                <span className="font-medium">{trend.category}</span>
                                <Badge 
                                  variant={
                                    trend.severity === "High" ? "destructive" : 
                                    trend.severity === "Medium" ? "default" : "outline"
                                  }
                                >
                                  {trend.severity}
                                </Badge>
                              </div>
                              <p className="text-sm mt-1">{trend.description}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {analysis.frictionPoints && analysis.frictionPoints.length > 0 && (
                      <div className="space-y-3 mt-6">
                        <Separator className="my-4" />
                        <h3 className="text-md font-semibold flex items-center">
                          <Badge variant="outline" className="mr-2">Friction</Badge>
                          Identified Friction Points
                        </h3>
                        <ul className="space-y-2">
                          {analysis.frictionPoints.map((point: any, i: number) => (
                            <li key={`friction-${i}`} className="border p-3 rounded-md">
                              <div className="flex justify-between items-start">
                                <span className="font-medium">{point.category}</span>
                                <Badge 
                                  variant={
                                    point.impact === "High" ? "destructive" : 
                                    point.impact === "Medium" ? "default" : "outline"
                                  }
                                >
                                  {point.impact}
                                </Badge>
                              </div>
                              <p className="text-sm mt-1">{point.description}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {analysis.recommendations && analysis.recommendations.length > 0 && (
                      <div className="space-y-3 mt-6">
                        <Separator className="my-4" />
                        <h3 className="text-md font-semibold flex items-center">
                          <Badge variant="outline" className="mr-2">Actions</Badge>
                          Recommended Actions
                        </h3>
                        <ul className="space-y-2">
                          {analysis.recommendations.map((rec: any, i: number) => (
                            <li key={`rec-${i}`} className="border p-3 rounded-md">
                              <div className="flex justify-between items-start">
                                <span className="font-medium">{rec.category}</span>
                                <Badge 
                                  variant={
                                    rec.priority === "High" ? "destructive" : 
                                    rec.priority === "Medium" ? "default" : "outline"
                                  }
                                >
                                  {rec.priority}
                                </Badge>
                              </div>
                              <p className="text-sm mt-1">{rec.description}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
                
                {!analysis.content && !analysis.trends && !analysis.frictionPoints && !analysis.recommendations && (
                  <div className="text-center py-8 text-muted-foreground">
                    No analysis data was returned. Please try a different prompt.
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="border-t pt-4 text-xs text-muted-foreground">
            Analysis generated based on your prompt: "{prompt}"
          </CardFooter>
        </Card>
      )}
    </div>
  );
}