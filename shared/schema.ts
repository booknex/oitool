import { z } from "zod";

export const badgeSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  imageUrl: z.string(),
  unlocked: z.boolean(),
  unlockedAt: z.string().optional(),
});

export const insertBadgeSchema = badgeSchema.omit({ unlocked: true, unlockedAt: true });

export const unlockBadgeSchema = z.object({
  id: z.number(),
});

export type Badge = z.infer<typeof badgeSchema>;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type UnlockBadge = z.infer<typeof unlockBadgeSchema>;

export const levelSchema = z.object({
  levelNumber: z.number().min(1).max(4),
  unlocked: z.boolean(),
  unlockedAt: z.string().optional(),
});

export const familySchema = z.object({
  id: z.string(),
  label: z.string(),
  levels: z.array(levelSchema).length(4),
});

export const insertFamilySchema = z.object({
  label: z.string().min(1).max(100),
});

export const updateFamilySchema = z.object({
  label: z.string().min(1).max(100),
});

export const unlockLevelSchema = z.object({
  familyId: z.string(),
  levelNumber: z.number().min(1).max(4),
});

export type Level = z.infer<typeof levelSchema>;
export type Family = z.infer<typeof familySchema>;
export type InsertFamily = z.infer<typeof insertFamilySchema>;
export type UpdateFamily = z.infer<typeof updateFamilySchema>;
export type UnlockLevel = z.infer<typeof unlockLevelSchema>;
