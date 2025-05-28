// Script to generate 20 event records for A Co (unit_id 3) and its subunits
import { db } from "../server/db.js";
import { events } from "@shared/schema.js";

// Helper functions
const randomDate = (start, end) => {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
};

// Create events spanning the last 6 months to 3 months in the future
const startDate = new Date();
startDate.setMonth(startDate.getMonth() - 6);
const endDate = new Date();
endDate.setMonth(endDate.getMonth() + 3);

// Event themes and locations
const eventThemes = [
  {
    title: "Squad Combat Maneuvers",
    objectives:
      "Practice basic squad-level tactics and maneuvers in an urban environment",
  },
  {
    title: "Platoon Movement Tactics",
    objectives:
      "Improve platoon-level coordination and movement in various terrains",
  },
  {
    title: "Combat First Aid Training",
    objectives:
      "Develop proficiency in applying emergency medical care under combat conditions",
  },
  {
    title: "Communications Exercise",
    objectives:
      "Enhance unit communications procedures and equipment proficiency",
  },
  {
    title: "Land Navigation Course",
    objectives: "Master map reading and terrain navigation skills",
  },
  {
    title: "Company-Wide PT Assessment",
    objectives: "Assess and record physical fitness levels across all units",
  },
  {
    title: "Weapons Qualification",
    objectives: "Complete annual weapons qualification requirements",
  },
  {
    title: "CBRN Defense Training",
    objectives:
      "Practice response procedures for chemical, biological, radiological, and nuclear threats",
  },
  {
    title: "Leadership Development Workshop",
    objectives: "Develop leadership skills for junior NCOs and officers",
  },
  {
    title: "Convoy Operations",
    objectives: "Practice convoy security and movement techniques",
  },
];

const locations = [
  "Training Area Alpha",
  "East Range Complex",
  "Urban Warfare Training Center",
  "Company Assembly Area",
  "Battalion Headquarters",
  "West Field Training Ground",
  "Obstacle Course",
  "Firing Range Delta",
  "Tactical Operations Center",
  "South Mountain Training Area",
];

const resources = [
  "Standard field equipment, radios, maps",
  "Combat medical kits, stretchers, medical simulation equipment",
  "Unit weapons, ammunition (blank), tactical vests",
  "Compasses, maps, GPS devices, night vision equipment",
  "PT gear, stopwatches, measuring equipment",
  "Tactical vehicles, radios, convoy equipment",
  "CBRN protection equipment, simulators",
  "Classroom materials, projector, leadership manuals",
  "MREs, water, bivouac equipment",
  "Various training aids specific to exercise objectives",
];

// List of units (A Co and its subunits)
const unitIds = [3, 4, 5, 6, 7, 8, 9, 10, 11];

// Generate 20 events
const generateEvents = async () => {
  try {
    const eventsToCreate = [];

    for (let i = 0; i < 20; i++) {
      // Select random unit
      const unitId = unitIds[Math.floor(Math.random() * unitIds.length)];

      // Select random creator (based on unit leadership roles - simplified here)
      // For unit 3 (A Co), use user 2 (First Sergeant)
      // For unit 4 (1st Platoon), use user 4 (Platoon Sergeant)
      // For unit 5 (2nd Platoon), use user 6 (Platoon Sergeant)
      // For squad units, use their respective Squad Leaders
      let createdBy;
      if (unitId === 3) createdBy = 2; // A Co First Sergeant
      else if (unitId === 4) createdBy = 4; // 1st Platoon Sergeant
      else if (unitId === 5) createdBy = 6; // 2nd Platoon Sergeant
      else if (unitId === 6) createdBy = 7; // 1st Squad of 1st Platoon Leader
      else if (unitId === 7) createdBy = 16; // 2nd Squad of 1st Platoon Leader
      else if (unitId === 8) createdBy = 25; // 3rd Squad of 1st Platoon Leader
      else if (unitId === 9) createdBy = 34; // 1st Squad of 2nd Platoon Leader
      else if (unitId === 10) createdBy = 43; // 2nd Squad of 2nd Platoon Leader
      else if (unitId === 11) createdBy = 52; // 3rd Squad of 2nd Platoon Leader

      // Generate random participants (5-15 users, could be from different units in a real scenario)
      // For simplicity, we'll just use random user IDs from our existing users
      const participants = [];
      const participantCount = Math.floor(Math.random() * 10) + 5; // 5-15 participants

      // Generate unique participant IDs
      const potentialParticipants = Array.from({ length: 60 }, (_, i) => i + 1);
      for (let j = 0; j < participantCount; j++) {
        if (potentialParticipants.length > 0) {
          const randomIndex = Math.floor(
            Math.random() * potentialParticipants.length
          );
          participants.push(potentialParticipants.splice(randomIndex, 1)[0]);
        }
      }

      // Choose random properties for the event
      const themeIndex = Math.floor(Math.random() * eventThemes.length);
      const locationIndex = Math.floor(Math.random() * locations.length);
      const resourceIndex = Math.floor(Math.random() * resources.length);

      // Choose a random training step (1-8)
      const step = Math.floor(Math.random() * 8) + 1;

      // Create the event object
      const eventData = {
        title: eventThemes[themeIndex].title,
        unitId: unitId,
        createdBy: createdBy,
        step: step,
        date: randomDate(startDate, endDate),
        location: locations[locationIndex],
        objectives: eventThemes[themeIndex].objectives,
        resources: resources[resourceIndex],
        participants: JSON.stringify(participants),
        participatingUnits: JSON.stringify([unitId]),
        notifyParticipants: Math.random() < 0.3, // 30% chance of being true
      };

      eventsToCreate.push(eventData);
    }

    // Insert all events
    console.log(`Inserting ${eventsToCreate.length} events...`);
    for (const eventData of eventsToCreate) {
      console.log(
        `Creating event: ${eventData.title} for unit ${eventData.unitId}`
      );
      await db.insert(events).values(eventData);
    }

    console.log("Events created successfully!");
  } catch (error) {
    console.error("Error creating events:", error);
  } finally {
    process.exit(0);
  }
};

generateEvents();
