// Script to create a Company Live Fires event on May 4th, 2025
// This script uses the internal DB connection to add the event and associated AARs
import { db } from '../server/db.js';
import { events, aars, users, units } from '../shared/schema.js';
import { eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';

async function createCompanyLiveFiresEvent() {
  try {
    console.log('Starting Company Live Fires event creation...');
    
    // Find Test Battalion unit (known to exist with ID 1)
    const battalionUnit = await db.query.units.findFirst({
      where: eq(units.id, 1)
    });
    
    if (!battalionUnit) {
      throw new Error('Could not find Battalion unit in the database');
    }
    
    console.log('Found Battalion unit:', battalionUnit.name);
    
    // Look up all Company-level units
    const companyUnits = await db.query.units.findMany({
      where: eq(units.unitLevel, 'Company')
    });
    
    console.log(`Found ${companyUnits.length} company-level units`);
    
    if (companyUnits.length === 0) {
      throw new Error('No company-level units found in the database');
    }
    
    // Target the first company unit found
    const targetCompany = companyUnits[0];
    console.log(`Selected company: ${targetCompany.name} (ID: ${targetCompany.id})`);
    
    // Find all subunits (platoons, squads, etc.)
    const allSubunits = await db.query.units.findMany({});
    const companySubunits = allSubunits.filter(unit => {
      // Check if this unit's parent chain leads to our target company
      let currentUnit = unit;
      let visitedIds = new Set();
      
      while (currentUnit && currentUnit.parentId && !visitedIds.has(currentUnit.id)) {
        visitedIds.add(currentUnit.id);
        if (currentUnit.parentId === targetCompany.id) {
          return true;
        }
        // Find the parent unit
        currentUnit = allSubunits.find(u => u.id === currentUnit.parentId);
      }
      
      return false;
    });
    
    console.log(`Found ${companySubunits.length} subunits for ${targetCompany.name}`);
    
    // Get all unit IDs including the company and all subunits
    const unitIds = [targetCompany.id, ...companySubunits.map(u => u.id)];
    console.log('Unit IDs included in the event:', unitIds);
    
    // Get all users from these units
    const companyUsers = await db.query.users.findMany({
      where: inArray(users.unitId, unitIds)
    });
    
    console.log(`Found ${companyUsers.length} users in ${targetCompany.name} and its subunits`);
    
    // Create the event for May 4, 2025
    const eventDate = new Date(2025, 4, 4); // May 4th, 2025
    
    const eventData = {
      title: "Company Live Fires",
      unitId: targetCompany.id,
      createdBy: companyUsers.find(u => u.role === 'FIRST_SERGEANT' || u.role === 'COMMANDER')?.id || companyUsers[0].id,
      step: 6, // AAR step
      date: eventDate,
      location: "Range Complex Bravo",
      objectives: "Conduct live-fire exercises at the company level to validate squad and platoon tactics under realistic conditions. Focus on fire and maneuver coordination between platoons.",
      resources: "Ammunition, tactical vests, radios, medical support, range safety personnel, target systems",
      eventType: "training",
      participants: JSON.stringify(companyUsers.map(user => user.id)),
      participatingUnits: JSON.stringify(unitIds),
      notifyParticipants: true,
      isMultiDayEvent: false
    };
    
    console.log('Creating Company Live Fires event with the following data:');
    console.log(JSON.stringify(eventData, null, 2));
    
    // Insert the event
    const insertResult = await db.insert(events).values(eventData).returning();
    
    if (!insertResult || insertResult.length === 0) {
      throw new Error('Failed to insert event into database');
    }
    
    const event = insertResult[0];
    console.log(`Successfully created event with ID: ${event.id}`);
    
    // Now create AARs for each user
    console.log('Creating AARs for all participating users...');
    
    for (const user of companyUsers) {
      // Generate AAR content based on user role and rank
      const aarItems = generateAARItems(user, targetCompany);
      
      const aarData = {
        eventId: event.id,
        unitId: user.unitId,
        createdBy: user.id,
        sustainItems: aarItems.sustain,
        improveItems: aarItems.improve,
        actionItems: aarItems.action
      };
      
      await db.insert(aars).values(aarData);
      console.log(`Created AAR for user: ${user.name} (ID: ${user.id})`);
    }
    
    console.log('All AARs created successfully!');
    console.log(`Company Live Fires event (ID: ${event.id}) has been created with ${companyUsers.length} AARs.`);
    
  } catch (error) {
    console.error('Error creating Company Live Fires event:', error);
  }
}

// Helper function to generate realistic AAR items
function generateAARItems(user, company) {
  // Determine if user is in a leadership role
  const isLeader = ['COMMANDER', 'XO', 'FIRST_SERGEANT', 'PLATOON_SERGEANT', 'PLATOON_LEADER', 'SQUAD_LEADER', 'TEAM_LEADER'].includes(user.role);
  
  // Generate sustain items
  const sustainItems = [];
  if (isLeader) {
    sustainItems.push(createAARItem(user, "Command and control procedures were effectively executed throughout the exercise. Radio discipline was maintained and unit leaders kept their teams informed of changing situations."));
    sustainItems.push(createAARItem(user, "The pre-fire rehearsals conducted at the platoon level significantly improved our coordination during the live-fire portion. This preparation eliminated confusion during critical movement phases."));
  } else {
    sustainItems.push(createAARItem(user, "Team cohesion was strong during the exercise. My fire team maintained proper spacing and kept visual contact throughout the movement to contact phase."));
    sustainItems.push(createAARItem(user, "Weapons handling and safety procedures were consistently followed by all participants. No safety violations were observed during the entire exercise."));
  }
  sustainItems.push(createAARItem(user, "Medical response time was excellent when simulated casualties were reported. The combat lifesavers quickly established collection points and performed proper triage procedures."));
  
  // Generate improve items
  const improveItems = [];
  if (isLeader) {
    improveItems.push(createAARItem(user, "Communication between platoons during the transition between phases needed improvement. There were several instances where adjacent units were unaware of completed objectives and movement timelines."));
    improveItems.push(createAARItem(user, "The planning timeline was compressed which limited our ability to conduct thorough rehearsals with attached elements. More time should be allocated for coordination with supporting units."));
  } else {
    improveItems.push(createAARItem(user, "My team experienced equipment issues with the AN/PRC-148 radios during the exercise. Two radios failed during the most critical portion of the movement, forcing us to rely on hand signals."));
    improveItems.push(createAARItem(user, "Ammunition distribution was uneven across squads. My team had to redistribute ammunition during the exercise which caused unnecessary delays during our movement."));
  }
  improveItems.push(createAARItem(user, "Range visibility was severely limited during the early morning portion of the exercise due to fog. Consider scheduling future iterations later in the day to avoid these conditions."));
  
  // Generate action items
  const actionItems = [];
  if (isLeader) {
    actionItems.push(createAARItem(user, "Develop a standardized platoon communication SOP that addresses contingency plans for radio failures and establishes clear reporting timelines between elements."));
    actionItems.push(createAARItem(user, "Schedule additional time for pre-exercise rehearsals with all participating and supporting elements to ensure coordination procedures are understood by everyone."));
  } else {
    actionItems.push(createAARItem(user, "Conduct a maintenance inspection of all AN/PRC-148 radios before the next field exercise. Submit equipment replacement requests for any radios showing signs of failure."));
    actionItems.push(createAARItem(user, "Create a detailed checklist for pre-combat inspections that specifically addresses ammunition distribution and equipment checks at the team level."));
  }
  actionItems.push(createAARItem(user, "Establish a dedicated weather assessment protocol to evaluate training conditions. Include contingency plans for reduced visibility scenarios in future exercise planning."));
  
  return {
    sustain: JSON.stringify(sustainItems),
    improve: JSON.stringify(improveItems),
    action: JSON.stringify(actionItems)
  };
}

// Helper function to create an AAR item
function createAARItem(user, text) {
  return {
    id: nanoid(),
    text,
    authorId: user.id,
    authorRank: user.rank,
    unitId: user.unitId,
    unitLevel: user.unitLevel || 'Unknown',
    createdAt: new Date().toISOString(),
    tags: []
  };
}

// Run the script
createCompanyLiveFiresEvent()
  .then(() => {
    console.log('Script execution complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script execution failed:', error);
    process.exit(1);
  });