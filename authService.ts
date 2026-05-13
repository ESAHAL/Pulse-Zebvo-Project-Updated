// services/authService.ts
// All authentication business logic lives here — routes are thin wrappers only

import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

// ─── Validation Schemas ────────────────────────────────────────────────────────

export const signupSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name too long"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// ─── Result Types ──────────────────────────────────────────────────────────────

type AuthResult<T = null> =
  | { success: true; user: T; error?: never }
  | { success: false; user?: never; error: string };

type SafeUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: Date;
};

// ─── Service Methods ───────────────────────────────────────────────────────────

export const authService = {
  /**
   * Register a new user. Checks for duplicates and hashes password before saving.
   */
  async createUser(input: SignupInput): Promise<AuthResult<SafeUser>> {
    try {
      // Validate input
      const validated = signupSchema.safeParse(input);
      if (!validated.success) {
        return {
          success: false,
          error: validated.error.errors[0]?.message ?? "Invalid input",
        };
      }

      // Check for existing user
      const existing = await db.user.findUnique({
        where: { email: input.email.toLowerCase() },
        select: { id: true },
      });

      if (existing) {
        return { success: false, error: "An account with this email already exists" };
      }

      // Hash password (cost factor 12 is a good balance)
      const hashedPassword = await bcrypt.hash(input.password, 12);

      // Create user
      const user = await db.user.create({
        data: {
          name: input.name.trim(),
          email: input.email.toLowerCase().trim(),
          password: hashedPassword,
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
        },
      });

      return { success: true, user };
    } catch (error) {
      console.error("[authService.createUser]", error);
      return { success: false, error: "Failed to create account. Please try again." };
    }
  },

  /**
   * Verify credentials for NextAuth authorize callback.
   * Returns a safe user object (no password) on success.
   */
  async verifyCredentials(
    email: string,
    password: string
  ): Promise<AuthResult<SafeUser>> {
    try {
      const user = await db.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          password: true,
          createdAt: true,
        },
      });

      if (!user) {
        // Use consistent timing to prevent user enumeration
        await bcrypt.compare(password, "$2a$12$placeholder.hash.to.prevent.timing");
        return { success: false, error: "Invalid email or password" };
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return { success: false, error: "Invalid email or password" };
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _pwd, ...safeUser } = user;
      return { success: true, user: safeUser };
    } catch (error) {
      console.error("[authService.verifyCredentials]", error);
      return { success: false, error: "Authentication failed. Please try again." };
    }
  },

  /**
   * Get a user by ID without the password field.
   */
  async getUserById(userId: string): Promise<SafeUser | null> {
    try {
      return await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
        },
      });
    } catch (error) {
      console.error("[authService.getUserById]", error);
      return null;
    }
  },
};
