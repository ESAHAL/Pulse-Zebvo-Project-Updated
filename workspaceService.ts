// services/workspaceService.ts
// All workspace CRUD logic separated from API route handlers

import { z } from "zod";
import { db } from "@/lib/db";

// ─── Validation Schemas ────────────────────────────────────────────────────────

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, "Workspace name must be at least 2 characters")
    .max(60, "Workspace name too long"),
  brandName: z.string().max(60, "Brand name too long").optional(),
  brandVoice: z.string().max(500, "Brand voice description too long").optional(),
  industry: z.string().max(100, "Industry too long").optional(),
  description: z.string().max(1000, "Description too long").optional(),
});

export const updateWorkspaceSchema = createWorkspaceSchema.partial();

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

// ─── Result Types ──────────────────────────────────────────────────────────────

type ServiceResult<T = null> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: string };

// ─── Service Methods ───────────────────────────────────────────────────────────

export const workspaceService = {
  /**
   * Get all workspaces for a user, with content count
   */
  async getWorkspacesByUserId(userId: string) {
    try {
      const workspaces = await db.workspace.findMany({
        where: { userId },
        include: {
          _count: { select: { contents: true } },
        },
        orderBy: { updatedAt: "desc" },
      });
      return { success: true as const, data: workspaces };
    } catch (error) {
      console.error("[workspaceService.getWorkspacesByUserId]", error);
      return { success: false as const, error: "Failed to fetch workspaces" };
    }
  },

  /**
   * Get a single workspace, verifying ownership
   */
  async getWorkspaceById(
    workspaceId: string,
    userId: string
  ): Promise<ServiceResult<object>> {
    try {
      const workspace = await db.workspace.findFirst({
        where: { id: workspaceId, userId },
        include: {
          contents: {
            orderBy: { createdAt: "desc" },
          },
          _count: { select: { contents: true } },
        },
      });

      if (!workspace) {
        return { success: false, error: "Workspace not found" };
      }

      return { success: true, data: workspace };
    } catch (error) {
      console.error("[workspaceService.getWorkspaceById]", error);
      return { success: false, error: "Failed to fetch workspace" };
    }
  },

  /**
   * Create a new workspace for a user
   */
  async createWorkspace(
    userId: string,
    input: CreateWorkspaceInput
  ): Promise<ServiceResult<object>> {
    try {
      const validated = createWorkspaceSchema.safeParse(input);
      if (!validated.success) {
        return {
          success: false,
          error: validated.error.errors[0]?.message ?? "Invalid input",
        };
      }

      // Limit workspaces per user (soft limit)
      const count = await db.workspace.count({ where: { userId } });
      if (count >= 20) {
        return { success: false, error: "Maximum workspace limit reached (20)" };
      }

      const workspace = await db.workspace.create({
        data: {
          ...validated.data,
          userId,
        },
      });

      return { success: true, data: workspace };
    } catch (error) {
      console.error("[workspaceService.createWorkspace]", error);
      return { success: false, error: "Failed to create workspace" };
    }
  },

  /**
   * Update a workspace, verifying ownership
   */
  async updateWorkspace(
    workspaceId: string,
    userId: string,
    input: UpdateWorkspaceInput
  ): Promise<ServiceResult<object>> {
    try {
      const validated = updateWorkspaceSchema.safeParse(input);
      if (!validated.success) {
        return {
          success: false,
          error: validated.error.errors[0]?.message ?? "Invalid input",
        };
      }

      const existing = await db.workspace.findFirst({
        where: { id: workspaceId, userId },
        select: { id: true },
      });
      if (!existing) {
        return { success: false, error: "Workspace not found" };
      }

      const workspace = await db.workspace.update({
        where: { id: workspaceId },
        data: validated.data,
      });

      return { success: true, data: workspace };
    } catch (error) {
      console.error("[workspaceService.updateWorkspace]", error);
      return { success: false, error: "Failed to update workspace" };
    }
  },

  /**
   * Delete a workspace and all its contents (cascade handled by Prisma)
   */
  async deleteWorkspace(
    workspaceId: string,
    userId: string
  ): Promise<ServiceResult<{ id: string }>> {
    try {
      const existing = await db.workspace.findFirst({
        where: { id: workspaceId, userId },
        select: { id: true },
      });
      if (!existing) {
        return { success: false, error: "Workspace not found" };
      }

      await db.workspace.delete({ where: { id: workspaceId } });
      return { success: true, data: { id: workspaceId } };
    } catch (error) {
      console.error("[workspaceService.deleteWorkspace]", error);
      return { success: false, error: "Failed to delete workspace" };
    }
  },
};
