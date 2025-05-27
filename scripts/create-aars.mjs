// Script to create Company Live Fires event with AARs
import { db } from '../server/db.js';
import { events, aars, users, units } from '../shared/schema.js';
import { eq, inArray, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

async function createCompanyLiveFiresEvent() {
  try {
    console.log('Starting Company Live Fires event creation...');
    
    // Find all units
    const allUnits = await db.query.units.findMany();
    console.log(`Found ${allUnits.length} total units`);
    
    // Look for companies
    const companyUnits = allUnits.filter(unit => unit.unitLevel === 'Company');
    
    if (companyUnits.length === 0) {
      console.error('No company-level units found in the database');
      return;
    }
    
    console.log(`Found ${companyUnits.length} company-level units: ${companyUnits.map(u => u.name).join(', ')}`);
    
    // Target the first company unit found
    const targetCompany = companyUnits[0];
    console.log(`Selected company: ${targetCompany.name} (ID: ${targetCompany.id})`);
    
    // Find all subunits that belong to this company
    const companySubunits = allUnits.filter(unit => unit.parentId === targetCompany.id);
    console.log(`Found ${companySubunits.length} direct subunits for ${targetCompany.name}`);
    
    // Also find any squads or teams that belong to the platoons
    const deepSubunits = allUnits.filter(unit => {
      const parentUnit = allUnits.find(u => u.id === unit.parentId);
      return parentUnit && parentUnit.parentId === targetCompany.id;
    });
    
    console.log(`Found ${deepSubunits.length} additional subunits (squads/teams) for ${targetCompany.name}`);
    
    // Get all unit IDs including the company and all subunits
    const unitIds = [
      targetCompany.id, 
      ...companySubunits.map(u => u.id),
      ...deepSubunits.map(u => u.id)
    ];
    
    console.log('Unit IDs included in the event:', unitIds);
    
    // Get all users from these units
    const allUsers = await db.query.users.findMany();
    const companyUsers = allUsers.filter(user => unitIds.includes(user.unitId));
    
    console.log(`Found ${companyUsers.length} users in ${targetCompany.name} and its subunits`);
    
    if (companyUsers.length === 0) {
      console.error('No users found in the selected company and its subunits');
      return;
    }
    
    // Find a leader to be the event creator (First Sergeant or Commander)
    const eventCreator = companyUsers.find(u => u.role === 'FIRST_SERGEANT' || u.role === 'COMMANDER') || companyUsers[0];
    console.log(`Event creator will be: ${eventCreator.name} (${eventCreator.rank}, ${eventCreator.role})`);
    
    // Create the event for May 4, 2025
    const eventDate = new Date(2025, 4, 4); // May 4th, 2025
    
    const eventData = {
      title: "Company Live Fires",
      unitId: targetCompany.id,
      createdBy: eventCreator.id,
      step: 6, // AAR phase
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
    
    // Insert the event
    const insertResult = await db.insert(events).values(eventData).returning();
    
    if (!insertResult || insertResult.length === 0) {
      console.error('Failed to insert event into database');
      return;
    }
    
    const event = insertResult[0];
    console.log(`Successfully created event with ID: ${event.id}`);
    
    // Now create AARs for each user
    console.log('Creating AARs for all participating users...');
    
    for (const user of companyUsers) {
      // Generate AAR content based on user role and rank
      const aarItems = generateAARItems(user);
      
      const aarData = {
        eventId: event.id,
        unitId: user.unitId,
        createdBy: user.id,
        sustainItems: aarItems.sustain,
        improveItems: aarItems.improve,
        actionItems: aarItems.action
      };
      
      try {
        await db.insert(aars).values(aarData);
        console.log(`Created AAR for user: ${user.name} (ID: ${user.id})`);
      } catch (err) {
        console.error(`Failed to create AAR for user ${user.id}:`, err);
      }
    }
    
    console.log(`Company Live Fires event (ID: ${event.id}) has been created with AARs from ${companyUsers.length} users.`);
    return event;
    
  } catch (error) {
    console.error('Error creating Company Live Fires event:', error);
    throw error;
  }
}

// Helper function to generate realistic AAR items
function generateAARItems(user) {
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
  .then((event) => {
    if (event) {
      console.log(`Success! Created Company Live Fires event with ID ${event.id}`);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Script execution failed:', error);
    process.exit(1);
  });