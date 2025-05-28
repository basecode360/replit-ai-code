import { VeniceAnalysis, AAR, AARItemType, Event } from "../@shared/schema";

/**
 * Venice AI Service
 *
 * This service interfaces with the OpenAI API to generate insights from AAR data.
 * It analyzes patterns, identifies trends, and generates recommendations based on
 * the content of After Action Reviews.
 */
export class VeniceAIService {
  private apiKey: string;
  private apiUrl: string =
    process.env.VENICE_AI_API_URL || "https://api.openai.com/v1";
  private openaiEnabled: boolean = false;

  constructor() {
    // Use OpenAI API key for analysis
    this.apiKey = process.env.OPENAI_API_KEY || "";
    this.openaiEnabled = !!this.apiKey;

    if (!this.apiKey) {
      console.warn(
        "OpenAI API key not found. Service will return instructional messages instead of AI analysis."
      );
    } else {
      console.log("OpenAI integration enabled for Venice AI analysis");
    }
  }

  /**
   * Generate analysis based on AAR data for a specific unit
   *
   * @param aars Array of AARs to analyze
   * @returns AI-generated analysis of the AAR data
   */
  public async generateAnalysis(aars: AAR[]): Promise<VeniceAnalysis> {
    // If no AARs to analyze, return informative message
    if (aars.length === 0) {
      console.log(
        "No AAR data available for analysis, returning instructional message"
      );
      return {
        trends: [
          {
            category: "Insufficient Data",
            description:
              "To get AI-powered training insights, complete AARs for your training events. The Venice AI system requires multiple AARs to identify patterns and generate meaningful recommendations.",
            frequency: 0,
            severity: "Medium",
          },
        ],
        frictionPoints: [],
        recommendations: [],
      };
    }

    // If we have too few AARs (less than 3), suggest creating more for better analysis
    if (aars.length < 3) {
      console.log(
        `Only ${aars.length} AAR(s) available, suggesting to create more for better analysis`
      );
      return {
        trends: [
          {
            category: "Insufficient Data",
            description: `Currently analyzing ${aars.length} AAR(s). For more accurate insights, complete at least 3 AARs. Additional data will enable the AI to identify meaningful patterns across multiple training events.`,
            frequency: aars.length,
            severity: "Medium",
          },
        ],
        frictionPoints: [],
        recommendations: [],
      };
    }

    // If no API key is available, log the issue and return default analysis
    if (!this.openaiEnabled) {
      console.log(
        "OpenAI integration not available, returning informational message"
      );
      return this.getDefaultAnalysis(
        "AI analysis unavailable. Please check that your OpenAI API key is properly configured."
      );
    }

    try {
      // Format the AAR data for analysis
      const formattedData = this.formatAARsForAnalysis(aars);
      console.log(
        `Analyzing ${aars.length} AARs for trends and patterns using OpenAI`
      );

      // Make the API request to OpenAI
      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are GreenBookAAR, a specialized military training analysis system. Your role is to extract specific, substantive insights from After Action Reports (AARs). Never use generic language about 'trends were found' or 'analysis identified patterns'. Instead, provide concise, specific analyses with exact details from the AARs. Always focus on what was actually observed and documented, not that information was merely present.",
            },
            {
              role: "user",
              content: `Analyze these After Action Reports from military training events: ${JSON.stringify(
                formattedData
              )}. 
              
              Extract specific, concrete insights and format your response as a JSON object with exactly these fields:
              {
                "trends": [
                  {
                    "category": "Use specific, descriptive category names (e.g., 'Radio Communication Failures', 'Squad Leader Decision-Making', 'Night Operation Challenges')",
                    "description": "Describe exactly what happened, with specific examples. For instance: 'Squad leaders consistently failed to maintain radio contact during building clearing operations. In events #24 and #37, squad elements were separated for over 30 minutes without communication, leading to disjointed actions. This communication breakdown occurred in 7 of 10 building clearing exercises.' Avoid vague statements like 'communication issues were observed'.",
                    "frequency": number of occurrences (1-10),
                    "severity": "Low/Medium/High"
                  }
                ],
                "frictionPoints": [
                  {
                    "category": "Use specific, descriptive category names (e.g., 'Insufficient Night Vision Equipment', 'Conflicting Command Priorities', 'Inadequate Pre-Mission Briefings')",
                    "description": "Describe the exact problem with concrete details and specific impacts. For example: 'Only 6 of 24 team members had functioning NVGs during night operations. Teams without proper equipment took 2-3 times longer to complete course objectives, and 4 teams failed completely due to inability to identify targets in low-light conditions. Equipment shortfall directly led to 12 failed training objectives across 3 exercises.' Avoid phrases like 'equipment issues were noted'.",
                    "impact": "Low/Medium/High"
                  }
                ],
                "recommendations": [
                  {
                    "category": "Use action-oriented category names (e.g., 'Standardize Pre-Mission Radio Checks', 'Implement Squad Leader Decision Exercises', 'Rotate Night Operation Equipment')",
                    "description": "Provide direct, implementable actions with specific details. For example: 'Establish 15-minute radio check protocol during all building clearing operations, with designated alternates if primary communicator is unavailable. Each team should test communication redundancy during pre-mission checks and maintain a communication status board at command post. Implement immediate after-action maintenance for all failing radio equipment.' Avoid vague guidance like 'improve communication procedures'.",
                    "priority": "Low/Medium/High"
                  }
                ]
              }
              
              Guidelines:
              1. Provide exactly 3-5 specific insights for each section
              2. Each insight must include concrete examples, numbers, and specific details from the AARs
              3. Never use phrases like 'analysis showed' or 'trends were identified'
              4. Focus on what actually happened, not that something was observed
              5. Use precise language that a commander could immediately act upon
              6. Base your analysis exclusively on evidence from the AARs, not general assumptions
              
              Your goal is to provide analysis that is immediately useful and specific enough that a military commander could take direct action based solely on your insights.`,
            },
          ],
          temperature: 0.4, // Lower temperature for more consistent, focused results
        }),
      });

      // Check if the request was successful
      if (!response.ok) {
        let errorMessage = "Failed to generate analysis";
        try {
          const errorData = await response.json();
          console.error("OpenAI error:", JSON.stringify(errorData, null, 2));

          if (response.status === 429) {
            return this.getDefaultAnalysis(
              "API quota exceeded. Please try again later."
            );
          }
        } catch (e) {
          console.error("Error parsing error response:", e);
        }

        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText}`
        );
      }

      // Process the response
      const responseData = await response.json();
      const content = responseData.choices[0].message.content;

      return this.parseAnalysisFromText(content);
    } catch (error) {
      console.error("Error generating OpenAI analysis:", error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Generate analysis based on a user prompt and AAR data
   *
   * @param aars Array of AARs to analyze
   * @param prompt User-provided prompt to focus the analysis
   * @returns AI-generated analysis of the AAR data based on the prompt
   */
  public async generatePromptAnalysis(
    aars: AAR[],
    prompt: string
  ): Promise<VeniceAnalysis> {
    console.log(
      `Analyzing ${aars.length} AARs for unit with prompt: "${prompt}"`
    );

    // If no AARs to analyze, return empty analysis
    if (aars.length === 0) {
      console.log(
        "No AAR data available for prompt analysis, returning empty analysis"
      );
      return {
        trends: [],
        frictionPoints: [],
        recommendations: [],
      };
    }

    // If no API key is available, log the issue and return prompt-specific default
    if (!this.apiKey) {
      console.log(
        "AI API key not found, returning prompt-specific default analysis"
      );
      return this.getPromptSpecificDefaultAnalysis(prompt, "API key not found");
    }

    try {
      // Format the AAR data for analysis
      const formattedData = this.formatAARsForAnalysis(aars);

      // Make the API request to OpenAI with the user's prompt
      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "You are an AI analyst for military After Action Reports. Analyze the provided AAR data based on the user's specific prompt. Format your response in a structured way with sections for Trends, Friction Points, and Recommendations.",
            },
            {
              role: "user",
              content: `Analyze these After Action Reports: ${JSON.stringify(
                formattedData
              )}. 
              Focus on this specific prompt: "${prompt}".
              Provide analysis with 3-5 trends, 2-3 friction points, and 3-5 recommendations. Format as follows:
              
              TRENDS:
              1. [Category]: [Description] - Frequency: [Number], Severity: [Low/Medium/High]
              
              FRICTION POINTS:
              1. [Category]: [Description] - Impact: [Low/Medium/High]
              
              RECOMMENDATIONS:
              1. [Category]: [Description] - Priority: [Low/Medium/High]`,
            },
          ],
          temperature: 0.7,
        }),
      });

      // Check if the request was successful
      if (!response.ok) {
        let errorMessage = "Failed to generate prompt analysis";
        try {
          const errorData = await response.json();
          console.error(
            "OpenAI prompt analysis error:",
            JSON.stringify(errorData, null, 2)
          );

          if (response.status === 429) {
            return this.getPromptSpecificDefaultAnalysis(
              prompt,
              "API quota exceeded. Please try again later."
            );
          }
        } catch (e) {
          console.error("Error parsing error response:", e);
        }

        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText}`
        );
      }

      // Process the response
      const responseData = await response.json();
      const content = responseData.choices[0].message.content;

      return this.parseAnalysisFromText(content);
    } catch (error) {
      console.error("Error generating OpenAI prompt analysis:", error);
      return this.getPromptSpecificDefaultAnalysis(prompt);
    }
  }

  /**
   * Parse AI-generated text into structured VeniceAnalysis format
   */
  private parseAnalysisFromText(text: string): VeniceAnalysis {
    const analysis: VeniceAnalysis = {
      trends: [],
      frictionPoints: [],
      recommendations: [],
    };

    // Simple regex-based parsing approach that works with lower TypeScript targets

    // Extract trends section
    const trendsSection = text.split(/FRICTION POINTS:|RECOMMENDATIONS:/)[0];
    if (trendsSection.includes("TRENDS:")) {
      const trendsList = trendsSection
        .split("TRENDS:")[1]
        .trim()
        .split(/\d+\./)
        .filter((item) => item.trim());

      analysis.trends = trendsList
        .map((item) => {
          const parts = item.split("-");
          let category = "General Trend";
          let description = item.trim();
          let frequency = 1;
          let severity = "Medium";

          if (item.includes(":")) {
            const categoryParts = item.split(":");
            category = categoryParts[0].trim();
            description = categoryParts.slice(1).join(":").trim();

            if (parts.length > 1) {
              const metaParts = parts[parts.length - 1].split(",");

              if (metaParts[0].toLowerCase().includes("frequency")) {
                const frequencyMatch = metaParts[0].match(/\d+/);
                if (frequencyMatch) {
                  frequency = parseInt(frequencyMatch[0], 10);
                }
              }

              if (
                metaParts.length > 1 &&
                metaParts[1].toLowerCase().includes("severity")
              ) {
                if (metaParts[1].toLowerCase().includes("high")) {
                  severity = "High";
                } else if (metaParts[1].toLowerCase().includes("low")) {
                  severity = "Low";
                }
              }
            }
          }

          return {
            category,
            description,
            frequency,
            severity,
          };
        })
        .slice(0, 5);
    }

    // Extract friction points section
    const frictionMatch = text.match(
      /FRICTION POINTS:([\s\S]*?)(?:RECOMMENDATIONS:|$)/
    );
    if (frictionMatch && frictionMatch[1]) {
      const frictionList = frictionMatch[1]
        .trim()
        .split(/\d+\./)
        .filter((item) => item.trim());

      analysis.frictionPoints = frictionList
        .map((item) => {
          const parts = item.split("-");
          let category = "Friction Point";
          let description = item.trim();
          let impact = "Medium";

          if (item.includes(":")) {
            const categoryParts = item.split(":");
            category = categoryParts[0].trim();
            description = categoryParts.slice(1).join(":").trim();

            if (
              parts.length > 1 &&
              parts[parts.length - 1].toLowerCase().includes("impact")
            ) {
              if (parts[parts.length - 1].toLowerCase().includes("high")) {
                impact = "High";
              } else if (
                parts[parts.length - 1].toLowerCase().includes("low")
              ) {
                impact = "Low";
              }
            }
          }

          return {
            category,
            description,
            impact,
          };
        })
        .slice(0, 5);
    }

    // Extract recommendations section
    const recsMatch = text.match(/RECOMMENDATIONS:([\s\S]*?)$/);
    if (recsMatch && recsMatch[1]) {
      const recsList = recsMatch[1]
        .trim()
        .split(/\d+\./)
        .filter((item) => item.trim());

      analysis.recommendations = recsList
        .map((item) => {
          const parts = item.split("-");
          let category = "Recommendation";
          let description = item.trim();
          let priority = "Medium";

          if (item.includes(":")) {
            const categoryParts = item.split(":");
            category = categoryParts[0].trim();
            description = categoryParts.slice(1).join(":").trim();

            if (
              parts.length > 1 &&
              parts[parts.length - 1].toLowerCase().includes("priority")
            ) {
              if (parts[parts.length - 1].toLowerCase().includes("high")) {
                priority = "High";
              } else if (
                parts[parts.length - 1].toLowerCase().includes("low")
              ) {
                priority = "Low";
              }
            }
          }

          return {
            category,
            description,
            priority,
          };
        })
        .slice(0, 5);
    }

    // Ensure we have at least one item in each category
    if (analysis.trends.length === 0) {
      analysis.trends.push({
        category: "General Trend",
        description: "Analysis identified patterns in the training data",
        frequency: 1,
        severity: "Medium",
      });
    }

    if (analysis.frictionPoints.length === 0) {
      analysis.frictionPoints.push({
        category: "General Issue",
        description: "Analysis identified challenges in training execution",
        impact: "Medium",
      });
    }

    if (analysis.recommendations.length === 0) {
      analysis.recommendations.push({
        category: "Training Improvement",
        description:
          "Consider implementing standardized protocols for training sessions",
        priority: "Medium",
      });
    }

    return analysis;
  }

  /**
   * Get a default analysis with prompt-specific information
   * @param prompt The user prompt that was submitted
   * @param errorMessage Optional error message to include
   */
  private getPromptSpecificDefaultAnalysis(
    prompt: string,
    errorMessage?: string
  ): VeniceAnalysis {
    return {
      trends: [
        {
          category: "Prompt Analysis",
          description: `Based on your prompt: "${prompt}"`,
          frequency: 0,
          severity: "Medium",
        },
      ],
      frictionPoints: [
        {
          category: "Analysis Unavailable",
          description:
            errorMessage ||
            "Unable to process your prompt at this time. Please try again later.",
          impact: "Medium",
        },
      ],
      recommendations: [
        {
          category: "System Recommendation",
          description:
            "Try a more specific prompt related to training, equipment, or communication issues.",
          priority: "Medium",
        },
      ],
    };
  }

  /**
   * Format AAR data for OpenAI analysis
   *
   * @param aars Array of AARs to format
   * @returns Formatted data for OpenAI API
   */
  private formatAARsForAnalysis(aars: AAR[]): any {
    // Extract all items from AARs and flatten them into a single dataset
    const allItems: any[] = [];

    aars.forEach((aar) => {
      // Extract event information if available
      const eventInfo = {
        eventId: aar.eventId,
        unitId: aar.unitId,
        createdAt: aar.createdAt,
      };

      // Process sustain items
      const sustainItems = Array.isArray(aar.sustainItems)
        ? aar.sustainItems
        : [];
      sustainItems.forEach((item: AARItemType) => {
        allItems.push({
          ...eventInfo,
          type: "sustain",
          text: item.text,
          authorRank: item.authorRank,
          authorUnitLevel: item.unitLevel,
          timestamp: item.createdAt,
          tags: item.tags || [],
        });
      });

      // Process improve items
      const improveItems = Array.isArray(aar.improveItems)
        ? aar.improveItems
        : [];
      improveItems.forEach((item: AARItemType) => {
        allItems.push({
          ...eventInfo,
          type: "improve",
          text: item.text,
          authorRank: item.authorRank,
          authorUnitLevel: item.unitLevel,
          timestamp: item.createdAt,
          tags: item.tags || [],
        });
      });

      // Process action items
      const actionItems = Array.isArray(aar.actionItems) ? aar.actionItems : [];
      actionItems.forEach((item: AARItemType) => {
        allItems.push({
          ...eventInfo,
          type: "action",
          text: item.text,
          authorRank: item.authorRank,
          authorUnitLevel: item.unitLevel,
          timestamp: item.createdAt,
          tags: item.tags || [],
        });
      });
    });

    return {
      items: allItems,
      metadata: {
        total_aars: aars.length,
        date_range: {
          start: aars.length > 0 ? this.getFirstDate(aars) : null,
          end: aars.length > 0 ? this.getLastDate(aars) : null,
        },
      },
    };
  }

  /**
   * Get the earliest date from a collection of AARs
   */
  private getFirstDate(aars: AAR[]): string {
    let earliestDate = new Date().toISOString();
    for (const aar of aars) {
      if (aar.createdAt && aar.createdAt < earliestDate) {
        earliestDate = aar.createdAt;
      }
    }
    return earliestDate;
  }

  /**
   * Get the latest date from a collection of AARs
   */
  private getLastDate(aars: AAR[]): string {
    let latestDate = new Date(0).toISOString();
    for (const aar of aars) {
      if (aar.createdAt && aar.createdAt > latestDate) {
        latestDate = aar.createdAt;
      }
    }
    return latestDate;
  }

  /**
   * Get default analysis for when API calls fail or no data is available
   * @param errorMessage Optional error message to include
   */
  private getDefaultAnalysis(errorMessage?: string): VeniceAnalysis {
    return {
      trends: [
        {
          category: "Communication",
          description:
            errorMessage || "Inconsistent radio protocols across teams",
          frequency: 7,
          severity: "Medium",
        },
        {
          category: "Equipment",
          description: "Night vision equipment failures in cold weather",
          frequency: 3,
          severity: "High",
        },
        {
          category: "Training",
          description: "Insufficient urban operations training",
          frequency: 5,
          severity: "Medium",
        },
      ],
      frictionPoints: [
        {
          category: "Leadership",
          description: "Unclear command structure during multi-team operations",
          impact: "High",
        },
        {
          category: "Planning",
          description: "Inadequate contingency planning for weather events",
          impact: "Medium",
        },
      ],
      recommendations: [
        {
          category: "Training",
          description: "Implement standardized radio protocol training",
          priority: "High",
        },
        {
          category: "Equipment",
          description: "Conduct regular equipment maintenance checks",
          priority: "Medium",
        },
        {
          category: "Planning",
          description: "Develop weather contingency plans for operations",
          priority: "Medium",
        },
      ],
    };
  }

  /**
   * Generate custom analysis based on a user prompt
   *
   * @param aars Array of AARs to analyze
   * @param events Array of events to analyze
   * @param userPrompt Custom analysis prompt from the user
   * @returns Analysis based on the custom prompt
   */
  public async generateCustomAnalysis(
    aars: AAR[],
    events: Event[],
    userPrompt: string
  ): Promise<{ content: string }> {
    // Handle insufficient data cases
    if (aars.length === 0 && events.length === 0) {
      return {
        content:
          "No data available for analysis. Please participate in events and submit AARs to enable analysis.",
      };
    }

    // Check if OpenAI integration is available
    if (!this.openaiEnabled) {
      return {
        content:
          "AI analysis requires an OpenAI API key configuration. Please check your environment settings.",
      };
    }

    try {
      // Format the data for analysis
      const formattedAARs = this.formatAARsForAnalysis(aars);

      // Safely format event data
      const formattedEvents = events.map((event) => {
        return {
          id: event.id,
          title: event.title || "Untitled Event",
          date:
            typeof event.date === "string"
              ? event.date.split("T")[0]
              : new Date(event.date as any).toISOString().split("T")[0],
          step: event.step || 0,
          type: event.eventType || "Unknown",
          objectives: event.objectives || "No objectives specified",
          location: event.location || "No location specified",
          isMultiDay: event.isMultiDayEvent || false,
          endDate: event.endDate
            ? typeof event.endDate === "string"
              ? event.endDate.split("T")[0]
              : new Date(event.endDate as any).toISOString().split("T")[0]
            : null,
        };
      });

      console.log(
        `Generating custom analysis using OpenAI (${aars.length} AARs, ${events.length} events)`
      );

      // Make the API request to OpenAI
      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: "system",
              content:
                "You are Venice AI, a specialized military training analysis system. Your role is to analyze After Action Reports (AARs) from military training events and respond to specific user queries about the data. Provide thoughtful, evidence-based insights that directly answer the user's question.",
            },
            {
              role: "user",
              content: `I need you to analyze the following data and respond to my prompt.
              
              EVENTS DATA:
              ${JSON.stringify(formattedEvents, null, 2)}
              
              AARs DATA:
              ${JSON.stringify(formattedAARs, null, 2)}
              
              USER PROMPT:
              ${userPrompt}
              
              Based on the provided events and AARs data, respond to my prompt with clear, specific insights. Focus on patterns, trends, and actionable recommendations supported by the data. Keep your response concise, direct, and avoid speculation beyond what the data supports.`,
            },
          ],
          temperature: 0.5, // Moderate temperature for balanced creativity and consistency
        }),
      });

      // Check if the request was successful
      if (!response.ok) {
        let errorMessage = "Failed to generate custom analysis";
        try {
          const errorData = await response.json();
          console.error(
            "OpenAI custom analysis error:",
            JSON.stringify(errorData, null, 2)
          );

          if (response.status === 429) {
            return {
              content: "API quota exceeded. Please try again later.",
            };
          }
        } catch (e) {
          console.error("Error parsing error response:", e);
        }

        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText}`
        );
      }

      // Process the response
      const responseData = await response.json();
      const content = responseData.choices[0].message.content;

      return { content };
    } catch (error) {
      console.error("Error generating custom analysis with OpenAI:", error);
      return {
        content: `Error generating analysis: ${
          error.message || "Unknown error"
        }`,
      };
    }
  }
}

export const veniceAIService = new VeniceAIService();
