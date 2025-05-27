import { pgTable, text, serial, integer, boolean, timestamp, json, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Military roles enum
export const MilitaryRoles = {
  SOLDIER: "Soldier",
  TEAM_LEADER: "Team Leader",
  SQUAD_LEADER: "Squad Leader",
  PLATOON_SERGEANT: "Platoon Sergeant",
  PLATOON_LEADER: "Platoon Leader",
  SECTION_SERGEANT: "Section Sergeant",
  FIRST_SERGEANT: "First Sergeant",
  XO: "XO",
  COMMANDER: "Commander",
  ADMIN: "admin"
} as const;

// Unit levels enum
export const UnitLevels = {
  TEAM: "Team",
  SQUAD: "Squad",
  PLATOON: "Platoon",
  COMPANY: "Company",
  BATTALION: "Battalion"
} as const;

// Military hierarchy structure - defines what unit levels each role can access
export const MilitaryHierarchy = {
  // Each level contains what levels it can see/manage
  [MilitaryRoles.SOLDIER]: [], // Regular soldiers don't manage anyone
  [MilitaryRoles.TEAM_LEADER]: [UnitLevels.TEAM], // Team leaders can see their team
  [MilitaryRoles.SQUAD_LEADER]: [UnitLevels.TEAM, UnitLevels.SQUAD], // Squad leaders can see teams and other squads
  [MilitaryRoles.PLATOON_SERGEANT]: [UnitLevels.TEAM, UnitLevels.SQUAD, UnitLevels.PLATOON],
  [MilitaryRoles.PLATOON_LEADER]: [UnitLevels.TEAM, UnitLevels.SQUAD, UnitLevels.PLATOON],
  [MilitaryRoles.FIRST_SERGEANT]: [UnitLevels.TEAM, UnitLevels.SQUAD, UnitLevels.PLATOON, UnitLevels.COMPANY],
  [MilitaryRoles.COMMANDER]: [UnitLevels.TEAM, UnitLevels.SQUAD, UnitLevels.PLATOON, UnitLevels.COMPANY],
  [MilitaryRoles.ADMIN]: [UnitLevels.TEAM, UnitLevels.SQUAD, UnitLevels.PLATOON, UnitLevels.COMPANY, UnitLevels.BATTALION], // Admin has access to all levels
} as const;

// 8-Step Training Model steps
export const TrainingSteps = {
  RISK_ASSESSMENT: 1,
  PLANNING: 2,
  PREPARATION: 3,
  REHEARSAL: 4,
  EXECUTION: 5,
  AAR: 6,
  RETRAINING: 7,
  CERTIFICATION: 8
} as const;

// Schema for users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  rank: text("rank").notNull(),
  role: text("role").notNull(),
  unitId: integer("unit_id").notNull(),
  bio: text("bio"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  deletedAt: timestamp("deleted_at"),
});

// Schema for units table
export const units = pgTable("units", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  parentId: integer("parent_id"),
  unitLevel: text("unit_level").notNull(), // Battalion, Company, Platoon, etc.
  referralCode: text("referral_code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  deletedAt: timestamp("deleted_at"),
});

// Schema for events table
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  unitId: integer("unit_id").notNull(),
  createdBy: integer("created_by").notNull(),
  step: integer("step").notNull(), // 1-8 based on training model
  date: timestamp("date").notNull(), // Start date for the event
  isMultiDayEvent: boolean("is_multi_day_event").default(false).notNull(), // Flag for multi-day events
  endDate: timestamp("end_date"), // End date for multi-day events
  location: text("location").notNull(),
  objectives: text("objectives").notNull(),
  missionStatement: text("mission_statement"),
  conceptOfOperation: text("concept_of_operation"),
  resources: text("resources"),
  eventType: text("event_type").default("training").notNull(), // Training, Mission, Exercise, etc.
  participants: json("participants").notNull(), // Array of user IDs
  participatingUnits: json("participating_units").default('[]').notNull(), // Array of unit IDs
  notifyParticipants: boolean("notify_participants").default(false).notNull(), // Flag to notify participants when in Step 6 (AAR)
  // Step notes
  step1Notes: text("step1_notes"),
  step2Notes: text("step2_notes"),
  step3Notes: text("step3_notes"),
  step4Notes: text("step4_notes"),
  step5Notes: text("step5_notes"),
  step6Notes: text("step6_notes"),
  step7Notes: text("step7_notes"),
  step8Notes: text("step8_notes"),
  // Step dates
  step1Date: timestamp("step1_date"),
  step2Date: timestamp("step2_date"),
  step3Date: timestamp("step3_date"),
  step4Date: timestamp("step4_date"),
  step5Date: timestamp("step5_date"),
  step6Date: timestamp("step6_date"),
  step7Date: timestamp("step7_date"),
  step8Date: timestamp("step8_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  deletedAt: timestamp("deleted_at"),
});

// AAR item type definition - used for each sustain/improve/action item
export type AARItemType = {
  id: string; // UUID for the item
  text: string; // The actual comment
  authorId: number; // User ID of who wrote it
  authorRank: string; // Rank of the author when written
  unitId: number; // Unit ID the author belonged to when written
  unitLevel: string; // Unit level (e.g., "Squad", "Platoon")
  createdAt: string; // ISO date string
  tags?: string[]; // Optional tags for categorization
};

// Schema for AARs table
export const aars = pgTable("aars", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  unitId: integer("unit_id").notNull(),
  createdBy: integer("created_by").notNull(),
  sustainItems: json("sustain_items").$type<AARItemType[]>().notNull(), // What went well
  improveItems: json("improve_items").$type<AARItemType[]>().notNull(), // What could be improved
  actionItems: json("action_items").$type<AARItemType[]>().notNull(), // Action items for improvement
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  deletedAt: timestamp("deleted_at"),
});

// Schema for audit logs
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(), // e.g., "login", "create_aar", "edit_event"
  details: json("details"), // Any relevant details
  ipAddress: text("ip_address").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
  deletedAt: true,
});

export const insertUnitSchema = createInsertSchema(units).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
  deletedAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
  deletedAt: true,
});

export const insertAARSchema = createInsertSchema(aars).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
  deletedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

// Types from schemas
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Unit = typeof units.$inferSelect;
export type InsertUnit = z.infer<typeof insertUnitSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type AAR = typeof aars.$inferSelect;
export type InsertAAR = z.infer<typeof insertAARSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Schema for notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // e.g., "AAR_REQUIRED", "EVENT_ADDED", "UNIT_CHANGE"
  relatedEntityId: integer("related_entity_id"), // ID of the related event, AAR, etc.
  relatedEntityType: text("related_entity_type"), // Type of the related entity (event, AAR, etc.)
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  read: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// User-Unit assignments join table
export const userUnitAssignments = pgTable("user_unit_assignments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  unitId: integer("unit_id").notNull().references(() => units.id),
  assignmentType: text("assignment_type").notNull(), // "PRIMARY", "ATTACHED", "TEMPORARY", etc.
  leadershipRole: text("leadership_role"), // Unit-specific role if user is in leadership
  assignedBy: integer("assigned_by").references(() => users.id), // Who made the assignment
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"), // NULL for ongoing assignments
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  deletedAt: timestamp("deleted_at"),
});

// Insert schema for user-unit assignments
export const insertUserUnitAssignmentSchema = createInsertSchema(userUnitAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
  deletedAt: true,
});

// Type for user-unit assignments
export type UserUnitAssignment = typeof userUnitAssignments.$inferSelect;
export type InsertUserUnitAssignment = z.infer<typeof insertUserUnitAssignmentSchema>;

// Enums for unit assignments
export const AssignmentTypes = {
  PRIMARY: "PRIMARY",     // Main unit assignment
  ATTACHED: "ATTACHED",   // Formally attached to another unit
  TEMPORARY: "TEMPORARY", // Temporary assignment (e.g., training)
  DUAL_HATTED: "DUAL_HATTED" // Serving in multiple leadership roles
} as const;

// Leadership roles by unit level
export const LeadershipRoles = {
  [UnitLevels.COMPANY]: ["Commander", "Executive Officer", "First Sergeant", "Company Admin"],
  [UnitLevels.PLATOON]: ["Platoon Leader", "Platoon Sergeant", "Platoon Admin"],
  [UnitLevels.SQUAD]: ["Squad Leader", "Assistant Squad Leader"],
  [UnitLevels.TEAM]: ["Team Leader"]
} as const;

// Venice AI Analysis Types
export type VeniceAnalysis = {
  trends: {
    category: string;
    description: string;
    frequency: number;
    severity: string;
  }[];
  frictionPoints: {
    category: string;
    description: string;
    impact: string;
  }[];
  recommendations: {
    category: string;
    description: string;
    priority: string;
  }[];
};
