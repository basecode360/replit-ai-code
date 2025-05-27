import { z } from "zod";

// Enums
export const MilitaryRoles = {
  SOLDIER: "Soldier",
  TEAM_LEADER: "Team Leader",
  SQUAD_LEADER: "Squad Leader",
  PLATOON_SERGEANT: "Platoon Sergeant",
  PLATOON_LEADER: "Platoon Leader",
  SECTION_SERGEANT: "Section Sergeant",
  FIRST_SERGEANT: "First Sergeant",
  XO: "XO",
  COMMANDER: "Commander"
} as const;

export type MilitaryRole = keyof typeof MilitaryRoles;

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

export type TrainingStep = keyof typeof TrainingSteps;

// User Types
export type User = {
  id: number;
  username: string;
  name: string;
  rank: string;
  role: string;
  unitId: number;
  bio?: string;
};

export const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  rank: z.string().min(1, "Rank is required"),
  role: z.string().min(1, "Role is required"),
  unitId: z.number(),
  bio: z.string().optional(),
});

// Unit Types
export type Unit = {
  id: number;
  name: string;
  parentId?: number;
  unitLevel: string;
  referralCode: string;
};

export const unitSchema = z.object({
  name: z.string().min(1, "Unit name is required"),
  parentId: z.number().optional(),
  unitLevel: z.string().min(1, "Unit level is required"),
});

// Event Types
export type Event = {
  id: number;
  title: string;
  unitId: number;
  createdBy: number;
  step: number;
  date: Date | string;
  isMultiDayEvent?: boolean;
  endDate?: Date | string | null;
  executionDate?: Date | string;
  location: string;
  objectives: string;
  resources?: string;
  participants: number[];
  participatingUnits?: number[];
  notifyParticipants?: boolean;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  eventType?: string;
  trainingEchelon?: string;
  step1Date?: Date | string;
  step2Date?: Date | string;
  step3Date?: Date | string;
  step4Date?: Date | string;
  step5Date?: Date | string;
  step6Date?: Date | string;
  step7Date?: Date | string;
  step8Date?: Date | string;
  createdAt: Date | string;
  updatedAt?: Date | string;
};

export const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  unitId: z.number(),
  step: z.number().min(1).max(8),
  date: z.date(),
  isMultiDayEvent: z.boolean().optional().default(false),
  endDate: z.date().optional().nullable(),
  location: z.string().min(1, "Location is required"),
  objectives: z.string().min(1, "Objectives are required"),
  resources: z.string().optional(),
  participants: z.array(z.number()),
});

// AAR Types
export type AAR = {
  id: number;
  eventId: number;
  unitId: number;
  createdBy: number;
  sustainItems: string[];
  improveItems: string[];
  actionItems: string[];
  createdAt: Date;
};

export const aarSchema = z.object({
  eventId: z.number(),
  sustainItems: z.array(z.string()),
  improveItems: z.array(z.string()),
  actionItems: z.array(z.string()),
});

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

// Audit Log Types
export type AuditLog = {
  id: number;
  userId: number;
  action: string;
  details?: any;
  ipAddress: string;
  timestamp: Date;
};

// Step Status for training progress
export type StepStatus = 'complete' | 'in-progress' | 'pending';

// Training Step Information
export const trainingStepInfo = [
  { id: 1, name: 'Plan', description: 'Create detailed training plan' },
  { id: 2, name: 'Train the Trainers', description: 'Prepare instructors for training delivery' },
  { id: 3, name: 'Recon the Site', description: 'Inspect and prepare training location' },
  { id: 4, name: 'Issue the Order', description: 'Communicate detailed instructions' },
  { id: 5, name: 'Rehearse', description: 'Practice and refine procedures' },
  { id: 6, name: 'Execute', description: 'Conduct the training event' },
  { id: 7, name: 'Evaluate the Training', description: 'Review and identify lessons learned' },
  { id: 8, name: 'Retrain', description: 'Address identified gaps' }
];
