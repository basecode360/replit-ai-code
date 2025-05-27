import { User as SelectUser, InsertUser, Unit, InsertUnit, Event, InsertEvent, AAR, InsertAAR, AuditLog, InsertAuditLog, Notification, InsertNotification, UserUnitAssignment, InsertUserUnitAssignment } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, isNull, lt, gt, desc } from "drizzle-orm";
import { users, units, events, aars, auditLogs, notifications, userUnitAssignments } from "@shared/schema";
import { VeniceAnalysis } from "@shared/schema";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<SelectUser | undefined>;
  getUserByUsername(username: string): Promise<SelectUser | undefined>;
  createUser(user: InsertUser): Promise<SelectUser>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<SelectUser | undefined>;
  softDeleteUser(id: number): Promise<boolean>;
  restoreUser(id: number): Promise<boolean>;
  getUsersByUnit(unitId: number): Promise<SelectUser[]>;
  getAllUsers(): Promise<SelectUser[]>;
  
  // Unit operations
  getUnit(id: number): Promise<Unit | undefined>;
  getUnitByReferralCode(code: string): Promise<Unit | undefined>;
  createUnit(unit: InsertUnit): Promise<Unit>;
  updateUnit(id: number, updates: Partial<InsertUnit>): Promise<Unit | undefined>;
  softDeleteUnit(id: number): Promise<boolean>;
  restoreUnit(id: number): Promise<boolean>;
  getSubunits(parentId: number): Promise<Unit[]>;
  getAllUnits(): Promise<Unit[]>;
  
  // User-Unit Assignment operations
  getUserUnitAssignments(userId: number): Promise<UserUnitAssignment[]>;
  getUserPrimaryUnit(userId: number): Promise<Unit | undefined>;
  getUsersByUnitRole(unitId: number, leadershipRole?: string): Promise<SelectUser[]>;
  getUnitLeaders(unitId: number): Promise<SelectUser[]>;
  assignUserToUnit(assignment: InsertUserUnitAssignment): Promise<UserUnitAssignment>;
  updateUserUnitAssignment(id: number, updates: Partial<InsertUserUnitAssignment>): Promise<UserUnitAssignment | undefined>;
  removeUserFromUnit(userId: number, unitId: number): Promise<boolean>;
  
  // Event operations
  getEvent(id: number): Promise<Event | undefined>;
  getEventsByUnit(unitId: number): Promise<Event[]>;
  getEventsByUserParticipation(userId: number): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event | undefined>;
  softDeleteEvent(id: number): Promise<boolean>;
  restoreEvent(id: number): Promise<boolean>;
  addParticipantsToEvent(eventId: number, userIds: number[]): Promise<Event | undefined>;
  addUnitToEvent(eventId: number, unitId: number): Promise<Event | undefined>;
  getEventParticipants(eventId: number): Promise<SelectUser[]>;
  getPendingAAREvents(userId: number): Promise<Event[]>;
  
  // AAR operations
  getAAR(id: number): Promise<AAR | undefined>;
  getAARsByEvent(eventId: number): Promise<AAR[]>;
  getAARsByUnit(unitId: number): Promise<AAR[]>;
  getAARsByUser(userId: number): Promise<AAR[]>;
  createAAR(aar: InsertAAR): Promise<AAR>;
  updateAAR(id: number, updates: Partial<InsertAAR>): Promise<AAR | undefined>;
  softDeleteAAR(id: number): Promise<boolean>;
  restoreAAR(id: number): Promise<boolean>;
  
  // Audit log operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(userId?: number, startDate?: Date, endDate?: Date): Promise<AuditLog[]>;
  
  // Venice AI operations
  generateVeniceAnalysis(unitId: number): Promise<VeniceAnalysis>;
  generateVenicePromptAnalysis(unitId: number, prompt: string): Promise<VeniceAnalysis>;
  
  // Notification operations
  getNotificationsForUser(userId: number): Promise<Notification[]>;
  markNotificationAsRead(notificationId: number): Promise<boolean>;
  createNotification(notification: InsertNotification): Promise<Notification>;

  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool,
      createTableIfMissing: true 
    });
    
    // Initialize sample data if needed
    try {
      this.initSampleData();
    } catch (err) {
      console.log("Note: Sample data initialization skipped or already exists");
    }
  }
  
  // User-Unit Assignment operations
  async getUserUnitAssignments(userId: number): Promise<UserUnitAssignment[]> {
    try {
      // Get all active assignments for the user
      const assignments = await db
        .select()
        .from(userUnitAssignments)
        .where(
          and(
            eq(userUnitAssignments.userId, userId),
            eq(userUnitAssignments.isDeleted, false),
            or(
              isNull(userUnitAssignments.endDate),
              gt(userUnitAssignments.endDate, new Date())
            )
          )
        );
      
      return assignments;
    } catch (error) {
      console.error("Error getting user unit assignments:", error);
      return [];
    }
  }
  
  async getUserPrimaryUnit(userId: number): Promise<Unit | undefined> {
    try {
      // Find the user's primary unit assignment
      const [primaryAssignment] = await db
        .select()
        .from(userUnitAssignments)
        .where(
          and(
            eq(userUnitAssignments.userId, userId),
            eq(userUnitAssignments.assignmentType, "PRIMARY"),
            eq(userUnitAssignments.isDeleted, false),
            or(
              isNull(userUnitAssignments.endDate),
              gt(userUnitAssignments.endDate, new Date())
            )
          )
        );
      
      if (!primaryAssignment) {
        // Fallback to user's unitId field
        const user = await this.getUser(userId);
        if (user && user.unitId) {
          return this.getUnit(user.unitId);
        }
        return undefined;
      }
      
      // Get the unit details
      return this.getUnit(primaryAssignment.unitId);
    } catch (error) {
      console.error("Error getting user primary unit:", error);
      return undefined;
    }
  }
  
  async getUsersByUnitRole(unitId: number, leadershipRole?: string): Promise<SelectUser[]> {
    try {
      const query = db
        .select({
          user: users
        })
        .from(userUnitAssignments)
        .innerJoin(users, eq(userUnitAssignments.userId, users.id))
        .where(
          and(
            eq(userUnitAssignments.unitId, unitId),
            eq(userUnitAssignments.isDeleted, false),
            or(
              isNull(userUnitAssignments.endDate),
              gt(userUnitAssignments.endDate, new Date())
            )
          )
        );
      
      // Filter by leadership role if provided
      if (leadershipRole) {
        query.where(eq(userUnitAssignments.leadershipRole, leadershipRole));
      }
      
      const results = await query;
      return results.map(r => r.user);
    } catch (error) {
      console.error("Error getting users by unit role:", error);
      return [];
    }
  }
  
  async getUnitLeaders(unitId: number): Promise<SelectUser[]> {
    try {
      const results = await db
        .select({
          user: users
        })
        .from(userUnitAssignments)
        .innerJoin(users, eq(userUnitAssignments.userId, users.id))
        .where(
          and(
            eq(userUnitAssignments.unitId, unitId),
            eq(userUnitAssignments.isDeleted, false),
            or(
              isNull(userUnitAssignments.endDate),
              gt(userUnitAssignments.endDate, new Date())
            )
          )
        )
        .where(
          // Only get assignments with a leadership role (not null)
          isNull(userUnitAssignments.leadershipRole).not()
        );
      
      return results.map(r => r.user);
    } catch (error) {
      console.error("Error getting unit leaders:", error);
      return [];
    }
  }
  
  async assignUserToUnit(assignment: InsertUserUnitAssignment): Promise<UserUnitAssignment> {
    try {
      const [newAssignment] = await db
        .insert(userUnitAssignments)
        .values(assignment)
        .returning();
      
      return newAssignment;
    } catch (error) {
      console.error("Error assigning user to unit:", error);
      throw error;
    }
  }
  
  async updateUserUnitAssignment(id: number, updates: Partial<InsertUserUnitAssignment>): Promise<UserUnitAssignment | undefined> {
    try {
      const [updatedAssignment] = await db
        .update(userUnitAssignments)
        .set({ 
          ...updates, 
          updatedAt: new Date() 
        })
        .where(eq(userUnitAssignments.id, id))
        .returning();
      
      return updatedAssignment;
    } catch (error) {
      console.error("Error updating user unit assignment:", error);
      return undefined;
    }
  }
  
  async removeUserFromUnit(userId: number, unitId: number): Promise<boolean> {
    try {
      // Soft delete by setting isDeleted flag and endDate
      const [result] = await db
        .update(userUnitAssignments)
        .set({ 
          isDeleted: true, 
          deletedAt: new Date(),
          endDate: new Date(),
          updatedAt: new Date() 
        })
        .where(
          and(
            eq(userUnitAssignments.userId, userId),
            eq(userUnitAssignments.unitId, unitId),
            eq(userUnitAssignments.isDeleted, false)
          )
        )
        .returning();
      
      return !!result;
    } catch (error) {
      console.error("Error removing user from unit:", error);
      return false;
    }
  }

  private async initSampleData() {
    try {
      // Check if we have any users
      const existingUsers = await db.select().from(users);
      
      if (existingUsers.length === 0) {
        // Create test battalion
        const testUnit = await this.createUnit({
          name: "Test Battalion",
          unitLevel: "Battalion",
          referralCode: "test-battalion"
        });
        console.log("Init: Created test unit:", testUnit);
        
        // Create admin user
        const adminUser = await this.createUser({
          username: "admin",
          password: "password",
          name: "Admin User",
          rank: "Colonel",
          role: "admin",
          unitId: testUnit.id,
          bio: "Test user for system administration"
        });
        console.log("Init: Created admin user:", adminUser);
      }
    } catch (error) {
      console.error("Error initializing sample data:", error);
    }
  }

  async getUser(id: number): Promise<SelectUser | undefined> {
    try {
      const [user] = await db.select().from(users).where(and(
        eq(users.id, id),
        eq(users.isDeleted, false)
      ));
      return user;
    } catch (error) {
      console.error("Error getting user:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<SelectUser | undefined> {
    try {
      const [user] = await db.select().from(users).where(and(
        eq(users.username, username),
        eq(users.isDeleted, false)
      ));
      return user;
    } catch (error) {
      console.error("Error getting user by username:", error);
      return undefined;
    }
  }

  async createUser(userData: InsertUser): Promise<SelectUser> {
    try {
      const [user] = await db.insert(users).values(userData).returning();
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<SelectUser | undefined> {
    try {
      const now = new Date();
      const [updatedUser] = await db.update(users)
        .set({ ...updates, updatedAt: now })
        .where(and(
          eq(users.id, id),
          eq(users.isDeleted, false)
        ))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error("Error updating user:", error);
      return undefined;
    }
  }

  async softDeleteUser(id: number): Promise<boolean> {
    try {
      const now = new Date();
      const [deletedUser] = await db.update(users)
        .set({ isDeleted: true, deletedAt: now, updatedAt: now })
        .where(eq(users.id, id))
        .returning();
      return !!deletedUser;
    } catch (error) {
      console.error("Error soft deleting user:", error);
      return false;
    }
  }

  async restoreUser(id: number): Promise<boolean> {
    try {
      const now = new Date();
      const [restoredUser] = await db.update(users)
        .set({ isDeleted: false, deletedAt: null, updatedAt: now })
        .where(eq(users.id, id))
        .returning();
      return !!restoredUser;
    } catch (error) {
      console.error("Error restoring user:", error);
      return false;
    }
  }

  async getUsersByUnit(unitId: number): Promise<SelectUser[]> {
    try {
      return await db.select().from(users).where(and(
        eq(users.unitId, unitId),
        eq(users.isDeleted, false)
      ));
    } catch (error) {
      console.error("Error getting users by unit:", error);
      return [];
    }
  }
  
  async getAllUsers(): Promise<SelectUser[]> {
    try {
      console.log("Getting all users from database");
      const result = await db.select().from(users).where(
        eq(users.isDeleted, false)
      );
      console.log(`Found ${result.length} users in the database`);
      return result;
    } catch (error) {
      console.error("Error getting all users:", error);
      return [];
    }
  }

  async getUnit(id: number): Promise<Unit | undefined> {
    try {
      const [unit] = await db.select().from(units).where(and(
        eq(units.id, id),
        eq(units.isDeleted, false)
      ));
      return unit;
    } catch (error) {
      console.error("Error getting unit:", error);
      return undefined;
    }
  }

  async getUnitByReferralCode(code: string): Promise<Unit | undefined> {
    try {
      const [unit] = await db.select().from(units).where(and(
        eq(units.referralCode, code),
        eq(units.isDeleted, false)
      ));
      return unit;
    } catch (error) {
      console.error("Error getting unit by referral code:", error);
      return undefined;
    }
  }

  async createUnit(unitData: InsertUnit): Promise<Unit> {
    try {
      const [unit] = await db.insert(units).values(unitData).returning();
      return unit;
    } catch (error) {
      console.error("Error creating unit:", error);
      throw error;
    }
  }

  async updateUnit(id: number, updates: Partial<InsertUnit>): Promise<Unit | undefined> {
    try {
      const now = new Date();
      const [updatedUnit] = await db.update(units)
        .set({ ...updates, updatedAt: now })
        .where(and(
          eq(units.id, id),
          eq(units.isDeleted, false)
        ))
        .returning();
      return updatedUnit;
    } catch (error) {
      console.error("Error updating unit:", error);
      return undefined;
    }
  }

  async softDeleteUnit(id: number): Promise<boolean> {
    try {
      const now = new Date();
      const [deletedUnit] = await db.update(units)
        .set({ isDeleted: true, deletedAt: now, updatedAt: now })
        .where(eq(units.id, id))
        .returning();
      return !!deletedUnit;
    } catch (error) {
      console.error("Error soft deleting unit:", error);
      return false;
    }
  }

  async restoreUnit(id: number): Promise<boolean> {
    try {
      const now = new Date();
      const [restoredUnit] = await db.update(units)
        .set({ isDeleted: false, deletedAt: null, updatedAt: now })
        .where(eq(units.id, id))
        .returning();
      return !!restoredUnit;
    } catch (error) {
      console.error("Error restoring unit:", error);
      return false;
    }
  }

  async getSubunits(parentId: number): Promise<Unit[]> {
    try {
      return await db.select().from(units).where(and(
        eq(units.parentId, parentId),
        eq(units.isDeleted, false)
      ));
    } catch (error) {
      console.error("Error getting subunits:", error);
      return [];
    }
  }

  async getAllUnits(): Promise<Unit[]> {
    try {
      return await db.select().from(units).where(eq(units.isDeleted, false));
    } catch (error) {
      console.error("Error getting all units:", error);
      return [];
    }
  }

  async getEvent(id: number): Promise<Event | undefined> {
    try {
      const [event] = await db.select().from(events).where(and(
        eq(events.id, id),
        eq(events.isDeleted, false)
      ));
      return event;
    } catch (error) {
      console.error("Error getting event:", error);
      return undefined;
    }
  }

  async getEventsByUnit(unitId: number): Promise<Event[]> {
    try {
      // For now, just get events where the unit is the primary unit
      // This is a simplified approach until we can properly query JSON arrays
      return await db.select().from(events).where(and(
        eq(events.unitId, unitId),
        eq(events.isDeleted, false)
      ));
    } catch (error) {
      console.error("Error getting events by unit:", error);
      return [];
    }
  }

  async getAllEvents(): Promise<Event[]> {
    try {
      // Get all non-deleted events
      return await db.select().from(events).where(
        eq(events.isDeleted, false)
      );
    } catch (error) {
      console.error("Error getting all events:", error);
      return [];
    }
  }
  
  async getEventsByUserParticipation(userId: number): Promise<Event[]> {
    try {
      // For now, get all events and filter in memory
      // This is a simplified approach until we can properly query JSON arrays
      const allEvents = await this.getAllEvents();
      
      // Filter events where the user is a participant
      return allEvents.filter(event => {
        const participants = Array.isArray(event.participants) ? event.participants : [];
        return participants.includes(userId);
      });
    } catch (error) {
      console.error("Error getting events by user participation:", error);
      return [];
    }
  }

  async createEvent(eventData: InsertEvent): Promise<Event> {
    try {
      const [event] = await db.insert(events).values(eventData).returning();
      return event;
    } catch (error) {
      console.error("Error creating event:", error);
      throw error;
    }
  }

  async updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event | undefined> {
    try {
      const now = new Date();
      
      // Process date fields to ensure they are valid dates or null
      const processedUpdates = { ...updates };
      
      // Process step dates
      const dateFields = [
        'step1Date', 'step2Date', 'step3Date', 'step4Date',
        'step5Date', 'step6Date', 'step7Date', 'step8Date'
      ];
      
      for (const field of dateFields) {
        if (field in processedUpdates) {
          const dateValue = processedUpdates[field];
          // Convert empty strings to null, keep valid dates
          if (dateValue === '' || dateValue === undefined) {
            processedUpdates[field] = null;
          } else if (typeof dateValue === 'string') {
            // Try to convert string to date
            try {
              processedUpdates[field] = new Date(dateValue);
            } catch (e) {
              console.error(`Invalid date for ${field}:`, dateValue);
              processedUpdates[field] = null;
            }
          }
        }
      }
      
      // Handle regular date fields the same way
      if ('date' in processedUpdates && processedUpdates.date) {
        processedUpdates.date = new Date(processedUpdates.date);
      }
      
      if ('endDate' in processedUpdates) {
        if (processedUpdates.endDate === '' || processedUpdates.endDate === undefined) {
          processedUpdates.endDate = null;
        } else if (processedUpdates.endDate) {
          processedUpdates.endDate = new Date(processedUpdates.endDate);
        }
      }
      
      const [updatedEvent] = await db.update(events)
        .set({ ...processedUpdates, updatedAt: now })
        .where(and(
          eq(events.id, id),
          eq(events.isDeleted, false)
        ))
        .returning();
      return updatedEvent;
    } catch (error) {
      console.error("Error updating event:", error);
      return undefined;
    }
  }

  async softDeleteEvent(id: number): Promise<boolean> {
    try {
      const now = new Date();
      const [deletedEvent] = await db.update(events)
        .set({ isDeleted: true, deletedAt: now, updatedAt: now })
        .where(eq(events.id, id))
        .returning();
      return !!deletedEvent;
    } catch (error) {
      console.error("Error soft deleting event:", error);
      return false;
    }
  }

  async restoreEvent(id: number): Promise<boolean> {
    try {
      const now = new Date();
      const [restoredEvent] = await db.update(events)
        .set({ isDeleted: false, deletedAt: null, updatedAt: now })
        .where(eq(events.id, id))
        .returning();
      return !!restoredEvent;
    } catch (error) {
      console.error("Error restoring event:", error);
      return false;
    }
  }

  async addParticipantsToEvent(eventId: number, userIds: number[]): Promise<Event | undefined> {
    try {
      // Get current event
      const event = await this.getEvent(eventId);
      if (!event) return undefined;

      // Get existing participants and ensure it's an array
      const existingParticipants = Array.isArray(event.participants) ? event.participants : [];
      
      // Create a new array with unique participants
      const uniqueIds = [...new Set([...existingParticipants, ...userIds])];
      const allParticipants = Array.from(uniqueIds);

      // Update event
      return await this.updateEvent(eventId, { participants: allParticipants });
    } catch (error) {
      console.error("Error adding participants to event:", error);
      return undefined;
    }
  }

  async addUnitToEvent(eventId: number, unitId: number): Promise<Event | undefined> {
    try {
      // Get current event
      const event = await this.getEvent(eventId);
      if (!event) return undefined;

      // Get existing units and ensure it's an array
      const existingUnits = Array.isArray(event.participatingUnits) ? event.participatingUnits : [];
      
      // Create a new array with unique units
      const uniqueUnits = [...new Set([...existingUnits, unitId])];
      const allUnits = Array.from(uniqueUnits);

      // Update event
      return await this.updateEvent(eventId, { participatingUnits: allUnits });
    } catch (error) {
      console.error("Error adding unit to event:", error);
      return undefined;
    }
  }

  async getEventParticipants(eventId: number): Promise<SelectUser[]> {
    try {
      // Get event to access participant IDs
      const event = await this.getEvent(eventId);
      if (!event || !event.participants || event.participants.length === 0) return [];

      // Get all users with IDs in the participants array
      return await db.select().from(users).where(and(
        or(...event.participants.map(id => eq(users.id, id))),
        eq(users.isDeleted, false)
      ));
    } catch (error) {
      console.error("Error getting event participants:", error);
      return [];
    }
  }

  async getPendingAAREvents(userId: number): Promise<Event[]> {
    try {
      // Get all events where the user is participating
      const userEvents = await this.getEventsByUserParticipation(userId);
      if (userEvents.length === 0) return [];

      // Get all AARs created by the user
      const userAARs = await this.getAARsByUser(userId);
      const completedEventIds = new Set(userAARs.map(aar => aar.eventId));

      // Filter events that are in AAR stage and don't have an AAR from this user
      return userEvents.filter(event => 
        event.step === 6 && !completedEventIds.has(event.id)
      );
    } catch (error) {
      console.error("Error getting pending AAR events:", error);
      return [];
    }
  }

  async getAAR(id: number): Promise<AAR | undefined> {
    try {
      const [aar] = await db.select().from(aars).where(and(
        eq(aars.id, id),
        eq(aars.isDeleted, false)
      ));
      return aar;
    } catch (error) {
      console.error("Error getting AAR:", error);
      return undefined;
    }
  }

  async getAARsByEvent(eventId: number): Promise<AAR[]> {
    try {
      return await db.select().from(aars).where(and(
        eq(aars.eventId, eventId),
        eq(aars.isDeleted, false)
      ));
    } catch (error) {
      console.error("Error getting AARs by event:", error);
      return [];
    }
  }

  async getAARsByUnit(unitId: number): Promise<AAR[]> {
    try {
      return await db.select().from(aars).where(and(
        eq(aars.unitId, unitId),
        eq(aars.isDeleted, false)
      ));
    } catch (error) {
      console.error("Error getting AARs by unit:", error);
      return [];
    }
  }

  async getAARsByUser(userId: number): Promise<AAR[]> {
    try {
      return await db.select().from(aars).where(and(
        eq(aars.createdBy, userId),
        eq(aars.isDeleted, false)
      ));
    } catch (error) {
      console.error("Error getting AARs by user:", error);
      return [];
    }
  }

  async createAAR(aarData: InsertAAR): Promise<AAR> {
    try {
      const [aar] = await db.insert(aars).values(aarData).returning();
      return aar;
    } catch (error) {
      console.error("Error creating AAR:", error);
      throw error;
    }
  }

  async updateAAR(id: number, updates: Partial<InsertAAR>): Promise<AAR | undefined> {
    try {
      const now = new Date();
      const [updatedAAR] = await db.update(aars)
        .set({ ...updates, updatedAt: now })
        .where(and(
          eq(aars.id, id),
          eq(aars.isDeleted, false)
        ))
        .returning();
      return updatedAAR;
    } catch (error) {
      console.error("Error updating AAR:", error);
      return undefined;
    }
  }

  async softDeleteAAR(id: number): Promise<boolean> {
    try {
      const now = new Date();
      const [deletedAAR] = await db.update(aars)
        .set({ isDeleted: true, deletedAt: now, updatedAt: now })
        .where(eq(aars.id, id))
        .returning();
      return !!deletedAAR;
    } catch (error) {
      console.error("Error soft deleting AAR:", error);
      return false;
    }
  }

  async restoreAAR(id: number): Promise<boolean> {
    try {
      const now = new Date();
      const [restoredAAR] = await db.update(aars)
        .set({ isDeleted: false, deletedAt: null, updatedAt: now })
        .where(eq(aars.id, id))
        .returning();
      return !!restoredAAR;
    } catch (error) {
      console.error("Error restoring AAR:", error);
      return false;
    }
  }

  async createAuditLog(logData: InsertAuditLog): Promise<AuditLog> {
    try {
      const [log] = await db.insert(auditLogs).values(logData).returning();
      return log;
    } catch (error) {
      console.error("Error creating audit log:", error);
      throw error;
    }
  }

  async getAuditLogs(userId?: number, startDate?: Date, endDate?: Date): Promise<AuditLog[]> {
    try {
      let query = db.select().from(auditLogs);
      
      // Apply filters if provided
      if (userId) {
        query = query.where(eq(auditLogs.userId, userId));
      }
      
      if (startDate) {
        query = query.where(gt(auditLogs.timestamp, startDate));
      }
      
      if (endDate) {
        query = query.where(lt(auditLogs.timestamp, endDate));
      }
      
      // Sort by most recent first
      query = query.orderBy(desc(auditLogs.timestamp));
      
      return await query;
    } catch (error) {
      console.error("Error getting audit logs:", error);
      return [];
    }
  }

  async generateVeniceAnalysis(unitId: number): Promise<VeniceAnalysis> {
    try {
      // Get all AARs for the unit
      const unitAARs = await this.getAARsByUnit(unitId);
      
      console.log(`Found ${unitAARs.length} AARs for unit ${unitId}`);
      
      // Use our custom AAR analysis service for more specific insights
      const { aarAnalysisService } = await import('./services/aar-analysis');
      return await aarAnalysisService.analyzeAARs(unitAARs);
      
    } catch (error) {
      console.error("Error generating Venice analysis:", error);
      return {
        trends: [],
        frictionPoints: [],
        recommendations: []
      };
    }
  }
  
  async generateVenicePromptAnalysis(unitId: number, prompt: string): Promise<VeniceAnalysis> {
    try {
      // Import the Venice AI service
      const { veniceAIService } = await import('./services/venice-ai');
      
      // Get all AARs for the unit
      const unitAARs = await this.getAARsByUnit(unitId);
      
      console.log(`Analyzing ${unitAARs.length} AARs for unit ${unitId} with prompt: "${prompt}"`);
      
      // Use the Venice AI service to generate analysis based on the prompt
      return await veniceAIService.generatePromptAnalysis(unitAARs, prompt);
      
    } catch (error) {
      console.error("Error generating Venice prompt analysis:", error);
      return {
        trends: [
          {
            category: "Error",
            description: "An error occurred while processing your prompt.",
            frequency: 0,
            severity: "Medium"
          }
        ],
        frictionPoints: [
          {
            category: "System Error",
            description: "The analysis service is currently unavailable.",
            impact: "Medium"
          }
        ],
        recommendations: [
          {
            category: "Retry",
            description: "Please try again later or contact support if the issue persists.",
            priority: "Medium"
          }
        ]
      };
    }
  }

  async getNotificationsForUser(userId: number): Promise<Notification[]> {
    try {
      return await db.select().from(notifications).where(
        eq(notifications.userId, userId)
      ).orderBy(desc(notifications.createdAt));
    } catch (error) {
      console.error("Error getting notifications for user:", error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId: number): Promise<boolean> {
    try {
      const [updatedNotification] = await db.update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, notificationId))
        .returning();
      return !!updatedNotification;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }
  }

  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    try {
      const [notification] = await db.insert(notifications).values(notificationData).returning();
      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();