import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import { z } from "zod";
import {
  insertUserSchema,
  insertUnitSchema,
  insertEventSchema,
  insertAARSchema,
  TrainingSteps,
  UnitLevels,
  MilitaryRoles,
  MilitaryHierarchy,
  User,
} from "@shared/schema";
import { getAccessibleUnits, getAccessibleUsers } from "./lib/permissions";
import { nanoid } from "nanoid";
import crypto from "crypto";
import QRCode from "qrcode";
import { setupAuth, isAuthenticated } from "./auth";
import { openaiService } from "./services/openai-service";
import { veniceAIService } from "./services/venice-ai";

// Helper to log audit events
const logAudit = async (
  userId: number,
  action: string,
  details: any,
  ipAddress: string | undefined
) => {
  await storage.createAuditLog({
    userId,
    action,
    details,
    ipAddress: ipAddress || "0.0.0.0",
  });
};

// Helper to sanitize user data (remove password)
const sanitizeUser = (user: any) => {
  const { password, ...sanitizedUser } = user;
  return sanitizedUser;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set CORS headers for Replit deployment environment
  app.use((req: Request, res: Response, next: NextFunction) => {

    const allowedOrigins = [
      "http://localhost:5000",
      "http://localhost:5173", // Vite dev server
      "https://greenbook-demo.netlify.app/"
    ];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, DELETE, OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    next();
  });

  // Set Content-Type for all responses
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header("Content-Type", "application/json");
    next();
  });
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Sets up authentication routes (/api/login, /api/logout, /api/user)
  setupAuth(app);

  // User registration (with referral code or creating a new unit)
  app.post("/api/users", async (req, res) => {
    try {
      console.log("Processing user registration:", req.body);

      // Check for required fields
      if (!req.body.username || !req.body.password) {
        return res
          .status(400)
          .json({ message: "Missing username or password" });
      }

      // Check if username is already taken
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      let user;
      let unitId;

      // Check which registration mode is being used
      if (req.body.referralCode) {
        // Registration with referral code (joining an existing unit)
        console.log(
          `Registration with referral code: ${req.body.referralCode}`
        );

        // Find unit by referral code
        const unit = await storage.getUnitByReferralCode(req.body.referralCode);
        if (!unit) {
          return res.status(404).json({
            message: "Invalid referral code. Please check and try again.",
          });
        }

        unitId = unit.id;

        // Create user data with the unit ID
        const userData = {
          username: req.body.username,
          password: req.body.password, // In production, hash this password
          name: req.body.name,
          rank: req.body.rank,
          role: req.body.role,
          unitId: unitId,
          bio: req.body.bio || null,
        };

        console.log(
          `Creating user with unit ID ${unitId} from referral code ${req.body.referralCode}`
        );

        // Create the user
        user = await storage.createUser(userData);
      } else if (
        req.body.createNewUnit &&
        req.body.unitName &&
        req.body.unitLevel
      ) {
        // Registration with new unit creation
        console.log(
          `Registration with new unit creation: ${req.body.unitName} (${req.body.unitLevel})`
        );

        // Create a new unit
        const unitData = {
          name: req.body.unitName,
          unitLevel: req.body.unitLevel,
          description: `Unit created by ${req.body.name}`,
          referralCode: crypto.randomBytes(4).toString("hex").toUpperCase(), // Generate a random referral code
          parentUnitId: null, // No parent unit for newly created units
        };

        console.log("Creating new unit:", unitData);
        const newUnit = await storage.createUnit(unitData);
        unitId = newUnit.id;

        // Create user with admin role in the new unit
        const userData = {
          username: req.body.username,
          password: req.body.password, // In production, hash this password
          name: req.body.name,
          rank: req.body.rank,
          role: "Commander", // Make them a unit commander instead of system admin
          unitId: unitId,
          bio: req.body.bio || null,
        };

        console.log(`Creating admin user for new unit ID ${unitId}`);

        // Create the user
        user = await storage.createUser(userData);

        // Assign user to unit with leadership role
        await storage.assignUserToUnit({
          userId: user.id,
          unitId: unitId,
          assignmentType: "PRIMARY",
          leadershipRole: "commander", // Make them the unit commander
          assignedBy: user.id,
          startDate: new Date(), // Use startDate instead of assignedAt
        });

        console.log(`User ${user.id} assigned as commander of unit ${unitId}`);
      } else {
        // Missing required fields for registration
        return res.status(400).json({
          message:
            "Either a referral code or unit creation details are required",
        });
      }

      // Remove password from response
      const sanitizedUser = sanitizeUser(user);

      res.status(201).json(sanitizedUser);
    } catch (error) {
      console.error("User registration error:", error);
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ message: "Invalid user data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error registering user" });
      }
    }
  });

  // User routes (beyond basic auth)
  app.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      // Get users based on hierarchy
      const users = await getAccessibleUsers((req.user as any).id);

      // Return sanitized users (no passwords)
      res.json(users.map(sanitizeUser));
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get individual user by ID
  app.get("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Check permissions (admin can view all users, others only those in their hierarchy)
      if ((req.user as any).role !== "admin") {
        // Get accessible users for the current user
        const accessibleUsers = await getAccessibleUsers((req.user as any).id);
        // Check if the requested user is in the accessible users list
        if (!accessibleUsers.some((user) => user.id === userId)) {
          return res
            .status(403)
            .json({ message: "You do not have permission to view this user" });
        }
      }

      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Error getting user:", error);
      res.status(500).json({ message: "Error getting user" });
    }
  });

  // Update a user's profile information (non-historical fields only)
  app.patch("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      console.log("Profile update request received:", {
        params: req.params,
        body: req.body,
      });

      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Only allow users to update their own profile or admins to update any profile
      if (
        (req.user as any).id !== userId &&
        (req.user as any).role !== "admin"
      ) {
        return res
          .status(403)
          .json({ message: "You do not have permission to update this user" });
      }

      // Get the existing user
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Extract only the allowed fields to be updated
      // This ensures historical records aren't affected
      const { name, rank, bio } = req.body;

      // Create an updates object with only the fields that changed
      const updates: Partial<User> = {};
      if (name !== undefined) updates.name = name;
      if (rank !== undefined) updates.rank = rank;
      if (bio !== undefined) updates.bio = bio;

      console.log("Preparing user updates:", updates);

      // Only update if there are changes
      if (Object.keys(updates).length === 0) {
        return res.json(sanitizeUser(existingUser));
      }

      // Update the user with only the allowed fields
      const updatedUser = await storage.updateUser(userId, updates);

      if (!updatedUser) {
        console.error(
          "Failed to update user - storage.updateUser returned undefined"
        );
        return res.status(500).json({ message: "Failed to update user" });
      }

      // Log the update action
      logAudit(
        (req.user as any).id,
        "update_user_profile",
        { userId, updates },
        req.ip
      );

      console.log("User updated successfully:", {
        id: updatedUser.id,
        name: updatedUser.name,
      });
      // Always return a valid JSON response
      return res.json(sanitizeUser(updatedUser));
    } catch (error) {
      console.error("Error updating user:", error);
      return res.status(500).json({ message: "Error updating user" });
    }
  });

  // Get unit members by unit ID
  app.get("/api/units/:id/members", isAuthenticated, async (req, res) => {
    try {
      const unitId = parseInt(req.params.id);

      if (isNaN(unitId)) {
        return res.status(400).json({ message: "Invalid unit ID" });
      }

      // Check permissions (admin can view all units, others only those in their hierarchy)
      if ((req.user as any).role !== "admin") {
        // Get accessible units for the current user
        const accessibleUnits = await getAccessibleUnits((req.user as any).id);
        // Check if the requested unit is in the accessible units list
        if (!accessibleUnits.some((unit) => unit.id === unitId)) {
          return res
            .status(403)
            .json({ message: "You do not have permission to view this unit" });
        }
      }

      const members = await storage.getUsersByUnit(unitId);

      res.json(members.map(sanitizeUser));
    } catch (error) {
      console.error("Error getting unit members:", error);
      res.status(500).json({ message: "Error getting unit members" });
    }
  });

  // Get events for a specific user
  app.get("/api/users/:id/events", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Check permissions (admin can view all users, others only those in their hierarchy)
      if (
        (req.user as any).role !== "admin" &&
        (req.user as any).id !== userId
      ) {
        // Get accessible users for the current user
        const accessibleUsers = await getAccessibleUsers((req.user as any).id);
        // Check if the requested user is in the accessible users list
        if (!accessibleUsers.some((user) => user.id === userId)) {
          return res.status(403).json({
            message: "You do not have permission to view this user's events",
          });
        }
      }

      // Get events by user participation
      const events = await storage.getEventsByUserParticipation(userId);

      // Filter out deleted events
      const activeEvents = events.filter((event) => !event.isDeleted);

      res.json(activeEvents);
    } catch (error) {
      console.error("Error getting user events:", error);
      res.status(500).json({ message: "Error getting user events" });
    }
  });

  // Get AARs submitted by a specific user
  app.get("/api/users/:id/aars", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Check permissions (admin can view all users, others only those in their hierarchy)
      if (
        (req.user as any).role !== "admin" &&
        (req.user as any).id !== userId
      ) {
        // Get accessible users for the current user
        const accessibleUsers = await getAccessibleUsers((req.user as any).id);
        // Check if the requested user is in the accessible users list
        if (!accessibleUsers.some((user) => user.id === userId)) {
          return res.status(403).json({
            message: "You do not have permission to view this user's AARs",
          });
        }
      }

      // Get AARs by user
      const aars = await storage.getAARsByUser(userId);

      res.json(aars);
    } catch (error) {
      console.error("Error getting user AARs:", error);
      res.status(500).json({ message: "Error getting user AARs" });
    }
  });

  // Custom analysis endpoint for user events and AARs
  app.post(
    "/api/users/:id/custom-analysis",
    isAuthenticated,
    async (req, res) => {
      try {
        // Get user ID from params
        const userId = parseInt(req.params.id);

        if (isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }

        const user = await storage.getUser(userId);

        if (!user || user.isDeleted) {
          return res.status(404).json({ message: "User not found" });
        }

        // Check permissions (admin can view all users, others only those in their hierarchy)
        if (
          (req.user as any).role !== "admin" &&
          (req.user as any).id !== userId
        ) {
          // Get accessible users for the current user
          const accessibleUsers = await getAccessibleUsers(
            (req.user as any).id
          );
          // Check if the requested user is in the accessible users list
          if (!accessibleUsers.some((u) => u.id === userId)) {
            return res.status(403).json({
              message: "You do not have permission to analyze this user's data",
            });
          }
        }

        // Get prompt from request body
        const { prompt } = req.body;

        if (!prompt || typeof prompt !== "string") {
          return res.status(400).json({ message: "Valid prompt is required" });
        }

        // Get events and AARs for the user
        const userEvents = await storage.getEventsByUserParticipation(userId);
        const userAARs = await storage.getAARsByUser(userId);

        console.log(
          `Generating custom analysis for user ${userId} with ${userEvents.length} events and ${userAARs.length} AARs`
        );

        // Generate analysis using OpenAI
        try {
          const analysis = await veniceAIService.generateCustomAnalysis(
            userAARs,
            userEvents,
            prompt
          );

          // Log this activity
          await logAudit(
            (req.user as any).id || userId,
            "GENERATE_CUSTOM_ANALYSIS",
            { userId, prompt },
            req.ip
          );

          return res.json(analysis);
        } catch (error: any) {
          console.error("Error generating custom analysis:", error);
          return res.status(500).json({
            message: "Failed to generate analysis",
            content:
              "There was an error processing your request. Please try again later.",
          });
        }
      } catch (error) {
        console.error("Error in custom analysis endpoint:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // User Unit Assignment routes

  // Get all unit assignments for a user
  app.get(
    "/api/users/:id/unit-assignments",
    isAuthenticated,
    async (req, res) => {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      try {
        // Check if the user exists
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Get all active unit assignments for the user
        const assignments = await storage.getUserUnitAssignments(userId);

        // If no assignments are found, create a default one based on their primary unit
        if (assignments.length === 0) {
          // Return a temporary assignment based on the user's unitId
          return res.json([
            {
              id: null, // Will be assigned when saved
              userId,
              unitId: user.unitId,
              assignmentType: "PRIMARY",
              startDate: new Date().toISOString(),
              isNew: true,
            },
          ]);
        }

        return res.json(assignments);
      } catch (error) {
        console.error("Error getting user unit assignments:", error);
        return res
          .status(500)
          .json({ message: "Failed to get unit assignments" });
      }
    }
  );

  // Create a new unit assignment
  app.post(
    "/api/users/:id/unit-assignments",
    isAuthenticated,
    async (req, res) => {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      try {
        const { unitId, assignmentType, leadershipRole } = req.body;

        if (!unitId || !assignmentType) {
          return res
            .status(400)
            .json({ message: "Unit ID and assignment type are required" });
        }

        // Check if the user exists
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Check if the unit exists
        const unit = await storage.getUnit(unitId);
        if (!unit) {
          return res.status(404).json({ message: "Unit not found" });
        }

        // Create the assignment
        const assignment = await storage.assignUserToUnit({
          userId,
          unitId,
          assignmentType,
          leadershipRole: leadershipRole !== "none" ? leadershipRole : null,
          assignedBy: (req.user as any).id,
        });

        // If this is a PRIMARY assignment, update other assignments
        if (assignmentType === "PRIMARY") {
          // Get all user's active assignments
          const allAssignments = await storage.getUserUnitAssignments(userId);

          // Find any existing PRIMARY assignments (should be only one)
          const existingPrimary = allAssignments.find(
            (a) => a.assignmentType === "PRIMARY" && a.id !== assignment.id
          );

          // If there's an existing PRIMARY, downgrade it to ATTACHED
          if (existingPrimary) {
            await storage.updateUserUnitAssignment(existingPrimary.id, {
              assignmentType: "ATTACHED",
            });
          }

          // Update the legacy unitId field on the user record
          await storage.updateUser(userId, { unitId: assignment.unitId });
        }

        // Log the assignment action
        logAudit(
          (req.user as any).id,
          "assign_user_to_unit",
          {
            userId,
            unitId,
            assignmentType,
            leadershipRole,
          },
          req.ip
        );

        return res.status(201).json(assignment);
      } catch (error) {
        console.error("Error creating unit assignment:", error);
        return res
          .status(500)
          .json({ message: "Failed to create unit assignment" });
      }
    }
  );

  // Update an existing unit assignment
  app.patch(
    "/api/users/:userId/unit-assignments/:assignmentId",
    isAuthenticated,
    async (req, res) => {
      const userId = parseInt(req.params.userId);
      const assignmentId = parseInt(req.params.assignmentId);

      if (isNaN(userId) || isNaN(assignmentId)) {
        return res
          .status(400)
          .json({ message: "Invalid user ID or assignment ID" });
      }

      try {
        const { unitId, assignmentType, leadershipRole, endDate } = req.body;

        // Verify the assignment exists and belongs to the user
        const assignments = await storage.getUserUnitAssignments(userId);
        const assignmentToUpdate = assignments.find(
          (a) => a.id === assignmentId
        );

        if (!assignmentToUpdate) {
          return res.status(404).json({ message: "Assignment not found" });
        }

        // Prepare the update
        const updates: any = {};
        if (unitId) updates.unitId = unitId;
        if (assignmentType) updates.assignmentType = assignmentType;
        if (leadershipRole === "none") {
          updates.leadershipRole = null;
        } else if (leadershipRole) {
          updates.leadershipRole = leadershipRole;
        }
        if (endDate) updates.endDate = endDate;

        // Update the assignment
        const assignment = await storage.updateUserUnitAssignment(
          assignmentId,
          updates
        );

        if (!assignment) {
          return res
            .status(404)
            .json({ message: "Assignment not found or could not be updated" });
        }

        // If this is now a PRIMARY assignment, update other assignments
        if (assignmentType === "PRIMARY") {
          // Find any other PRIMARY assignments
          const otherPrimary = assignments.find(
            (a) => a.assignmentType === "PRIMARY" && a.id !== assignmentId
          );

          // If there's another PRIMARY, downgrade it to ATTACHED
          if (otherPrimary) {
            await storage.updateUserUnitAssignment(otherPrimary.id, {
              assignmentType: "ATTACHED",
            });
          }

          // Update the legacy unitId field on the user record
          await storage.updateUser(userId, { unitId: assignment.unitId });
        }

        // Log the update action
        logAudit(
          (req.user as any).id,
          "update_unit_assignment",
          {
            userId,
            assignmentId,
            updates: req.body,
          },
          req.ip
        );

        return res.json(assignment);
      } catch (error) {
        console.error("Error updating unit assignment:", error);
        return res
          .status(500)
          .json({ message: "Failed to update unit assignment" });
      }
    }
  );

  // Get user notifications
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const notifications = await storage.getNotificationsForUser(user.id);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Create a test notification (for development purposes)
  app.post("/api/notifications/test", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any; // Using any to avoid TypeScript errors

      // Create a test notification
      const notification = await storage.createNotification({
        userId: user.id,
        title: "Test Notification",
        message:
          "This is a test notification to verify the notification system is working properly.",
        type: "test",
        relatedEntityId: null,
        relatedEntityType: null,
      });

      res.json({ success: true, notification });
    } catch (error) {
      console.error("Error creating test notification:", error);
      res.status(500).json({ message: "Failed to create test notification" });
    }
  });

  // Mark notification as read
  app.post(
    "/api/notifications/:id/mark-read",
    isAuthenticated,
    async (req, res) => {
      try {
        const user = req.user as User;
        const notificationId = parseInt(req.params.id);

        if (isNaN(notificationId)) {
          return res.status(400).json({ message: "Invalid notification ID" });
        }

        // Verify the notification belongs to the user
        const notifications = await storage.getNotificationsForUser(user.id);
        const notification = notifications.find((n) => n.id === notificationId);

        if (!notification) {
          return res.status(404).json({ message: "Notification not found" });
        }

        const success = await storage.markNotificationAsRead(notificationId);

        if (success) {
          res.json({ success: true });
        } else {
          res
            .status(500)
            .json({ message: "Failed to mark notification as read" });
        }
      } catch (error) {
        console.error("Error marking notification as read:", error);
        res
          .status(500)
          .json({ message: "Failed to mark notification as read" });
      }
    }
  );

  // End a unit assignment (mark as deleted with end date)
  app.delete(
    "/api/users/:userId/unit-assignments/:assignmentId",
    isAuthenticated,
    async (req, res) => {
      const userId = parseInt(req.params.userId);
      const assignmentId = parseInt(req.params.assignmentId);

      if (isNaN(userId) || isNaN(assignmentId)) {
        return res
          .status(400)
          .json({ message: "Invalid user ID or assignment ID" });
      }

      try {
        // Verify the assignment exists and belongs to the user
        const assignments = await storage.getUserUnitAssignments(userId);
        const assignmentToEnd = assignments.find((a) => a.id === assignmentId);

        if (!assignmentToEnd) {
          return res.status(404).json({ message: "Assignment not found" });
        }

        // Check if this is a PRIMARY assignment
        if (assignmentToEnd.assignmentType === "PRIMARY") {
          // Find if there's another assignment that could become the primary
          const potentialNewPrimary = assignments.find(
            (a) => a.id !== assignmentId && a.assignmentType !== "PRIMARY"
          );

          if (potentialNewPrimary) {
            // Promote another assignment to PRIMARY
            await storage.updateUserUnitAssignment(potentialNewPrimary.id, {
              assignmentType: "PRIMARY",
            });

            // Update the legacy unitId field on the user record
            await storage.updateUser(userId, {
              unitId: potentialNewPrimary.unitId,
            });
          }
        }

        // Mark the assignment as ended by setting an end date
        const updated = await storage.updateUserUnitAssignment(assignmentId, {
          endDate: new Date(),
        });

        if (!updated) {
          return res.status(500).json({ message: "Failed to end assignment" });
        }

        // Log the action
        logAudit(
          (req.user as any).id,
          "end_unit_assignment",
          {
            userId,
            assignmentId,
            unitId: assignmentToEnd.unitId,
          },
          req.ip
        );

        return res.json({
          success: true,
          message: "Assignment ended successfully",
        });
      } catch (error) {
        console.error("Error ending unit assignment:", error);
        return res
          .status(500)
          .json({ message: "Failed to end unit assignment" });
      }
    }
  );

  // Endpoint to reassign a user to a different unit (PATCH version)
  app.patch("/api/users/:userId/unit", isAuthenticated, async (req, res) => {
    // Enable detailed logging for debugging
    console.log("🔶 User reassignment request received:", {
      userId: req.params.userId,
      requestBody: req.body,
      currentUser: (req.user as any)?.username,
    });

    // Add direct SQL logging for debugging
    console.log("SQL debugging enabled for this request");
    try {
      const userId = parseInt(req.params.userId);
      const { unitId } = req.body;

      if (isNaN(userId) || !unitId) {
        return res.status(400).json({ message: "Invalid user ID or unit ID" });
      }

      console.log(`Reassigning user ${userId} to unit ${unitId}`);

      // Get the user and verify they exist
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get the target unit and verify it exists
      const targetUnit = await storage.getUnit(unitId);
      if (!targetUnit) {
        return res.status(404).json({ message: "Target unit not found" });
      }

      // Get the current user's unit to check permissions
      const currentUserUnit = await storage.getUnit((req.user as any).unitId);
      if (!currentUserUnit) {
        return res
          .status(403)
          .json({ message: "Unable to verify permissions" });
      }

      // Verify that the current user has permission to manage this user
      // This means either:
      // 1. The current user is an admin
      // 2. The user being reassigned is in a unit that is subordinate to the current user's unit
      // 3. The target unit is subordinate to the current user's unit
      if ((req.user as any).role !== "admin") {
        const accessibleUsers = await getAccessibleUsers((req.user as any).id);
        const accessibleUnits = await getAccessibleUnits((req.user as any).id);

        const canManageUser = accessibleUsers.some((u) => u.id === userId);
        const canManageTargetUnit = accessibleUnits.some(
          (u) => u.id === unitId
        );

        if (!canManageUser || !canManageTargetUnit) {
          return res.status(403).json({
            message: "You do not have permission to reassign this user",
          });
        }
      }

      // Update the user's unit
      const updatedUser = await storage.updateUser(userId, { unitId });

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user" });
      }

      // Log the action
      logAudit(
        (req.user as any).id,
        "reassign_user",
        {
          userId,
          oldUnitId: user.unitId,
          newUnitId: unitId,
        },
        req.ip
      );

      res.json(sanitizeUser(updatedUser));
    } catch (error) {
      console.error("Error reassigning user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Alternative endpoint for user reassignment (POST version)
  app.post("/api/users/:userId/reassign", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { unitId } = req.body;

      if (isNaN(userId) || !unitId) {
        return res.status(400).json({ message: "Invalid user ID or unit ID" });
      }

      console.log(
        `Reassigning user ${userId} to unit ${unitId} (POST endpoint)`
      );

      // Get the user and verify they exist
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get the target unit and verify it exists
      const targetUnit = await storage.getUnit(unitId);
      if (!targetUnit) {
        return res.status(404).json({ message: "Target unit not found" });
      }

      // Get the current user's unit to check permissions
      const currentUserUnit = await storage.getUnit((req.user as any).unitId);
      if (!currentUserUnit) {
        return res
          .status(403)
          .json({ message: "Unable to verify permissions" });
      }

      // Verify that the current user has permission to manage this user
      // This means either:
      // 1. The current user is an admin
      // 2. The user being reassigned is in a unit that is subordinate to the current user's unit
      // 3. The target unit is subordinate to the current user's unit
      if ((req.user as any).role !== "admin") {
        const accessibleUsers = await getAccessibleUsers((req.user as any).id);
        const accessibleUnits = await getAccessibleUnits((req.user as any).id);

        const canManageUser = accessibleUsers.some((u) => u.id === userId);
        const canManageTargetUnit = accessibleUnits.some(
          (u) => u.id === unitId
        );

        if (!canManageUser || !canManageTargetUnit) {
          return res.status(403).json({
            message: "You do not have permission to reassign this user",
          });
        }
      }

      // Update the user's unit
      const updatedUser = await storage.updateUser(userId, { unitId });

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user" });
      }

      // Log the action
      logAudit(
        (req.user as any).id,
        "reassign_user",
        {
          userId,
          oldUnitId: user.unitId,
          newUnitId: unitId,
        },
        req.ip
      );

      console.log(
        `Successfully reassigned user ${userId} from unit ${user.unitId} to unit ${unitId}`
      );

      res.json(sanitizeUser(updatedUser));
    } catch (error) {
      console.error("Error reassigning user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get hierarchy constants (roles, unit levels, hierarchy)
  app.get("/api/hierarchy/constants", isAuthenticated, async (req, res) => {
    try {
      res.json({
        roles: MilitaryRoles,
        unitLevels: UnitLevels,
        hierarchy: MilitaryHierarchy,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get accessible units based on military hierarchy
  app.get(
    "/api/hierarchy/accessible-units",
    isAuthenticated,
    async (req, res) => {
      try {
        console.log("Getting accessible units for user:", (req.user as any).id);
        // For admin users, return all units without the complex permission checks
        if ((req.user as any).role === "admin") {
          const units = await storage.getAllUnits();
          console.log(`Admin user - returning all ${units.length} units`);
          return res.json(units);
        }

        const units = await getAccessibleUnits((req.user as any).id);
        console.log(`Found ${units.length} accessible units`);
        res.json(units);
      } catch (error) {
        console.error("Error getting accessible units:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Get accessible users based on military hierarchy
  app.get(
    "/api/hierarchy/accessible-users",
    isAuthenticated,
    async (req, res) => {
      try {
        // For admin users, return all users
        if ((req.user as any).role === "admin") {
          const users = await storage.getAllUsers();
          return res.json(users.map(sanitizeUser));
        }

        const users = await getAccessibleUsers((req.user as any).id);
        res.json(users.map(sanitizeUser));
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Event routes
  app.get("/api/events", isAuthenticated, async (req, res) => {
    try {
      console.log("Getting all events for user:", (req.user as any).id);

      // For admin users, return all events without filtering
      if ((req.user as any).role === "admin") {
        const allEvents = await storage.getAllEvents();
        console.log(`Admin user - returning all ${allEvents.length} events`);
        return res.json(allEvents);
      }

      // For regular users, get events for the user's unit
      const unitEvents = await storage.getEventsByUnit(
        (req.user as any).unitId
      );
      console.log(`Found ${unitEvents.length} unit events`);

      // Get events user is participating in
      const participatingEvents = await storage.getEventsByUserParticipation(
        (req.user as any).id
      );
      console.log(`Found ${participatingEvents.length} participation events`);

      // Combine and remove duplicates
      const allEvents = [...unitEvents, ...participatingEvents];
      const uniqueEvents = allEvents.filter(
        (event, index, self) =>
          index === self.findIndex((e) => e.id === event.id)
      );

      console.log(`Returning ${uniqueEvents.length} total unique events`);
      res.json(uniqueEvents);
    } catch (error) {
      console.error("Error getting all events:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get a single event by ID
  app.get("/api/events/:id", isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      console.log(`Getting event by ID: ${eventId}`);

      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      const event = await storage.getEvent(eventId);

      if (!event) {
        console.log(`Event with ID ${eventId} not found`);
        return res.status(404).json({ message: "Event not found" });
      }

      console.log(`Found event: ${event.title}`);
      res.json(event);
    } catch (error) {
      console.error(`Error getting event by ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get AARs for an event
  app.get("/api/events/:id/aars", isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);

      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const eventAARs = await storage.getAARsByEvent(eventId);
      res.json(eventAARs);
    } catch (error) {
      console.error("Error getting AARs for event:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GreenBookAAR Analysis of AARs for a specific event
  app.get("/api/events/:id/analysis", isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);

      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      // Get the event
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Get all AARs for this event
      const aars = await storage.getAARsByEvent(eventId);

      if (aars.length === 0) {
        return res.json({
          trends: [
            {
              category: "No Data",
              description:
                "No After Action Reviews have been submitted for this event yet. Submit AARs to enable GreenBookAAR analysis.",
              frequency: 0,
              severity: "Medium",
            },
          ],
          frictionPoints: [],
          recommendations: [],
        });
      }

      // Use Venice AI service to generate analysis
      const analysis = await veniceAIService.generateAnalysis(aars);

      // Log the audit event
      await logAudit(
        req.user.id,
        "GENERATE_AAR_ANALYSIS",
        { eventId, eventTitle: event.title, numAARs: aars.length },
        req.ip
      );

      res.json(analysis);
    } catch (error) {
      console.error("Error generating AAR analysis:", error);
      res.status(500).json({
        message: "Server error generating analysis",
        trends: [
          {
            category: "Analysis Error",
            description:
              "There was an error generating the analysis. Please try again later.",
            frequency: 0,
            severity: "Medium",
          },
        ],
        frictionPoints: [],
        recommendations: [],
      });
    }
  });

  // Add participants to an existing event
  app.post(
    "/api/events/:id/add-participants",
    isAuthenticated,
    async (req, res) => {
      try {
        const eventId = parseInt(req.params.id);

        if (isNaN(eventId)) {
          return res.status(400).json({ message: "Invalid event ID" });
        }

        // Get the event
        const event = await storage.getEvent(eventId);
        if (!event) {
          return res.status(404).json({ message: "Event not found" });
        }

        // Process participant IDs from string or array
        let participantIds: number[] = [];

        if (req.body.participantIds) {
          if (Array.isArray(req.body.participantIds)) {
            participantIds = req.body.participantIds;
          } else if (typeof req.body.participantIds === "string") {
            participantIds = req.body.participantIds
              .split(",")
              .map((id: string) => parseInt(id.trim()))
              .filter((id: number) => !isNaN(id));
          }
        }

        if (participantIds.length === 0) {
          return res
            .status(400)
            .json({ message: "No valid participant IDs provided" });
        }

        // Get the existing participants
        const existingParticipants = Array.isArray(event.participants)
          ? event.participants
          : [];

        // Find only the new participants (those not already in the event)
        const newParticipants = participantIds.filter(
          (id) => !existingParticipants.includes(id)
        );

        if (newParticipants.length === 0) {
          return res.status(200).json({
            message: "All participants are already assigned to this event",
            event,
          });
        }

        // Add the participants to the event
        const updatedEvent = await storage.addParticipantsToEvent(
          eventId,
          participantIds
        );

        if (!updatedEvent) {
          return res
            .status(500)
            .json({ message: "Failed to add participants to event" });
        }

        // Send notifications to new participants
        try {
          const creator = req.user as any;

          // Get the event creator's name for the notification
          const creatorName = creator.name || creator.username;

          // Format the event date for display
          const eventDate = new Date(event.date);
          const formattedDate = eventDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });

          // Create notifications for each new participant
          const notificationPromises = newParticipants.map(
            async (participantId: number) => {
              // Create notification
              return await storage.createNotification({
                userId: participantId,
                title: "Added to Event",
                message: `You've been added as a participant in "${event.title}" on ${formattedDate} by ${creatorName}.`,
                type: "event_assignment",
                relatedEntityId: event.id,
                relatedEntityType: "event",
              });
            }
          );

          // Wait for all notifications to be created
          await Promise.all(notificationPromises);

          console.log(
            `Sent notifications to ${notificationPromises.length} new participants for event ${event.id}`
          );
        } catch (notificationError) {
          // Log the error but don't fail the overall operation
          console.error(
            "Error sending participant notifications:",
            notificationError
          );
        }

        // Log the action
        logAudit(
          (req.user as any).id,
          "add_participants_to_event",
          {
            eventId: event.id,
            addedParticipants: newParticipants,
          },
          req.ip
        );

        return res.json(updatedEvent);
      } catch (error) {
        console.error("Error adding participants to event:", error);
        return res
          .status(500)
          .json({ message: "Error adding participants to event" });
      }
    }
  );

  // Add a unit to an existing event
  app.post("/api/events/:id/add-unit", isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);

      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      // Get the event
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Get unit ID from request body
      const unitId = parseInt(req.body.unitId);
      if (isNaN(unitId)) {
        return res.status(400).json({ message: "Invalid unit ID" });
      }

      // Verify the unit exists
      const unit = await storage.getUnit(unitId);
      if (!unit) {
        return res.status(404).json({ message: "Unit not found" });
      }

      // Add the unit to the event
      const updatedEvent = await storage.addUnitToEvent(eventId, unitId);

      if (!updatedEvent) {
        return res.status(500).json({ message: "Failed to add unit to event" });
      }

      // Log the action
      logAudit(
        (req.user as any).id,
        "add_unit_to_event",
        {
          eventId: event.id,
          unitId: unit.id,
        },
        req.ip
      );

      return res.json(updatedEvent);
    } catch (error) {
      console.error("Error adding unit to event:", error);
      return res.status(500).json({ message: "Error adding unit to event" });
    }
  });

  // Update an event
  app.patch("/api/events/:id", isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);

      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      // Verify the event exists
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Only allow admins or users who created the event to update it
      const user = req.user as any;
      if (user.role !== "admin" && event.createdBy !== user.id) {
        return res
          .status(403)
          .json({ message: "Unauthorized to update this event" });
      }

      // Process dates for the update
      const updateData = { ...req.body };

      // Handle step dates conversion
      const dateFields = [
        "date",
        "endDate",
        "step1Date",
        "step2Date",
        "step3Date",
        "step4Date",
        "step5Date",
        "step6Date",
        "step7Date",
        "step8Date",
      ];

      for (const field of dateFields) {
        if (field in updateData && updateData[field]) {
          updateData[field] = new Date(updateData[field]);
        }
      }

      // Update the event
      const updatedEvent = await storage.updateEvent(eventId, updateData);

      if (!updatedEvent) {
        return res.status(500).json({ message: "Failed to update event" });
      }

      res.json(updatedEvent);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete an event (soft delete)
  app.delete("/api/events/:id", isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);

      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      // Verify the event exists
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Only allow admins or users who created the event to delete it
      const user = req.user as any;
      if (user.role !== "admin" && event.createdBy !== user.id) {
        return res
          .status(403)
          .json({ message: "Unauthorized to delete this event" });
      }

      // Perform the soft delete
      const success = await storage.softDeleteEvent(eventId);

      if (success) {
        // Log the action
        logAudit(user.id, "delete_event", { eventId }, req.ip);

        return res.status(200).json({ message: "Event deleted successfully" });
      } else {
        return res.status(500).json({ message: "Failed to delete event" });
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // AAR routes

  // Generate AI Analysis for a specific event's AARs
  app.get("/api/events/:eventId/analyze", isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);

      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      // Get the event
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Get all AARs for this event
      const eventAARs = await storage.getAARsByEvent(eventId);

      if (!eventAARs || eventAARs.length === 0) {
        return res.status(404).json({
          message: "No AARs found for this event",
          analysis: {
            trends: [
              {
                category: "No Data Available",
                description:
                  "There are no AARs submitted for this event yet. AI analysis requires submitted AARs to generate insights.",
                frequency: 0,
                severity: "Low",
              },
            ],
            frictionPoints: [],
            recommendations: [],
          },
        });
      }

      // Use OpenAI service

      // Generate analysis
      const analysis = await openaiService.generateAnalysis(eventAARs);

      // Log the activity
      logAudit(
        (req.user as any).id,
        "generate_event_analysis",
        { eventId, aarCount: eventAARs.length },
        req.ip
      );

      return res.json(analysis);
    } catch (error) {
      console.error("Error generating event analysis:", error);
      return res.status(500).json({ message: "Failed to generate analysis" });
    }
  });

  // Get all AARs accessible to the current user based on hierarchy
  app.get("/api/aars/accessible", isAuthenticated, async (req, res) => {
    try {
      // Get the user from the request
      const user = req.user as any;

      // Get all units the user has access to based on hierarchy
      const accessibleUnits = await getAccessibleUnits(user.id);
      const accessibleUnitIds = accessibleUnits.map((unit) => unit.id);

      // If the user doesn't have access to any units, return an empty array
      if (accessibleUnitIds.length === 0) {
        return res.json([]);
      }

      // Get AARs for all accessible units
      const allAARs = [];
      for (const unitId of accessibleUnitIds) {
        const unitAARs = await storage.getAARsByUnit(unitId);
        allAARs.push(...unitAARs);
      }

      // Also get AARs for events the user has participated in
      const participatedEvents = await storage.getEventsByUserParticipation(
        user.id
      );
      const eventIds = participatedEvents.map((event) => event.id);

      // Get AARs for these events if they're not already included
      for (const eventId of eventIds) {
        const eventAARs = await storage.getAARsByEvent(eventId);

        // Only add AARs that aren't already in the list
        for (const aar of eventAARs) {
          if (!allAARs.some((existingAAR) => existingAAR.id === aar.id)) {
            allAARs.push(aar);
          }
        }
      }

      // Get AARs created by the user if they're not already included
      const userAARs = await storage.getAARsByUser(user.id);
      for (const aar of userAARs) {
        if (!allAARs.some((existingAAR) => existingAAR.id === aar.id)) {
          allAARs.push(aar);
        }
      }

      // Remove any duplicate AARs and return
      const uniqueAARs = Array.from(
        new Map(allAARs.map((aar) => [aar.id, aar])).values()
      );
      return res.json(uniqueAARs);
    } catch (error) {
      console.error("Error fetching accessible AARs:", error);
      return res.status(500).json({ message: "Failed to fetch AARs" });
    }
  });

  // Get all AARs for a specific event with hierarchical access control
  app.get("/api/aars/event/:eventId", isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      // Get the user from the request
      const user = req.user as any;

      // Get the event to check permissions
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check if user has access to this event based on unit hierarchy
      const accessibleUnits = await getAccessibleUnits(user.id);
      const accessibleUnitIds = accessibleUnits.map((unit) => unit.id);

      // User has access if:
      // 1. The event's unit is in their accessible units
      // 2. They participated in the event
      // 3. Their unit is in the participating units
      const hasUnitAccess = accessibleUnitIds.includes(event.unitId);
      const isParticipant =
        Array.isArray(event.participants) &&
        event.participants.includes(user.id);
      const unitParticipated =
        Array.isArray(event.participatingUnits) &&
        event.participatingUnits.some((unitId: number) =>
          accessibleUnitIds.includes(unitId)
        );

      if (!hasUnitAccess && !isParticipant && !unitParticipated) {
        return res
          .status(403)
          .json({ message: "You do not have access to AARs for this event" });
      }

      // Get all AARs for this event
      const aars = await storage.getAARsByEvent(eventId);
      return res.json(aars);
    } catch (error) {
      console.error("Error fetching event AARs:", error);
      return res.status(500).json({ message: "Failed to fetch event AARs" });
    }
  });

  // Get a single AAR by ID
  // Get AAR by ID with hierarchical access control
  app.get("/api/aars/:id", isAuthenticated, async (req, res) => {
    try {
      const aarId = parseInt(req.params.id);

      if (isNaN(aarId)) {
        return res.status(400).json({ message: "Invalid AAR ID" });
      }

      // Get the user from the request
      const user = req.user as any;

      // Get the AAR to check permissions
      const aar = await storage.getAAR(aarId);
      if (!aar) {
        return res.status(404).json({ message: "AAR not found" });
      }

      // Check if user created this AAR
      if (aar.createdBy === user.id) {
        return res.json(aar);
      }

      // Get the event to check permissions
      const event = await storage.getEvent(aar.eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check if user has access to this event based on unit hierarchy
      const accessibleUnits = await getAccessibleUnits(user.id);
      const accessibleUnitIds = accessibleUnits.map((unit) => unit.id);

      // User has access if:
      // 1. The AAR's unit is in their accessible units
      // 2. They participated in the event
      // 3. Their unit is in the participating units
      const hasUnitAccess = accessibleUnitIds.includes(aar.unitId);
      const isParticipant =
        Array.isArray(event.participants) &&
        event.participants.includes(user.id);
      const unitParticipated =
        Array.isArray(event.participatingUnits) &&
        event.participatingUnits.some((unitId: number) =>
          accessibleUnitIds.includes(unitId)
        );

      if (!hasUnitAccess && !isParticipant && !unitParticipated) {
        return res
          .status(403)
          .json({ message: "You do not have access to this AAR" });
      }

      res.json(aar);
    } catch (error) {
      console.error("Error getting AAR:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete an AAR (soft delete)
  app.delete("/api/aars/:id", isAuthenticated, async (req, res) => {
    try {
      const aarId = parseInt(req.params.id);

      if (isNaN(aarId)) {
        return res.status(400).json({ message: "Invalid AAR ID" });
      }

      // Verify the AAR exists
      const aar = await storage.getAAR(aarId);
      if (!aar) {
        return res.status(404).json({ message: "AAR not found" });
      }

      // Only allow admins or users who created the AAR to delete it
      const user = req.user as any;
      if (user.role !== "admin" && aar.createdBy !== user.id) {
        return res
          .status(403)
          .json({ message: "Unauthorized to delete this AAR" });
      }

      // Perform the soft delete
      const success = await storage.softDeleteAAR(aarId);

      if (success) {
        // Log the action
        logAudit(user.id, "delete_aar", { aarId }, req.ip);

        return res.status(200).json({ message: "AAR deleted successfully" });
      } else {
        return res.status(500).json({ message: "Failed to delete AAR" });
      }
    } catch (error) {
      console.error("Error deleting AAR:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create a new AAR
  app.post("/api/aars", isAuthenticated, async (req, res) => {
    try {
      console.log("Creating AAR with data:", req.body);

      // Verify the event exists
      const eventId = parseInt(req.body.eventId);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Create AAR data
      const aarData = {
        eventId: eventId,
        unitId: (req.user as any).unitId,
        createdBy: (req.user as any).id,
        sustainItems: req.body.sustainItems || [],
        improveItems: req.body.improveItems || [],
        actionItems: req.body.actionItems || [],
      };

      console.log("Processed AAR data:", aarData);

      // Create the AAR
      const aar = await storage.createAAR(aarData);
      console.log("Created AAR:", aar);

      // Log the action
      logAudit(
        (req.user as any).id,
        "create_aar",
        { aarId: aar.id, eventId: eventId },
        req.ip
      );

      res.status(201).json(aar);
    } catch (error) {
      console.error("Error creating AAR:", error);
      res.status(500).json({ message: "Error creating AAR" });
    }
  });

  // Get AARs by user
  app.get("/api/aars", isAuthenticated, async (req, res) => {
    try {
      const userAARs = await storage.getAARsByUser((req.user as any).id);
      res.json(userAARs);
    } catch (error) {
      console.error("Error getting user AARs:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get AARs by unit ID
  app.get("/api/units/:id/aars", isAuthenticated, async (req, res) => {
    try {
      const unitId = parseInt(req.params.id);

      if (isNaN(unitId)) {
        return res.status(400).json({ message: "Invalid unit ID" });
      }

      const unitAARs = await storage.getAARsByUnit(unitId);
      console.log(`Found ${unitAARs.length} AARs for unit ${unitId}`);
      res.json(unitAARs);
    } catch (error) {
      console.error("Error getting unit AARs:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get AARs that are accessible to the current user through unit hierarchy
  app.get("/api/aars/accessible", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;

      // Get all units that the user has access to based on hierarchy
      const accessibleUnits = await getAccessibleUnits(user.id);
      const accessibleUnitIds = accessibleUnits.map((unit) => unit.id);

      // Get AARs for all accessible units
      let allAARs = [];
      for (const unitId of accessibleUnitIds) {
        const unitAARs = await storage.getAARsByUnit(unitId);
        allAARs = [...allAARs, ...unitAARs];
      }

      // Get AARs created by the user (in case they're not in their accessible units)
      const userAARs = await storage.getAARsByUser(user.id);

      // Combine both sets, removing duplicates
      const combinedAARs = [...allAARs];
      for (const userAAR of userAARs) {
        if (!combinedAARs.some((aar) => aar.id === userAAR.id)) {
          combinedAARs.push(userAAR);
        }
      }

      // Get AARs for events where the user was a participant
      const userEvents = await storage.getEventsByUserParticipation(user.id);
      for (const event of userEvents) {
        const eventAARs = await storage.getAARsByEvent(event.id);
        for (const eventAAR of eventAARs) {
          if (!combinedAARs.some((aar) => aar.id === eventAAR.id)) {
            combinedAARs.push(eventAAR);
          }
        }
      }

      // If user is an admin, give them all AARs
      if (user.role === "admin") {
        // Get all units
        const allUnits = await storage.getAllUnits();

        // Get AARs for all units
        for (const unit of allUnits) {
          const unitAARs = await storage.getAARsByUnit(unit.id);
          for (const unitAAR of unitAARs) {
            if (!combinedAARs.some((aar) => aar.id === unitAAR.id)) {
              combinedAARs.push(unitAAR);
            }
          }
        }
      }

      res.json(combinedAARs);
    } catch (error) {
      console.error("Error fetching accessible AARs:", error);
      return res.status(500).json({ message: "Failed to fetch AARs" });
    }
  });

  // Create new event
  app.post("/api/events", isAuthenticated, async (req, res) => {
    try {
      console.log("Creating event with data:", req.body);

      // Process participants from string or array input
      let participants: number[] = [];
      if (req.body.participants) {
        if (Array.isArray(req.body.participants)) {
          participants = req.body.participants;
        } else if (typeof req.body.participants === "string") {
          participants = req.body.participants
            .split(",")
            .map((id: string) => parseInt(id.trim()))
            .filter((id: number) => !isNaN(id));
        }
      }

      // Always include the current user as a participant
      if (!participants.includes((req.user as any).id)) {
        participants.push((req.user as any).id);
      }

      // Process participating units
      let participatingUnits: number[] = [];
      if (req.body.participatingUnits) {
        if (Array.isArray(req.body.participatingUnits)) {
          participatingUnits = req.body.participatingUnits;
        } else if (typeof req.body.participatingUnits === "string") {
          participatingUnits = req.body.participatingUnits
            .split(",")
            .map((id: string) => parseInt(id.trim()))
            .filter((id: number) => !isNaN(id));
        }
      }

      // Create event object with proper typing
      const eventData = {
        title: req.body.title,
        unitId: req.body.unitId || (req.user as any).unitId,
        createdBy: (req.user as any).id,
        step: parseInt(req.body.step || "1"),
        date: new Date(req.body.date),
        isMultiDayEvent: req.body.isMultiDayEvent === true,
        endDate: req.body.endDate ? new Date(req.body.endDate) : null,
        location: req.body.location,
        objectives: req.body.objectives,
        missionStatement: req.body.missionStatement || null,
        conceptOfOperation: req.body.conceptOfOperation || null,
        resources: req.body.resources || "",
        eventType: req.body.eventType || "training",
        participants: participants,
        participatingUnits: participatingUnits,
        notifyParticipants: req.body.notifyParticipants === true,
        // Step notes
        step1Notes: req.body.step1Notes || null,
        step2Notes: req.body.step2Notes || null,
        step3Notes: req.body.step3Notes || null,
        step4Notes: req.body.step4Notes || null,
        step5Notes: req.body.step5Notes || null,
        step6Notes: req.body.step6Notes || null,
        step7Notes: req.body.step7Notes || null,
        step8Notes: req.body.step8Notes || null,
        // Step dates
        step1Date: req.body.step1Date ? new Date(req.body.step1Date) : null,
        step2Date: req.body.step2Date ? new Date(req.body.step2Date) : null,
        step3Date: req.body.step3Date ? new Date(req.body.step3Date) : null,
        step4Date: req.body.step4Date ? new Date(req.body.step4Date) : null,
        step5Date: req.body.step5Date ? new Date(req.body.step5Date) : null,
        step6Date: req.body.step6Date ? new Date(req.body.step6Date) : null,
        step7Date: req.body.step7Date ? new Date(req.body.step7Date) : null,
        step8Date: req.body.step8Date ? new Date(req.body.step8Date) : null,
      };

      console.log("Processed event data:", eventData);

      // Create the event directly
      const event = await storage.createEvent(eventData);
      console.log("Created event:", event);

      // Log the action
      logAudit(
        (req.user as any).id,
        "create_event",
        { eventId: event.id },
        req.ip
      );

      // Notify participants if the flag is set
      if (
        eventData.notifyParticipants &&
        event.participants &&
        event.participants.length > 0
      ) {
        try {
          const creator = req.user as any;

          // Get the event creator's name for the notification
          const creatorName = creator.name || creator.username;

          // Format the event date for display
          const eventDate = new Date(event.date);
          const formattedDate = eventDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });

          // Create notifications for each participant (except the creator)
          const participantPromises = event.participants
            .filter((id) => id !== creator.id) // Don't notify the creator
            .map(async (participantId: number) => {
              // Create notification
              return await storage.createNotification({
                userId: participantId,
                title: "New Event Assignment",
                message: `You've been assigned as a participant in "${event.title}" on ${formattedDate} by ${creatorName}.`,
                type: "event_assignment",
                relatedEntityId: event.id,
                relatedEntityType: "event",
              });
            });

          // Wait for all notifications to be created
          await Promise.all(participantPromises);

          console.log(
            `Sent notifications to ${participantPromises.length} participants for event ${event.id}`
          );
        } catch (notificationError) {
          // Log the error but don't fail the event creation
          console.error(
            "Error sending participant notifications:",
            notificationError
          );
        }
      }

      res.status(201).json(event);
    } catch (error) {
      console.error("Event creation error:", error);
      res.status(500).json({ message: "Error creating event" });
    }
  });

  // Unit routes

  // Get unit by referral code
  app.get("/api/units/referral/:code", async (req, res) => {
    try {
      const code = req.params.code;

      if (!code) {
        return res.status(400).json({ message: "Referral code is required" });
      }

      console.log(`Looking up unit by referral code: ${code}`);
      const unit = await storage.getUnitByReferralCode(code);

      if (!unit) {
        console.log(`No unit found with referral code: ${code}`);
        return res
          .status(404)
          .json({ message: "Unit not found with that referral code" });
      }

      console.log(`Found unit with referral code: ${unit.name}`);
      res.json(unit);
    } catch (error) {
      console.error("Error getting unit by referral code:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/units", isAuthenticated, async (req, res) => {
    try {
      console.log("Creating unit with data:", req.body);

      // Generate referral code
      const referralCode = nanoid(8);

      // Add extra fields
      const unitData = {
        ...req.body,
        referralCode,
      };

      console.log("Processed unit data:", unitData);

      // Create the unit
      const unit = await storage.createUnit(unitData);
      console.log("Created unit:", unit);

      // Log the action
      logAudit(
        (req.user as any).id,
        "create_unit",
        { unitId: unit.id },
        req.ip
      );

      res.status(201).json(unit);
    } catch (error) {
      console.error("Unit creation error:", error);
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ message: "Invalid unit data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error creating unit" });
      }
    }
  });

  // Update a unit's details (including parent unit assignment)
  app.patch("/api/units/:id", isAuthenticated, async (req, res) => {
    try {
      const unitId = parseInt(req.params.id);

      if (isNaN(unitId)) {
        return res.status(400).json({ message: "Invalid unit ID" });
      }

      // Only admins or unit leaders can update unit details
      if ((req.user as any).role !== "admin") {
        // Get the unit's leaders
        const unitLeaders = await storage.getUnitLeaders(unitId);
        const leaderIds = unitLeaders.map((leader) => leader.id);

        // Check if current user is a leader of this unit
        if (!leaderIds.includes((req.user as any).id)) {
          return res.status(403).json({
            message: "You do not have permission to update this unit",
          });
        }
      }

      // Get the existing unit
      const existingUnit = await storage.getUnit(unitId);
      if (!existingUnit) {
        return res.status(404).json({ message: "Unit not found" });
      }

      // Extract allowed update fields
      const { name, unitLevel, parentId } = req.body;

      // Validate parentId if provided
      if (parentId !== undefined && parentId !== null) {
        // Convert to number
        const parentIdNum = Number(parentId);

        // Check for circular reference - a unit cannot be its own parent
        if (parentIdNum === unitId) {
          return res
            .status(400)
            .json({ message: "A unit cannot be its own parent" });
        }

        // Get the parent unit to make sure it exists
        const parentUnit = await storage.getUnit(parentIdNum);
        if (!parentUnit) {
          return res.status(400).json({ message: "Parent unit not found" });
        }

        // Validate unit hierarchy - parent should be higher level
        const unitLevelHierarchy = {
          Team: 1,
          Squad: 2,
          Section: 3,
          Platoon: 4,
          Company: 5,
          Battalion: 6,
          Brigade: 7,
          Division: 8,
        };

        const unitLevelToCheck = unitLevel || existingUnit.unitLevel;

        if (
          unitLevelHierarchy[parentUnit.unitLevel] <=
          unitLevelHierarchy[unitLevelToCheck]
        ) {
          return res.status(400).json({
            message:
              "Parent unit must be higher in the hierarchy than the child unit",
          });
        }
      }

      // Create an updates object with only the fields that changed
      const updates: Partial<Unit> = {};
      if (name !== undefined) updates.name = name;
      if (unitLevel !== undefined) updates.unitLevel = unitLevel;
      if (parentId !== undefined)
        updates.parentId = parentId === null ? null : Number(parentId);

      // Only update if there are changes
      if (Object.keys(updates).length === 0) {
        return res.json(existingUnit);
      }

      console.log("Updating unit with data:", updates);

      // Update the unit
      const updatedUnit = await storage.updateUnit(unitId, updates);

      if (!updatedUnit) {
        return res.status(500).json({ message: "Failed to update unit" });
      }

      // Log the update action
      logAudit(
        (req.user as any).id,
        "update_unit",
        { unitId, updates },
        req.ip
      );

      res.json(updatedUnit);
    } catch (error) {
      console.error("Error updating unit:", error);
      res.status(500).json({ message: "Error updating unit" });
    }
  });

  // Venice AI Analysis endpoints

  // Get Venice AI analysis for a unit
  app.get("/api/units/:unitId/analysis", isAuthenticated, async (req, res) => {
    try {
      const { unitId } = req.params;
      const numericUnitId = parseInt(unitId);

      if (isNaN(numericUnitId)) {
        return res.status(400).json({ message: "Invalid unit ID" });
      }

      // Check if user has access to this unit based on military hierarchy
      const user = req.user as any;
      const accessibleUnits = await getAccessibleUnits(user.id);
      const accessibleUnitIds = accessibleUnits.map((unit) => unit.id);

      if (!accessibleUnitIds.includes(numericUnitId) && user.role !== "admin") {
        return res.status(403).json({
          message: "You do not have access to analysis for this unit",
        });
      }

      const analysis = await storage.generateVeniceAnalysis(numericUnitId);
      res.json(analysis);
    } catch (error) {
      console.error("Error generating Venice AI analysis:", error);
      res.status(500).json({ message: "Failed to generate analysis" });
    }
  });

  // Generate Venice AI analysis based on user-provided prompt
  app.post(
    "/api/units/:unitId/prompt-analysis",
    isAuthenticated,
    async (req, res) => {
      try {
        const { unitId } = req.params;
        const { prompt } = req.body;
        const numericUnitId = parseInt(unitId);

        if (isNaN(numericUnitId)) {
          return res.status(400).json({ message: "Invalid unit ID" });
        }

        if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
          return res.status(400).json({ message: "Valid prompt is required" });
        }

        // Check if user has access to this unit based on military hierarchy
        const user = req.user as any;
        const accessibleUnits = await getAccessibleUnits(user.id);
        const accessibleUnitIds = accessibleUnits.map((unit) => unit.id);

        if (
          !accessibleUnitIds.includes(numericUnitId) &&
          user.role !== "admin"
        ) {
          return res.status(403).json({
            message: "You do not have access to analysis for this unit",
          });
        }

        // Generate prompt-based analysis
        const analysis = await storage.generateVenicePromptAnalysis(
          numericUnitId,
          prompt
        );

        // Log the prompt analysis action
        logAudit(
          user.id,
          "venice_prompt_analysis",
          {
            unitId: numericUnitId,
            promptLength: prompt.length,
            prompt: prompt.substring(0, 50) + (prompt.length > 50 ? "..." : ""), // Log a preview of the prompt
          },
          req.ip
        );

        res.json(analysis);
      } catch (error) {
        console.error("Error generating Venice AI prompt analysis:", error);
        res
          .status(500)
          .json({ message: "Failed to generate prompt-based analysis" });
      }
    }
  );

  // Send AAR feedback requests to event participants
  app.post(
    "/api/events/:eventId/request-aar-feedback",
    isAuthenticated,
    async (req, res) => {
      try {
        const { eventId } = req.params;
        const { notifyParticipants } = req.body;
        const numericEventId = parseInt(eventId);

        if (isNaN(numericEventId)) {
          return res.status(400).json({ message: "Invalid event ID" });
        }

        // Get the event details
        const event = await storage.getEvent(numericEventId);

        if (!event) {
          return res.status(404).json({ message: "Event not found" });
        }

        // Check if user has access to this event
        const user = req.user as any;
        const hasAccess =
          event.createdBy === user.id ||
          event.unitId === user.unitId ||
          user.role === "admin";

        if (!hasAccess) {
          return res.status(403).json({
            message:
              "You do not have permission to request feedback for this event",
          });
        }

        // Get list of participants who haven't submitted AARs yet
        const existingAARs = await storage.getAARsByEvent(numericEventId);
        const existingSubmitterIds = new Set(
          existingAARs.map((aar) => aar.createdBy)
        );

        // Filter participants who haven't submitted AARs yet
        const pendingParticipants = (event.participants || []).filter(
          (participantId) => !existingSubmitterIds.has(participantId)
        );

        if (notifyParticipants && pendingParticipants.length > 0) {
          try {
            // Create a notification for each pending participant
            for (const participantId of pendingParticipants) {
              console.log(
                `Creating notification for participant ID: ${participantId}`
              );
              await storage.createNotification({
                userId: participantId,
                title: "AAR Feedback Request",
                message: `You are requested to submit an After-Action Review for the event: ${event.title}. Please visit the Submit AAR page.`,
                type: "aar_request",
                relatedEntityId: event.id,
                relatedEntityType: "event",
              });
              console.log(
                `Successfully created notification for participant ID: ${participantId}`
              );
            }
          } catch (error) {
            console.error("Error creating notifications:", error);
            throw error;
          }

          // Log the AAR request action
          logAudit(
            user.id,
            "request_aar_feedback",
            {
              eventId: numericEventId,
              eventTitle: event.title,
              participantCount: pendingParticipants.length,
            },
            req.ip
          );

          return res.json({
            success: true,
            message: `AAR feedback request sent to ${pendingParticipants.length} participants`,
            notifiedCount: pendingParticipants.length,
          });
        }

        res.json({
          success: true,
          message: "No notifications sent",
          notifiedCount: 0,
        });
      } catch (error) {
        console.error("Error requesting AAR feedback:", error);
        res
          .status(500)
          .json({ message: "Failed to send AAR feedback requests" });
      }
    }
  );

  const httpServer = createServer(app);

  return httpServer;
}
