import { useState } from "react";
import { Sparkles, Send, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import GuidedTour from "@/components/demo/GuidedTour";

// Example prompts that users might ask
const examplePrompts = [
  "What are the most common issues in our squad movement techniques?",
  "Analyze our communication effectiveness across recent training events",
  "What training areas show the most improvement over the last 3 months?",
  "Identify recurring leadership challenges from recent AARs",
  "Which squad shows the most consistent performance in live fire exercises?",
  "What are the key differences in performance between day and night operations?",
  "How effective has our medical evacuation training been?",
  "Compare the performance of 1st and 2nd platoons in recent events"
];

// Pre-generated responses for demo purposes
const demoResponses: { [key: string]: string } = {
  "What are the most common issues in our squad movement techniques?": 
`Based on analysis of 28 recent AARs related to squad movement, the most common issues are:

1. **Spacing Consistency (High Frequency)**
   Squad members frequently fail to maintain consistent spacing during tactical movements, especially in restricted terrain. This issue appears in 68% of AARs concerning movement techniques.

2. **Formation Transitions (Medium Frequency)**
   Transitions between different movement formations (wedge, file, etc.) are often described as "jerky" or "disorganized," particularly when reacting to simulated contact. This appears in 52% of relevant AARs.

3. **Security During Halts (High Frequency)**
   Multiple AARs (74%) note inadequate security posture during temporary halts, with particular weakness in rear security and hasty defensive positioning.

4. **Pace Management (Medium Frequency)**
   Maintaining appropriate movement pace that balances mission timelines with tactical considerations is mentioned as problematic in 47% of AARs, with squad leaders sometimes prioritizing speed over security.

5. **Hand Signal Utilization (High Frequency)**
   Inconsistent use and recognition of hand signals during noise-disciplined movement appears in 70% of AARs, with newer personnel showing particular difficulty with more complex signals.

The data suggests focusing training on consistent spacing drills, formation transition practice, and standardizing hand signal protocols across all squads.`,

  "Analyze our communication effectiveness across recent training events":
`Analysis of communication effectiveness across 37 training events reveals several key patterns:

## Strengths

1. **Radio Discipline in Garrison Operations**
   - Consistent proper radio protocols observed in 82% of non-field training events
   - Effective use of correct call signs and brevity codes during routine communications

2. **Small Unit (Fire Team) Communication**
   - Efficient intra-team communication noted in 78% of AARs
   - Strong non-verbal communication within fire teams during close-quarters operations

## Areas for Improvement

1. **Communication Under Stress (Critical)**
   - 73% of AARs report communication breakdown during simulated contact
   - Radio procedure adherence drops significantly when units are under pressure
   - Message clarity and conciseness deteriorate during high-tempo operations

2. **Inter-Squad Communication (Significant)**
   - Information sharing between squads is inconsistent (noted in 65% of AARs)
   - Critical information often fails to propagate horizontally across squads
   - Squad leaders sometimes operate as information "silos"

3. **Technical Issues (Moderate)**
   - Recurring equipment failures during extended field operations (54% of events)
   - Inconsistent radio configurations and frequency management
   - Battery management issues during multi-day exercises

## Recommendations

1. Implement high-stress communication drills specifically designed to maintain proper procedures under pressure
2. Institute cross-squad information sharing requirements during operations
3. Develop and enforce standardized equipment checks with emphasis on communication gear
4. Consider dedicated communication NCO roles for company-level exercises

Recent trend analysis shows marginal improvement in communication under stress (12% better than previous quarter), but significant room for further enhancement remains.`,

  "What training areas show the most improvement over the last 3 months?":
`Based on comparative analysis of AARs from the last 3 months against the previous quarter, these training areas show the most significant improvement:

## 1. Night Operations (76% Improvement)
- Night movement techniques show consistently positive comments in recent AARs
- NVG proficiency has increased dramatically across all squads
- Light discipline violations decreased by 83% in the last quarter
- Particularly strong improvement in 2nd Platoon's night navigation capabilities

## 2. Weapons Handling (62% Improvement)
- Malfunction clearance times have decreased by an average of 48%
- Weapons qualification scores have improved by 23% across the battalion
- Safety violations during range operations down 91%
- Notable improvement in transition drills between primary and secondary weapons

## 3. CBRN Response (58% Improvement)
- MOPP gear donning times have decreased by 31% on average
- Contamination avoidance procedures consistently rated as "excellent" in recent exercises
- Equipment checks and maintenance standards significantly improved
- Decontamination procedures now meeting or exceeding time standards

## 4. Medical Evacuation (54% Improvement)
- Casualty assessment times decreased by 37%
- Proper casualty movement techniques observed in 94% of recent evaluations
- MEDEVAC request procedures correctly followed in 89% of scenarios (up from 62%)
- Triage decision-making shows marked improvement, especially under stress

## 5. Land Navigation (47% Improvement)
- Average navigation errors decreased by 41%
- Time to reach checkpoints improved by 28%
- Terrain association skills specifically mentioned as improved in 73% of relevant AARs
- Particularly strong improvement noted among junior NCOs

Training areas showing minimal or no improvement include vehicle maintenance procedures, supply accountability, and crew-served weapons employment.`,
};

export default function DemoCustomPrompt() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [selectedExample, setSelectedExample] = useState<string | null>(null);

  // Handle submitting a prompt
  const handleSubmit = () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      // Show pre-generated response if available, otherwise generic response
      if (demoResponses[prompt]) {
        setResponse(demoResponses[prompt]);
      } else {
        setResponse(`Analysis based on your prompt: "${prompt}"\n\nThis is a demonstration of how GreenBookAAR can provide custom analysis based on specific prompts. In the full version, this would generate a detailed analysis of your unit's training data that specifically addresses your question.`);
      }
      
      setIsLoading(false);
    }, 2000);
  };

  // Set an example prompt
  const selectExamplePrompt = (example: string) => {
    setPrompt(example);
    setSelectedExample(example);
  };

  return (
    <div className="container py-6">
      <GuidedTour />
      
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Custom AI Analysis</h1>
            <p className="text-muted-foreground">
              Ask specific questions about your training data and get tailored insights
            </p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-yellow-500" />
                  <CardTitle>Ask GreenBookAAR</CardTitle>
                </div>
                <CardDescription>
                  Enter a prompt about your training data to get custom analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 prompt-input"> {/* This div is targeted by the tour highlight */}
                  <Textarea
                    placeholder="Enter your question or analysis request here..."
                    className="min-h-[120px] resize-none"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
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
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Generate Analysis
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                {response && (
                  <div className="mt-8 border rounded-md p-4 bg-muted/30">
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <Sparkles className="h-5 w-5 mr-2 text-yellow-500" />
                      GreenBookAAR Analysis
                    </h3>
                    <div className="whitespace-pre-line text-sm">
                      {response}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Example Prompts</CardTitle>
                <CardDescription>
                  Try one of these sample questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {examplePrompts.map((example, index) => (
                    <Button
                      key={index}
                      variant={selectedExample === example ? "default" : "outline"}
                      className="w-full justify-start text-left h-auto py-2 px-4"
                      onClick={() => selectExamplePrompt(example)}
                    >
                      {example}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
                <CardDescription>
                  Understanding custom AI analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>What can I ask?</AccordionTrigger>
                    <AccordionContent>
                      You can ask any question related to your unit's training performance, 
                      patterns in AARs, comparative analysis between units or time periods, 
                      and specific insights about training categories.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger>How does it work?</AccordionTrigger>
                    <AccordionContent>
                      GreenBookAAR analyzes all accessible AAR data, training events, and historical 
                      performance metrics. It uses advanced natural language processing to understand 
                      your specific question and generates insights based on patterns in your data.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                    <AccordionTrigger>Who can use this feature?</AccordionTrigger>
                    <AccordionContent>
                      Any user can analyze data they have access to. Unit leaders can analyze data 
                      from their unit and subordinate units, while individual soldiers can analyze 
                      their personal training history and units they've been assigned to.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}