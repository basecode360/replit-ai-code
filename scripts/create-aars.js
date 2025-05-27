// Script to generate realistic Company Live Fires event data with detailed AARs
// This script generates a JSON payload that can be sent via the API

import axios from 'axios';
import fs from 'fs';

// Date for the exercise: May 4th, 2025
const eventDate = new Date(2025, 4, 4);

// Helper function to format date
function formatDate(date) {
  return date.toISOString();
}

// Set up an axios instance that will handle cookies
const api = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// First, we need to login to get authentication
async function login() {
  try {
    const loginResponse = await api.post('/api/auth/login', {
      username: 'admin',
      password: 'password'
    });
    
    console.log('Login successful!');
    return loginResponse.data;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

// Get all units to find a company
async function getUnits() {
  try {
    const response = await api.get('/api/hierarchy/accessible-units');
    console.log(`Found ${response.data.length} units in the system`);
    return response.data;
  } catch (error) {
    console.error('Failed to get units:', error.response?.data || error.message);
    throw error;
  }
}

// Get users to find company members
async function getUsers() {
  try {
    const response = await api.get('/api/hierarchy/accessible-users');
    console.log(`Found ${response.data.length} users in the system`);
    return response.data;
  } catch (error) {
    console.error('Failed to get users:', error.response?.data || error.message);
    throw error;
  }
}

// Create the event
async function createEvent(companyUnit, participants, participatingUnits) {
  try {
    // Find a leader to be the event creator (First Sergeant or Commander)
    const eventCreator = participants.find(u => 
      u.role === 'FIRST_SERGEANT' || u.role === 'COMMANDER'
    ) || participants[0];
    
    console.log(`Event creator will be: ${eventCreator.name} (${eventCreator.rank}, ${eventCreator.role})`);
    
    const eventData = {
      title: "Company Live Fires",
      unitId: companyUnit.id,
      createdBy: eventCreator.id,
      step: 6, // AAR phase
      date: formatDate(eventDate),
      location: "Range Complex Bravo",
      objectives: "Conduct live-fire exercises at the company level to validate squad and platoon tactics under realistic conditions. Focus on fire and maneuver coordination between platoons.",
      resources: "Ammunition, tactical vests, radios, medical support, range safety personnel, target systems",
      eventType: "training",
      participants: JSON.stringify(participants.map(user => user.id)),
      participatingUnits: JSON.stringify(participatingUnits.map(unit => unit.id)),
      notifyParticipants: true,
      isMultiDayEvent: false
    };
    
    console.log('Creating event with data:', JSON.stringify(eventData, null, 2));
    
    const response = await api.post('/api/events', eventData);
    console.log(`Event created with ID: ${response.data.id}`);
    return response.data;
  } catch (error) {
    console.error('Failed to create event:', error.response?.data || error.message);
    throw error;
  }
}

// Helper function to generate a unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Create an AAR for a user
async function createAAR(event, user) {
  try {
    // Generate AAR items based on user role
    const aarItems = generateAARItems(user);
    
    const aarData = {
      eventId: event.id,
      unitId: user.unitId,
      createdBy: user.id,
      sustainItems: aarItems.sustain,
      improveItems: aarItems.improve,
      actionItems: aarItems.action
    };
    
    const response = await api.post('/api/aars', aarData);
    console.log(`Created AAR for user ${user.name} (ID: ${user.id})`);
    return response.data;
  } catch (error) {
    console.error(`Failed to create AAR for user ${user.name}:`, error.response?.data || error.message);
    return null;
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
    id: generateId(),
    text,
    authorId: user.id,
    authorRank: user.rank,
    unitId: user.unitId,
    unitLevel: user.unitLevel || 'Unknown',
    createdAt: new Date().toISOString(),
    tags: []
  };
}

// Main function to run the script
async function main() {
  try {
    // Login first
    await login();
    
    // Get all units
    const units = await getUnits();
    
    // Find a company-level unit
    const companyUnits = units.filter(unit => unit.unitLevel === 'Company');
    
    if (companyUnits.length === 0) {
      console.error('No company-level units found');
      return;
    }
    
    const targetCompany = companyUnits[0];
    console.log(`Selected company: ${targetCompany.name} (ID: ${targetCompany.id})`);
    
    // Find all subunits - direct children of the company
    const directSubunits = units.filter(unit => unit.parentId === targetCompany.id);
    console.log(`Found ${directSubunits.length} direct subunits of ${targetCompany.name}`);
    
    // Find all subunits of subunits (nested)
    const nestedSubunits = [];
    for (const subunit of directSubunits) {
      const nestedUnits = units.filter(unit => unit.parentId === subunit.id);
      nestedSubunits.push(...nestedUnits);
    }
    
    console.log(`Found ${nestedSubunits.length} nested subunits of ${targetCompany.name}`);
    
    // Combine all units
    const allUnitIds = [targetCompany.id, ...directSubunits.map(u => u.id), ...nestedSubunits.map(u => u.id)];
    const allUnits = [targetCompany, ...directSubunits, ...nestedSubunits];
    
    // Get all users
    const users = await getUsers();
    
    // Find users in the company and its subunits
    const companyUsers = users.filter(user => allUnitIds.includes(user.unitId));
    console.log(`Found ${companyUsers.length} users in ${targetCompany.name} and its subunits`);
    
    if (companyUsers.length === 0) {
      console.error('No users found in the selected company');
      return;
    }
    
    // Create the event
    const event = await createEvent(targetCompany, companyUsers, allUnits);
    
    // Create AARs for each user
    const aarPromises = companyUsers.map(user => createAAR(event, user));
    await Promise.all(aarPromises);
    
    console.log(`Successfully created Company Live Fires event (ID: ${event.id}) with AARs from ${companyUsers.length} users`);
    
  } catch (error) {
    console.error('Script failed:', error);
  }
}

// Run the script
main();