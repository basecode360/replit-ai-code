import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { storage } from "./storage";
import memorystore from "memorystore";
import { User } from "@shared/schema";

// Extend Express User type
declare global {
  namespace Express {
    interface User extends User {}
  }
}

// Configure session middleware
export function setupAuth(app: Express) {
  // Use PostgreSQL session store
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "military-aar-system-secret",
      resave: false,
      saveUninitialized: true,
      cookie: {
        secure: false, // Set to false for both development and production in Replit
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        sameSite: "none", // Allow cross-site cookies for Replit's environment
      },
      store: storage.sessionStore,
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport authentication
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Attempting to authenticate user: ${username}`);
        const user = await storage.getUserByUsername(username);

        if (!user) {
          console.log(`Authentication failed: User not found: ${username}`);
          return done(null, false, {
            message: "Incorrect username or password.",
          });
        }

        // In production, use a proper password comparison method with hashing
        // For demonstration, using direct comparison
        if (user.password !== password) {
          console.log(
            `Authentication failed: Password mismatch for ${username}`
          );
          return done(null, false, {
            message: "Incorrect username or password.",
          });
        }

        console.log(`Authentication successful for ${username}`);
        return done(null, user);
      } catch (err) {
        console.error("Authentication error:", err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    console.log(`Serializing user: ${user.username}, ID: ${user.id}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`Deserializing user ID: ${id}`);
      const user = await storage.getUser(id);
      if (!user) {
        console.log(`Deserialization failed: User with ID ${id} not found`);
        return done(null, false);
      }
      console.log(`Deserialization successful for user: ${user.username}`);
      done(null, user);
    } catch (err) {
      console.error("Deserialization error:", err);
      done(err);
    }
  });

  // Helper function to sanitize user data before sending it to the client
  const sanitizeUser = (user: User) => {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  };

  // Authentication routes

  // Current user
  app.get("/api/auth/me", (req, res) => {
    console.log(`GET /api/auth/me, isAuthenticated: ${req.isAuthenticated()}`);
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(sanitizeUser(req.user as User));
  });

  // Login route
  app.post("/api/auth/login", (req, res, next) => {
    console.log(`Login attempt for username: ${req.body.username}`);

    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }

      if (!user) {
        console.log(`Login failed: ${info?.message || "Unknown error"}`);
        return res
          .status(401)
          .json({ message: info?.message || "Authentication failed" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("Session error during login:", err);
          return next(err);
        }

        console.log(
          `Login successful for user: ${user.username}, role: ${user.role}`
        );
        return res.json(sanitizeUser(user));
      });
    })(req, res, next);
  });

  // Logout route
  app.post("/api/auth/logout", (req, res) => {
    console.log(
      `Logout request for user: ${(req.user as User)?.username || "Unknown"}`
    );
    if (!req.isAuthenticated()) {
      return res.status(200).json({ message: "Not logged in" });
    }

    const username = (req.user as User)?.username;
    req.logout((err) => {
      if (err) {
        console.error("Error during logout:", err);
        return res.status(500).json({ message: "Error during logout" });
      }
      console.log(`Logout successful for user: ${username}`);
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
}

// Middleware to check if user is authenticated
export const isAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
};
