import { type Badge } from "@shared/schema";

export interface IStorage {
  getBadges(): Promise<Badge[]>;
  unlockBadge(id: number): Promise<Badge>;
  resetBadges(): Promise<void>;
}

const initialBadges: Badge[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  name: `Achievement ${i + 1}`,
  description: `Unlock this badge by clicking on it`,
  imageUrl: "/api/badge-image",
  unlocked: false,
}));

export class MemStorage implements IStorage {
  private badges: Map<number, Badge>;

  constructor() {
    this.badges = new Map();
    initialBadges.forEach(badge => this.badges.set(badge.id, { ...badge }));
  }

  async getBadges(): Promise<Badge[]> {
    return Array.from(this.badges.values());
  }

  async unlockBadge(id: number): Promise<Badge> {
    const badge = this.badges.get(id);
    if (!badge) {
      throw new Error(`Badge with id ${id} not found`);
    }

    const unlockedBadge: Badge = {
      ...badge,
      unlocked: true,
      unlockedAt: new Date().toISOString(),
    };

    this.badges.set(id, unlockedBadge);
    return unlockedBadge;
  }

  async resetBadges(): Promise<void> {
    this.badges.clear();
    initialBadges.forEach(badge => this.badges.set(badge.id, { ...badge }));
  }
}

export const storage = new MemStorage();
