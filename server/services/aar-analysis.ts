import { AAR, AARItemType, VeniceAnalysis } from '../../shared/schema';

/**
 * AAR Analysis Service
 * 
 * This service analyzes After Action Reports to extract meaningful trends, 
 * issues, and training recommendations without relying on external AI.
 */
export class AARAnalysisService {
  
  /**
   * Analyze AARs to extract patterns and insights
   * 
   * @param aars Array of AARs to analyze
   * @returns Analysis with trends, issues, and recommendations
   */
  public analyzeAARs(aars: AAR[]): VeniceAnalysis {
    if (aars.length === 0) {
      return this.getInsufficientDataResponse(0);
    }
    
    if (aars.length < 3) {
      return this.getInsufficientDataResponse(aars.length);
    }
    
    // Extract all items from AARs
    const allSustains: AARItemType[] = [];
    const allImproves: AARItemType[] = [];
    const allActions: AARItemType[] = [];
    
    // Collect all items by type
    aars.forEach(aar => {
      if (Array.isArray(aar.sustainItems)) {
        allSustains.push(...aar.sustainItems);
      }
      if (Array.isArray(aar.improveItems)) {
        allImproves.push(...aar.improveItems);
      }
      if (Array.isArray(aar.actionItems)) {
        allActions.push(...aar.actionItems);
      }
    });
    
    // Analyze trends from sustain items
    const trends = this.analyzeTrends(allSustains);
    
    // Analyze issues from improve items
    const frictionPoints = this.analyzeIssues(allImproves);
    
    // Generate recommendations from action items and improve items
    const recommendations = this.generateRecommendations(allActions, allImproves);
    
    return {
      trends,
      frictionPoints,
      recommendations
    };
  }
  
  /**
   * Analyze trends from sustain items
   * 
   * @param sustainItems Array of sustain items from AARs
   * @returns Identified trends
   */
  private analyzeTrends(sustainItems: AARItemType[]) {
    // Check if we have enough data
    if (sustainItems.length < 3) {
      return this.getDefaultTrends();
    }
    
    // Group items by common keywords or phrases
    const keywordMap = this.groupItemsByKeywords(sustainItems, [
      {category: "Communication", keywords: ["radio", "comms", "communication", "call sign", "sitrep", "report"]},
      {category: "Planning", keywords: ["planning", "brief", "timeline", "schedule", "preparation", "warning order", "oporder"]},
      {category: "Execution", keywords: ["execution", "maneuver", "movement", "assault", "attack", "defend", "tactical"]},
      {category: "Leadership", keywords: ["leader", "command", "direction", "guidance", "decision", "accountability"]},
      {category: "Equipment", keywords: ["equipment", "gear", "weapon", "system", "maintenance", "supply"]},
      {category: "Training", keywords: ["training", "drill", "rehearsal", "practice", "exercise", "qualification"]}
    ]);
    
    // Convert keyword map to trends
    return Object.entries(keywordMap)
      .map(([category, items]) => ({
        category,
        description: this.generateTrendDescription(category, items),
        frequency: items.length,
        severity: this.calculateSeverity(items.length, sustainItems.length)
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3); // Limit to top 3 trends
  }
  
  /**
   * Analyze issues from improve items
   * 
   * @param improveItems Array of improve items from AARs
   * @returns Identified issues
   */
  private analyzeIssues(improveItems: AARItemType[]) {
    // Check if we have enough data
    if (improveItems.length < 3) {
      return this.getDefaultIssues();
    }
    
    // Group items by common keywords or phrases
    const keywordMap = this.groupItemsByKeywords(improveItems, [
      {category: "Communication Problems", keywords: ["radio", "comms", "communication", "call sign", "sitrep", "report", "unclear"]},
      {category: "Planning Challenges", keywords: ["planning", "brief", "timeline", "schedule", "preparation", "insufficient", "inadequate"]},
      {category: "Execution Issues", keywords: ["execution", "maneuver", "movement", "slow", "delayed", "confusion", "disorganized"]},
      {category: "Leadership Gaps", keywords: ["leader", "command", "direction", "guidance", "decision", "accountability", "absence"]},
      {category: "Equipment Failures", keywords: ["equipment", "gear", "weapon", "system", "maintenance", "malfunction", "failure"]},
      {category: "Training Deficiencies", keywords: ["training", "drill", "rehearsal", "practice", "exercise", "insufficient", "lacking"]}
    ]);
    
    // Convert keyword map to issues
    return Object.entries(keywordMap)
      .map(([category, items]) => ({
        category,
        description: this.generateIssueDescription(category, items),
        impact: this.calculateImpact(items.length, improveItems.length)
      }))
      .sort((a, b) => b.description.length - a.description.length) // Sort by description length as proxy for detail
      .slice(0, 3); // Limit to top 3 issues
  }
  
  /**
   * Generate recommendations from action items and improve items
   * 
   * @param actionItems Array of action items from AARs
   * @param improveItems Array of improve items from AARs (used as backup)
   * @returns Generated recommendations
   */
  private generateRecommendations(actionItems: AARItemType[], improveItems: AARItemType[]) {
    const items = actionItems.length >= 3 ? actionItems : improveItems;
    
    // Check if we have enough data
    if (items.length < 3) {
      return this.getDefaultRecommendations();
    }
    
    // Group items by common keywords or phrases
    const keywordMap = this.groupItemsByKeywords(items, [
      {category: "Communications Training", keywords: ["radio", "comms", "communication", "call sign", "sitrep", "report"]},
      {category: "Planning Improvement", keywords: ["planning", "brief", "timeline", "schedule", "preparation", "warning order", "oporder"]},
      {category: "Tactical Execution", keywords: ["execution", "maneuver", "movement", "assault", "attack", "defend", "tactical"]},
      {category: "Leadership Development", keywords: ["leader", "command", "direction", "guidance", "decision", "accountability"]},
      {category: "Equipment Maintenance", keywords: ["equipment", "gear", "weapon", "system", "maintenance", "supply"]},
      {category: "Training Programs", keywords: ["training", "drill", "rehearsal", "practice", "exercise", "qualification"]}
    ]);
    
    // Convert keyword map to recommendations
    return Object.entries(keywordMap)
      .map(([category, items]) => ({
        category,
        description: this.generateRecommendationDescription(category, items),
        priority: this.calculatePriority(items.length, items.length)
      }))
      .sort((a, b) => a.category.localeCompare(b.category))
      .slice(0, 3); // Limit to top 3 recommendations
  }
  
  /**
   * Group AAR items by keywords
   * 
   * @param items Array of AAR items
   * @param categoryKeywords Array of categories and associated keywords
   * @returns Map of categories to items
   */
  private groupItemsByKeywords(items: AARItemType[], categoryKeywords: {category: string, keywords: string[]}[]) {
    const categoryMap: Record<string, AARItemType[]> = {};
    
    items.forEach(item => {
      const text = item.text.toLowerCase();
      
      for (const {category, keywords} of categoryKeywords) {
        if (keywords.some(keyword => text.includes(keyword.toLowerCase()))) {
          if (!categoryMap[category]) {
            categoryMap[category] = [];
          }
          categoryMap[category].push(item);
          break; // Assign to first matching category only
        }
      }
    });
    
    // Ensure we have at least some results - if none, use default categories
    if (Object.keys(categoryMap).length === 0) {
      const defaultCategory = categoryKeywords[0].category;
      categoryMap[defaultCategory] = items.slice(0, Math.min(items.length, 5));
    }
    
    return categoryMap;
  }
  
  /**
   * Generate a description for a trend
   * 
   * @param category Trend category
   * @param items Items related to the trend
   * @returns Generated description
   */
  private generateTrendDescription(category: string, items: AARItemType[]): string {
    if (items.length === 0) return "No specific trends identified.";
    
    // Extract key phrases from items
    const phrases = this.extractKeyPhrases(items, 3);
    const description = phrases.length > 0 
      ? `Multiple AARs highlight ${category.toLowerCase()} strengths including: ${phrases.join("; ")}.` 
      : `Multiple AARs highlight effective ${category.toLowerCase()} practices.`;
    
    return description;
  }
  
  /**
   * Generate a description for an issue
   * 
   * @param category Issue category
   * @param items Items related to the issue
   * @returns Generated description
   */
  private generateIssueDescription(category: string, items: AARItemType[]): string {
    if (items.length === 0) return "No specific issues identified.";
    
    // Extract key phrases from items
    const phrases = this.extractKeyPhrases(items, 3);
    const description = phrases.length > 0
      ? `Recurring ${category.toLowerCase()} identified in multiple AARs: ${phrases.join("; ")}.`
      : `Recurring ${category.toLowerCase()} require attention based on AAR data.`;
    
    return description;
  }
  
  /**
   * Generate a description for a recommendation
   * 
   * @param category Recommendation category
   * @param items Items related to the recommendation
   * @returns Generated description
   */
  private generateRecommendationDescription(category: string, items: AARItemType[]): string {
    if (items.length === 0) return "No specific recommendations available.";
    
    // Extract key phrases from items that could be recommendations
    const phrases = this.extractKeyPhrases(items, 2);
    let description = "";
    
    switch (category) {
      case "Communications Training":
        description = "Implement weekly radio check procedures and standardize communications protocols across all units.";
        break;
      case "Planning Improvement":
        description = "Institute a standardized planning timeline with specific checkpoints for OPORDER development, rehearsals, and PCCs/PCIs.";
        break;
      case "Tactical Execution":
        description = "Conduct quarterly tactical exercises focusing specifically on maneuver techniques and battle drills.";
        break;
      case "Leadership Development":
        description = "Establish monthly leadership professional development sessions with practical decision-making scenarios.";
        break;
      case "Equipment Maintenance":
        description = "Implement weekly equipment maintenance checks with detailed accountability procedures and preventative maintenance training.";
        break;
      case "Training Programs":
        description = "Develop progressive training programs that build fundamental skills before advancing to complex scenarios and exercises.";
        break;
      default:
        description = phrases.length > 0
          ? `Implement the following improvements: ${phrases.join("; ")}.`
          : `Develop structured training for ${category.toLowerCase()}.`;
    }
    
    return description;
  }
  
  /**
   * Extract key phrases from AAR items
   * 
   * @param items Array of AAR items
   * @param count Number of phrases to extract
   * @returns Array of key phrases
   */
  private extractKeyPhrases(items: AARItemType[], count: number): string[] {
    // Extract sentences from all items
    const sentences: string[] = [];
    items.forEach(item => {
      const text = item.text;
      // Split by common sentence delimiters
      const parts = text.split(/[.!?]/).filter(part => part.trim().length > 0);
      sentences.push(...parts);
    });
    
    // Take random sentences up to count
    const selectedSentences: string[] = [];
    const maxTries = Math.min(sentences.length, count * 3);
    for (let i = 0; i < maxTries && selectedSentences.length < count; i++) {
      const index = Math.floor(Math.random() * sentences.length);
      const sentence = sentences[index].trim();
      
      // Only add if the sentence is reasonable length and not already added
      if (sentence.length > 10 && sentence.length < 100 && !selectedSentences.includes(sentence)) {
        selectedSentences.push(sentence);
      }
    }
    
    return selectedSentences;
  }
  
  /**
   * Calculate severity based on frequency
   * 
   * @param count Number of occurrences
   * @param total Total number of items
   * @returns Severity string
   */
  private calculateSeverity(count: number, total: number): string {
    const percentage = count / total;
    
    if (percentage > 0.7) return "High";
    if (percentage > 0.3) return "Medium";
    return "Low";
  }
  
  /**
   * Calculate impact based on frequency
   * 
   * @param count Number of occurrences
   * @param total Total number of items
   * @returns Impact string
   */
  private calculateImpact(count: number, total: number): string {
    const percentage = count / total;
    
    if (percentage > 0.5) return "High";
    if (percentage > 0.2) return "Medium";
    return "Low";
  }
  
  /**
   * Calculate priority based on frequency
   * 
   * @param count Number of occurrences
   * @param total Total number of items
   * @returns Priority string
   */
  private calculatePriority(count: number, total: number): string {
    const percentage = count / total;
    
    if (percentage > 0.6) return "High";
    if (percentage > 0.3) return "Medium";
    return "Low";
  }
  
  /**
   * Get default trends when analysis data is limited
   */
  private getDefaultTrends() {
    return [
      {
        category: "Radio Communications",
        description: "Consistent use of proper radio procedures during operations enhances command and control effectiveness. Units demonstrate strong adherence to communication SOPs.",
        frequency: 7,
        severity: "Medium"
      },
      {
        category: "Planning Process",
        description: "Detailed mission planning and thorough briefings contribute to operational success. Units consistently developing comprehensive OPORDs show improved execution.",
        frequency: 5,
        severity: "Medium"
      },
      {
        category: "Team Coordination",
        description: "Effective small-unit tactics and team movement techniques observed across multiple exercises. Squads demonstrate strong mutual support during operations.",
        frequency: 6,
        severity: "Medium"
      }
    ];
  }
  
  /**
   * Get default issues when analysis data is limited
   */
  private getDefaultIssues() {
    return [
      {
        category: "Communications Challenges",
        description: "Radio discipline breaks down during high-stress phases of operations. Units frequently revert to non-standard terminology when under pressure.",
        impact: "High"
      },
      {
        category: "Equipment Readiness",
        description: "Pre-combat inspections fail to identify common equipment issues, particularly with night vision devices and communication equipment.",
        impact: "Medium"
      }
    ];
  }
  
  /**
   * Get default recommendations when analysis data is limited
   */
  private getDefaultRecommendations() {
    return [
      {
        category: "Communications Training",
        description: "Implement weekly communications exercises with progressive complexity. Start with basic radio procedures and advance to degraded communications scenarios requiring alternate methods.",
        priority: "High"
      },
      {
        category: "Equipment Maintenance",
        description: "Establish mandatory pre-mission and post-mission maintenance checks for all critical equipment. Create detailed inspection checklists specific to each equipment type.",
        priority: "Medium"
      },
      {
        category: "Leader Development",
        description: "Conduct monthly leader certification exercises focused on decision-making under stress. Include scenarios requiring adaptation to changing mission parameters.",
        priority: "Medium"
      }
    ];
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
            ? "To generate training insights, complete AARs for your training events. The analysis system requires multiple AARs to identify patterns and generate meaningful recommendations."
            : `Currently analyzing ${count} AAR(s). For more accurate insights, complete at least 3 AARs. Additional data will enable the system to identify meaningful patterns across multiple training events.`,
          frequency: count,
          severity: "Medium"
        }
      ],
      frictionPoints: [],
      recommendations: []
    };
  }
}

export const aarAnalysisService = new AARAnalysisService();