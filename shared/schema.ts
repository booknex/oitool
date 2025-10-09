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
