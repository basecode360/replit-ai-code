// Script to generate AAR records for existing events
import { v4 as uuidv4 } from "uuid";
import { db } from "../server/db";
import { aars, events, users } from "@shared/schema";
import { and, eq, gte } from "drizzle-orm";

// Type for AAR items
interface AARItem {
  id: string;
  text: string;
  authorId: number;
  authorRank: string;
  unitId: number;
  unitLevel: string;
  createdAt: string;
  tags: string[];
}

// Dictionary of unit levels based on unit IDs
const unitLevels: Record<number, string> = {
  3: "Company", // A co
  4: "Platoon", // 1st Platoon
  5: "Platoon", // 2nd Platoon
  6: "Squad", // 1st Squad in 1st Platoon
  7: "Squad", // 2nd Squad in 1st Platoon
  8: "Squad", // 3rd Squad in 1st Platoon
  9: "Squad", // 1st Squad in 2nd Platoon
  10: "Squad", // 2nd Squad in 2nd Platoon
  11: "Squad", // 3rd Squad in 2nd Platoon
};

// Content categories for different event types
const contentByEventType: Record<
  string,
  { sustain: string[]; improve: string[]; action: string[] }
> = {
  combat: {
    sustain: [
      "Clear communication throughout the exercise",
      "Effective use of cover and concealment",
      "Quick reaction to contact drills",
      "Weapons handling and muzzle awareness",
      "Tactical movement formations maintained well",
      "Proper sector scanning and security",
      "Effective leadership during high-stress moments",
      "Team coordination during movement",
    ],
    improve: [
      "Radio communication protocols need more practice",
      "Ammunition conservation during extended engagements",
      "Speed of battlefield casualty assessment",
      "Maintaining situational awareness during complex tasks",
      "Coordination between fire teams",
      "Hand signal usage when noise discipline is required",
      "Decision making under pressure",
      "Reporting formats and accuracy",
    ],
    action: [
      "Schedule additional radio protocol training",
      "Implement weekly movement drills focusing on coordination",
      "Create more realistic scenarios for training",
      "Add stress inoculation elements to future exercises",
      "Develop checklist for pre-movement briefings",
      "Create SOP for casualty collection points",
      "Brief all team leaders on improved communication standards",
      "Conduct after-action review immediately following exercises",
    ],
  },
  medical: {
    sustain: [
      "Proper application of tourniquets under stress",
      "Effective triage of multiple casualties",
      "Clear communication of casualty status",
      "Proper documentation of treatments provided",
      "Medical equipment organization and accessibility",
      "Cross-training of non-medical personnel",
      "Implementation of tactical combat casualty care principles",
      "Coordination with evacuation assets",
    ],
    improve: [
      "Speed of assessment in low-light conditions",
      "Casualty movement techniques over rough terrain",
      "Communication between treatment teams",
      "Management of multiple casualties simultaneously",
      "Proper evacuation prioritization",
      "Conservation of medical supplies",
      "Integration of casualty collection points with operations",
      "Handoff procedures to higher echelon care",
    ],
    action: [
      "Schedule night medical training exercise",
      "Conduct casualty movement course focusing on difficult terrain",
      "Develop improved triage tags and tracking system",
      "Create medical supply inventory and resupply protocol",
      "Practice mass casualty scenarios monthly",
      "Improve documentation training for all medics",
      "Establish clear MEDEVAC request procedures",
      "Acquire additional training aids for realistic scenarios",
    ],
  },
  leadership: {
    sustain: [
      "Clear mission briefings with defined objectives",
      "Regular updates to subordinate leaders",
      "Empowerment of junior leaders to make decisions",
      "Recognition of achievements and constructive feedback",
      "Integration of multiple elements into cohesive plan",
      "Proper use of the troop leading procedures",
      "Effective time management during planning phase",
      "Problem-solving during unexpected challenges",
    ],
    improve: [
      "Delegation of appropriate tasks to subordinates",
      "Contingency planning for primary plan failure",
      "Information flow between leadership levels",
      "Decision making process transparency",
      "Integration of lessons learned from previous operations",
      "Balance between micromanagement and oversight",
      "Mentorship of junior leaders during operations",
      "Recognition of early warning signs of plan failure",
    ],
    action: [
      "Implement regular leadership development sessions",
      "Create standard briefing format for all operations",
      "Establish mentorship program pairing senior and junior leaders",
      "Practice decision making games and tactical decision exercises",
      "Develop leadership reaction course for monthly training",
      "Create assessment criteria for leadership effectiveness",
      "Schedule regular sensing sessions with subordinates",
      "Improve after action review process for leadership lessons",
    ],
  },
  communications: {
    sustain: [
      "Proper radio checks before operations",
      "Use of correct prowords and brevity codes",
      "Alternative communication plans in place",
      "Equipment maintenance and battery management",
      "Signal operating instructions properly followed",
      "Message priority system properly implemented",
      "Regular updates at designated times",
      "Proper setup of communication networks",
    ],
    improve: [
      "Radio discipline during high-tempo operations",
      "Contingency communication methods when primary fails",
      "Clarity of transmitted information",
      "Knowledge of communication equipment capabilities",
      "Troubleshooting skills for communication issues",
      "Brevity in radio transmissions",
      "Integration of digital and voice communications",
      "Communication security procedures",
    ],
    action: [
      "Conduct monthly communication equipment training",
      "Develop communication contingency cards for all operators",
      "Practice operations with degraded communications",
      "Establish clear communication architecture for operations",
      "Train all personnel on basic troubleshooting",
      "Create reference cards for common communication procedures",
      "Implement communication security exercise monthly",
      "Evaluate and update signal operating instructions",
    ],
  },
  pt: {
    sustain: [
      "Proper form during exercise execution",
      "Progressive workout intensity appropriate for all levels",
      "Recovery techniques incorporated effectively",
      "Team motivation and encouragement",
      "Variety in exercise selection",
      "Clear demonstration of exercises before execution",
      "Proper warmup and cooldown periods",
      "Tracking of performance metrics",
    ],
    improve: [
      "Individual fitness plans for different fitness levels",
      "Injury prevention awareness and techniques",
      "Nutrition guidance to complement physical training",
      "Integration of functional fitness for operational tasks",
      "Recovery protocols between high-intensity sessions",
      "Balance between strength, endurance, and mobility",
      "Environmental considerations for outdoor training",
      "Monitoring for signs of overtraining",
    ],
    action: [
      "Develop platoon fitness standard operating procedure",
      "Create progressive training plans for different fitness levels",
      "Schedule monthly fitness assessments with metrics",
      "Implement injury prevention briefing before PT sessions",
      "Purchase additional fitness equipment for varied workouts",
      "Train squad leaders on proper exercise technique",
      "Develop nutrition guide for optimal performance",
      "Establish recovery protocols for high-intensity training days",
    ],
  },
  default: {
    sustain: [
      "Clear communication of mission objectives",
      "Team coordination and collaboration",
      "Adherence to standard operating procedures",
      "Equipment readiness and preparation",
      "Adaptability to changing conditions",
      "Effective use of available resources",
      "Support between team members",
      "Focus on mission priorities",
    ],
    improve: [
      "Pre-mission planning and briefings",
      "Information sharing between elements",
      "Time management during operations",
      "Contingency planning for unexpected situations",
      "Resource allocation efficiency",
      "Task prioritization during complex operations",
      "After-action documentation process",
      "Integration of lessons learned from previous operations",
    ],
    action: [
      "Update standard operating procedures based on lessons learned",
      "Conduct additional training on identified weak areas",
      "Implement improved briefing format for future operations",
      "Develop checklist for pre-operation preparations",
      "Schedule regular team-building activities",
      "Create better documentation process for lessons learned",
      "Establish clear roles and responsibilities for future operations",
      "Review and update equipment maintenance procedures",
    ],
  },
};

// Event type keywords mapping
const eventKeywords: Record<string, string[]> = {
  combat: [
    "combat",
    "maneuver",
    "tactical",
    "fire",
    "weapon",
    "attack",
    "defend",
  ],
  medical: ["medical", "first aid", "casualty", "treatment", "health"],
  leadership: ["leader", "command", "development", "workshop", "management"],
  communications: [
    "communication",
    "radio",
    "signal",
    "message",
    "transmission",
  ],
  pt: ["pt", "physical", "fitness", "exercise", "strength", "conditioning"],
};

// Helper function to get random elements from an array
function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Generate AAR content based on event type and user
function generateAARContent(event: any, user: any) {
  // Determine event type based on keywords in title and objectives
  let eventType = "default";
  const eventText = (event.title + " " + event.objectives).toLowerCase();

  for (const [type, keywords] of Object.entries(eventKeywords)) {
    if (keywords.some((keyword) => eventText.includes(keyword))) {
      eventType = type;
      break;
    }
  }

  // Create 2-4 items for each category
  const numSustain = Math.floor(Math.random() * 3) + 2; // 2-4 items
  const numImprove = Math.floor(Math.random() * 3) + 2; // 2-4 items
  const numAction = Math.floor(Math.random() * 3) + 2; // 2-4 items

  // Get content for the determined event type
  const contentList = contentByEventType[eventType];

  // Helper function to create AAR items
  const createAARItems = (
    items: string[],
    count: number,
    user: any
  ): AARItem[] => {
    const selectedItems = getRandomElements(items, count);
    return selectedItems.map((text) => ({
      id: uuidv4(),
      text,
      authorId: user.id,
      authorRank: user.rank,
      unitId: user.unitId,
      unitLevel: unitLevels[user.unitId] || "Unknown",
      createdAt: new Date().toISOString(),
      tags: [],
    }));
  };

  // Create the AAR items
  return {
    sustainItems: createAARItems(contentList.sustain, numSustain, user),
    improveItems: createAARItems(contentList.improve, numImprove, user),
    actionItems: createAARItems(contentList.action, numAction, user),
  };
}

// Main function to create AARs
async function createAARs() {
  try {
    // Get all events that are in step 5 (Execution) or higher - these can have AARs
    const allEvents = await db
      .select()
      .from(events)
      .where(and(gte(events.step, 5), eq(events.isDeleted, false)));

    console.log(`Found ${allEvents.length} events eligible for AARs`);

    // Get all users for reference
    const allUsers = await db
      .select()
      .from(users)
      .where(eq(users.isDeleted, false));

    // Counter for created AARs
    let aarCount = 0;

    // Process each event
    for (const event of allEvents) {
      // Parse the participants array
      const participants = Array.isArray(event.participants)
        ? event.participants
        : typeof event.participants === "string"
        ? JSON.parse(event.participants)
        : [];

      console.log(
        `Event ${event.id}: "${event.title}" has ${participants.length} participants`
      );

      // Select 2-4 random participants to create AARs for each event
      const numAARs = Math.min(
        Math.floor(Math.random() * 3) + 2,
        participants.length
      );
      const aarCreators = getRandomElements(participants, numAARs);

      // Create AAR for each selected participant
      for (const creatorId of aarCreators) {
        // Find user data
        const creator = allUsers.find((u) => u.id === creatorId);
        if (!creator) {
          console.log(`User with ID ${creatorId} not found, skipping`);
          continue;
        }

        // Generate AAR content based on event type and user role
        const aarContent = generateAARContent(event, creator);

        // Insert the AAR record
        try {
          await db.insert(aars).values({
            eventId: event.id,
            unitId: creator.unitId,
            createdBy: creator.id,
            sustainItems: aarContent.sustainItems,
            improveItems: aarContent.improveItems,
            actionItems: aarContent.actionItems,
            createdAt: new Date(),
            updatedAt: new Date(),
            isDeleted: false,
          });

          aarCount++;
          console.log(
            `Created AAR for event "${event.title}" by ${creator.name}`
          );
        } catch (insertError) {
          console.error("Error inserting AAR:", insertError);
        }
      }
    }

    console.log(`Successfully created ${aarCount} AAR records`);
  } catch (error) {
    console.error("Error creating AARs:", error);
  }
}

// Run the script
createAARs()
  .then(() => {
    console.log("AAR generation complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error in AAR generation script:", err);
    process.exit(1);
  });
