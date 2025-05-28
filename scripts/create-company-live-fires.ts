import { db } from "../server/db";
import { events, aars, users, units } from "@shared/schema";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";

/**
 * Create a "Company Live Fires" event for A Company (unit ID 3) on May 4th, 2025
 * All members of A Co will participate and submit AARs
 */
async function createCompanyLiveFires() {
  try {
    console.log("Starting Company Live Fires event creation...");

    // Find A Company unit
    const aCompany = await db.query.units.findFirst({
      where: eq(units.name, "A Company"),
    });

    if (!aCompany) {
      console.error("A Company unit not found in database");
      return;
    }

    console.log(`Found A Company with ID: ${aCompany.id}`);

    // Find all subunits of A Company
    const subunits = await db.query.units.findMany({
      where: eq(units.parentId, aCompany.id),
    });

    console.log(`Found ${subunits.length} subunits of A Company`);

    // Get all users in A Company and its subunits
    const unitIds = [aCompany.id, ...subunits.map((unit) => unit.id)];
    const companyUsers = await db.query.users.findMany({
      where: (users) => {
        // Using OR logic to find users in any of the units
        const conditions = unitIds.map((unitId) => eq(users.unitId, unitId));
        return conditions.length === 1 ? conditions[0] : and(...conditions);
      },
    });

    console.log(
      `Found ${companyUsers.length} users in A Company and its subunits`
    );

    // Use the Company First Sergeant as event creator (like in create-events.js)
    const firstSgtId = 2; // A Co First Sergeant ID based on create-events.js

    // Set the event date to May 4th, 2025
    const eventDate = new Date(2025, 4, 4); // May 4th, 2025

    // Create the event
    const eventData = {
      title: "Company Live Fires",
      unitId: aCompany.id,
      createdBy: firstSgtId,
      step: 6, // AAR stage (step 6 as defined in TrainingSteps)
      date: eventDate,
      location: "Range Complex Bravo",
      objectives:
        "Conduct live-fire exercises at the company level to validate squad and platoon tactics under realistic conditions. Focus on fire and maneuver coordination between platoons.",
      resources:
        "Ammunition, tactical vests, radios, medical support, range safety personnel, target systems",
      eventType: "training",
      participants: JSON.stringify(companyUsers.map((user) => user.id)),
      participatingUnits: JSON.stringify(unitIds),
      notifyParticipants: true,
      isMultiDayEvent: false,
    };

    console.log("Creating Company Live Fires event...");
    const insertResult = await db.insert(events).values(eventData).returning();

    if (!insertResult || insertResult.length === 0) {
      console.error("Failed to create event");
      return;
    }

    const event = insertResult[0];
    console.log(`Created event with ID: ${event.id}`);

    // Create AARs for each user
    console.log("Creating AARs for users...");

    const aarPromises = companyUsers.map(async (user) => {
      // Generate AAR content
      const aarItems = generateAARItemsForUser(user, event.id);

      const aarData = {
        eventId: event.id,
        unitId: user.unitId,
        createdBy: user.id,
        sustainItems: aarItems.sustain,
        improveItems: aarItems.improve,
        actionItems: aarItems.action,
      };

      await db.insert(aars).values(aarData);
      console.log(`Created AAR for user ${user.name}`);
    });

    await Promise.all(aarPromises);

    console.log("Company Live Fires event and AARs created successfully!");
  } catch (error) {
    console.error("Error creating Company Live Fires event:", error);
  }
}

// Helper function to generate realistic AAR items for a user
function generateAARItemsForUser(user: any, eventId: number) {
  // Generate tailored AAR items based on user's role and rank
  const isLeader = [
    "COMMANDER",
    "XO",
    "FIRST_SERGEANT",
    "PLATOON_LEADER",
    "PLATOON_SERGEANT",
    "SQUAD_LEADER",
    "TEAM_LEADER",
  ].includes(user.role);

  // Sustain items tailored to role
  const sustainItems = [];
  if (isLeader) {
    sustainItems.push(
      generateAARItem(
        user,
        "Command and control procedures were effectively executed throughout the exercise. Radio discipline was maintained and unit leaders kept their teams informed of changing situations."
      )
    );
    sustainItems.push(
      generateAARItem(
        user,
        "The pre-fire rehearsals conducted at the platoon level significantly improved our coordination during the live-fire portion. This preparation eliminated confusion during critical movement phases."
      )
    );
  } else {
    sustainItems.push(
      generateAARItem(
        user,
        "Team cohesion was strong during the exercise. My fire team maintained proper spacing and kept visual contact throughout the movement to contact phase."
      )
    );
    sustainItems.push(
      generateAARItem(
        user,
        "Weapons handling and safety procedures were consistently followed by all participants. No safety violations were observed during the entire exercise."
      )
    );
  }
  sustainItems.push(
    generateAARItem(
      user,
      "Medical response time was excellent when simulated casualties were reported. The combat lifesavers quickly established collection points and performed proper triage procedures."
    )
  );

  // Improve items tailored to role
  const improveItems = [];
  if (isLeader) {
    improveItems.push(
      generateAARItem(
        user,
        "Communication between platoons during the transition between phases needed improvement. There were several instances where adjacent units were unaware of completed objectives and movement timelines."
      )
    );
    improveItems.push(
      generateAARItem(
        user,
        "The planning timeline was compressed which limited our ability to conduct thorough rehearsals with attached elements. More time should be allocated for coordination with supporting units."
      )
    );
  } else {
    improveItems.push(
      generateAARItem(
        user,
        "My team experienced equipment issues with the AN/PRC-148 radios during the exercise. Two radios failed during the most critical portion of the movement, forcing us to rely on hand signals."
      )
    );
    improveItems.push(
      generateAARItem(
        user,
        "Ammunition distribution was uneven across squads. My team had to redistribute ammunition during the exercise which caused unnecessary delays during our movement."
      )
    );
  }
  improveItems.push(
    generateAARItem(
      user,
      "Range visibility was severely limited during the early morning portion of the exercise due to fog. Consider scheduling future iterations later in the day to avoid these conditions."
    )
  );

  // Action items tailored to role
  const actionItems = [];
  if (isLeader) {
    actionItems.push(
      generateAARItem(
        user,
        "Develop a standardized platoon communication SOP that addresses contingency plans for radio failures and establishes clear reporting timelines between elements."
      )
    );
    actionItems.push(
      generateAARItem(
        user,
        "Schedule additional time for pre-exercise rehearsals with all participating and supporting elements to ensure coordination procedures are understood by everyone."
      )
    );
  } else {
    actionItems.push(
      generateAARItem(
        user,
        "Conduct a maintenance inspection of all AN/PRC-148 radios before the next field exercise. Submit equipment replacement requests for any radios showing signs of failure."
      )
    );
    actionItems.push(
      generateAARItem(
        user,
        "Create a detailed checklist for pre-combat inspections that specifically addresses ammunition distribution and equipment checks at the team level."
      )
    );
  }
  actionItems.push(
    generateAARItem(
      user,
      "Establish a dedicated weather assessment protocol to evaluate training conditions. Include contingency plans for reduced visibility scenarios in future exercise planning."
    )
  );

  return {
    sustain: JSON.stringify(sustainItems),
    improve: JSON.stringify(improveItems),
    action: JSON.stringify(actionItems),
  };
}

// Generate an AAR item with the proper structure
function generateAARItem(user: any, text: string) {
  return {
    id: nanoid(),
    text,
    authorId: user.id,
    authorRank: user.rank,
    unitId: user.unitId,
    unitLevel: "Company", // Simplified for this script
    createdAt: new Date().toISOString(),
    tags: [],
  };
}

// Run the script
createCompanyLiveFires()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
