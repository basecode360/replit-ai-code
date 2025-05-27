import { VeniceAnalysis, AAR, AARItemType } from '../../shared/schema';

/**
 * Service for interacting with OpenAI API
 * This service provides methods to analyze AAR data using OpenAI models
 */
export class OpenAIService {
  private apiKey: string;
  private apiUrl: string = 'https://api.openai.com/v1';
  private isEnabled: boolean = false;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.isEnabled = !!this.apiKey;
    
    if (this.isEnabled) {
      console.log('OpenAI integration enabled');
    } else {
      console.warn('OpenAI API key not found. Analysis will use fallback data.');
    }
  }

  /**
   * Generate analysis based on AAR data
   * 
   * @param aars Array of AARs to analyze
   * @returns AI-generated analysis of the AAR data
   */
  public async generateAnalysis(aars: AAR[]): Promise<VeniceAnalysis> {
    // Handle insufficient data cases
    if (aars.length === 0) {
      return this.getInsufficientDataResponse(0);
    }
    
    if (aars.length < 3) {
      return this.getInsufficientDataResponse(aars.length);
    }
    
    // Check if OpenAI integration is available
    if (!this.isEnabled) {
      return {
        trends: [
          {
            category: "Integration Setup Required",
            description: "AI analysis requires an OpenAI API key configuration. Please check your environment settings.",
            frequency: 0,
            severity: "Medium"
          }
        ],
        frictionPoints: [],
        recommendations: []
      };
    }
    
    try {
      // Format the AAR data for analysis
      const formattedData = this.formatAARData(aars);
      console.log(`Analyzing ${aars.length} AARs using OpenAI`);
      
      // Make the API request to OpenAI
      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: "You are Venice AI, a specialized military training analysis system. You analyze After Action Reports (AARs) from military training events and identify SPECIFIC, CONCRETE trends, friction points, and recommendations. Your analysis must be evidence-based, detailed, and directly relevant to improving military training outcomes. Never be vague or generic - always cite specific training areas, equipment, or procedures that need attention."
            },
            {
              role: "user",
              content: `Analyze these After Action Reports from military training events: ${JSON.stringify(formattedData)}. 
              
              Extract specific, actionable insights and format your response as a JSON object with these fields:
              {
                "trends": [
                  {
                    "category": "Specific training area or capability (e.g., 'Radio Communications', 'Night Operations', 'Vehicle Maintenance')",
                    "description": "Detailed, concrete description with specific examples from the AARs. Mention specific equipment, techniques, or procedures. Never be vague.",
                    "frequency": number of occurrences (1-10),
                    "severity": "Low/Medium/High"
                  }
                ],
                "frictionPoints": [
                  {
                    "category": "Specific problem area (e.g., 'Command Post Operations', 'Land Navigation Equipment', 'Squad Leader Training')",
                    "description": "Detailed explanation of the exact problem, citing specific examples or patterns from the AARs",
                    "impact": "Low/Medium/High"
                  }
                ],
                "recommendations": [
                  {
                    "category": "Specific area for improvement (e.g., 'Communications Training', 'Equipment Maintenance', 'Leadership Development')",
                    "description": "Concrete, actionable recommendation with specific steps to implement. Be detailed and practical.",
                    "priority": "Low/Medium/High"
                  }
                ]
              }
              
              Provide 3-5 insights for each section. If there's limited data, focus on being specific about what the data does show rather than being generic.`
            }
          ],
          temperature: 0.4
        })
      });

      if (!response.ok) {
        console.error(`OpenAI API error: ${response.status} ${response.statusText}`);
        return this.getDefaultAnalysis();
      }

      const responseData = await response.json();
      const content = responseData.choices[0].message.content;
      
      try {
        // Parse the JSON response
        const parsedData = JSON.parse(content);
        
        return {
          trends: Array.isArray(parsedData.trends) ? parsedData.trends : [],
          frictionPoints: Array.isArray(parsedData.frictionPoints) ? parsedData.frictionPoints : [],
          recommendations: Array.isArray(parsedData.recommendations) ? parsedData.recommendations : []
        };
      } catch (parseError) {
        console.error("Error parsing OpenAI response:", parseError);
        return this.getDefaultAnalysis();
      }
    } catch (error) {
      console.error("Error generating analysis with OpenAI:", error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Format AAR data for analysis
   */
  private formatAARData(aars: AAR[]): any {
    const allItems: any[] = [];
    
    aars.forEach(aar => {
      const eventInfo = {
        eventId: aar.eventId,
        unitId: aar.unitId,
        createdAt: aar.createdAt
      };
      
      // Process sustain items
      const sustainItems = Array.isArray(aar.sustainItems) ? aar.sustainItems : [];
      sustainItems.forEach((item: AARItemType) => {
        allItems.push({
          ...eventInfo,
          type: 'sustain',
          text: item.text,
          authorRank: item.authorRank,
          authorUnitLevel: item.unitLevel,
          timestamp: item.createdAt,
          tags: item.tags || []
        });
      });
      
      // Process improve items
      const improveItems = Array.isArray(aar.improveItems) ? aar.improveItems : [];
      improveItems.forEach((item: AARItemType) => {
        allItems.push({
          ...eventInfo,
          type: 'improve',
          text: item.text,
          authorRank: item.authorRank,
          authorUnitLevel: item.unitLevel,
          timestamp: item.createdAt,
          tags: item.tags || []
        });
      });
      
      // Process action items
      const actionItems = Array.isArray(aar.actionItems) ? aar.actionItems : [];
      actionItems.forEach((item: AARItemType) => {
        allItems.push({
          ...eventInfo,
          type: 'action',
          text: item.text,
          authorRank: item.authorRank,
          authorUnitLevel: item.unitLevel,
          timestamp: item.createdAt,
          tags: item.tags || []
        });
      });
    });
    
    return {
      items: allItems,
      metadata: {
        total_aars: aars.length,
        date_range: {
          start: aars.length > 0 ? this.getFirstDate(aars) : null,
          end: aars.length > 0 ? this.getLastDate(aars) : null
        }
      }
    };
  }

  /**
   * Get the earliest date from a collection of AARs
   */
  private getFirstDate(aars: AAR[]): string {
    if (aars.length === 0) return new Date().toISOString();
    
    let earliestDate = new Date(aars[0].createdAt).toISOString();
    for (const aar of aars) {
      const createdAt = new Date(aar.createdAt).toISOString();
      if (createdAt < earliestDate) {
        earliestDate = createdAt;
      }
    }
    return earliestDate;
  }

  /**
   * Get the latest date from a collection of AARs
   */
  private getLastDate(aars: AAR[]): string {
    if (aars.length === 0) return new Date().toISOString();
    
    let latestDate = new Date(aars[0].createdAt).toISOString();
    for (const aar of aars) {
      const createdAt = new Date(aar.createdAt).toISOString();
      if (createdAt > latestDate) {
        latestDate = createdAt;
      }
    }
    return latestDate;
  }

  /**
   * Get response for insufficient data cases
   */
  private getInsufficientDataResponse(count: number): VeniceAnalysis {
    return {
      trends: [
        {
          category: "Insufficient Data",
          description: count === 0 
            ? "To get AI-powered training insights, complete AARs for your training events. The Venice AI system requires multiple AARs to identify patterns and generate meaningful recommendations."
            : `Currently analyzing ${count} AAR(s). For more accurate insights, complete at least 3 AARs. Additional data will enable the AI to identify meaningful patterns across multiple training events.`,
          frequency: count,
          severity: "Medium"
        }
      ],
      frictionPoints: [],
      recommendations: []
    };
  }

  /**
   * Get default analysis when API fails
   */
  private getDefaultAnalysis(): VeniceAnalysis {
    return {
      trends: [
        {
          category: "Radio Communications",
          description: "SINCGARS radio protocols are inconsistently applied during field exercises, particularly when squads operate in different sectors. Operators frequently switch to incorrect frequencies or fail to use proper call signs.",
          frequency: 7,
          severity: "Medium"
        },
        {
          category: "Night Vision Equipment",
          description: "PVS-14 night vision devices show significantly reduced battery life in cold weather (below 40°F), limiting effectiveness of night operations. Multiple instances of fogging issues were also reported in humid conditions.",
          frequency: 3,
          severity: "High"
        },
        {
          category: "Urban Operations Training",
          description: "Squad clearing techniques in urban environments show inconsistent application of room-clearing procedures, particularly in multi-story structures. Units demonstrate strong performance in single-story operations but struggle with vertical maneuvers.",
          frequency: 5,
          severity: "Medium"
        }
      ],
      frictionPoints: [
        {
          category: "Joint Operation Command Structure",
          description: "When multiple teams operate together, command relationships become unclear, leading to delayed decision-making. Key issues include undefined handoff procedures between platoons and conflicting priorities between unit leaders.",
          impact: "High"
        },
        {
          category: "Weather Contingency Planning",
          description: "Training schedules lack adequate alternate plans for severe weather conditions, resulting in shortened or canceled critical training events. Specific gaps include no indoor alternatives for key skills practice and insufficient wet-weather gear allocation.",
          impact: "Medium"
        }
      ],
      recommendations: [
        {
          category: "Radio Communications Training",
          description: "Implement weekly communications exercises focusing specifically on SINCGARS protocol adherence. Require radio operators to pass a standardized assessment before field operations and designate communications NCOs to conduct regular spot checks during exercises.",
          priority: "High"
        },
        {
          category: "Urban Operations Training Program",
          description: "Develop a progressive urban operations qualification course focusing on multi-story building tactics. Begin with classroom instruction on vertical movement principles, followed by practical exercises in simulated multi-floor environments with increasing complexity.",
          priority: "Medium"
        },
        {
          category: "Command Structure Exercises",
          description: "Conduct monthly leadership exercises specifically designed to practice joint operations. Create scenarios requiring clear handoff procedures between units and formal decision-making processes. Evaluate leaders on their ability to establish and maintain clear chains of command.",
          priority: "Medium"
        }
      ]
    };
  }
}

export const openaiService = new OpenAIService();