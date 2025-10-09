import { type Badge, type Family } from "@shared/schema";

export interface IStorage {
  getBadges(): Promise<Badge[]>;
  unlockBadge(id: number): Promise<Badge>;
  resetBadges(): Promise<void>;
  
  getFamilies(): Promise<Family[]>;
  createFamily(label: string): Promise<Family>;
  deleteFamily(id: string): Promise<void>;
  updateFamily(id: string, label: string): Promise<Family>;
  unlockLevel(familyId: string, levelNumber: number): Promise<Family>;
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
  private families: Map<string, Family>;
  private familyIdCounter: number;

  constructor() {
    this.badges = new Map();
    this.families = new Map();
    this.familyIdCounter = 0;
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

  async getFamilies(): Promise<Family[]> {
    return Array.from(this.families.values());
  }

  async createFamily(label: string): Promise<Family> {
    this.familyIdCounter++;
    const id = `family-${this.familyIdCounter}`;
    
    const newFamily: Family = {
      id,
      label,
      levels: [
        { levelNumber: 1, unlocked: false },
        { levelNumber: 2, unlocked: false },
        { levelNumber: 3, unlocked: false },
        { levelNumber: 4, unlocked: false },
      ],
    };

    this.families.set(id, newFamily);
    return newFamily;
  }

  async deleteFamily(id: string): Promise<void> {
    if (!this.families.has(id)) {
      throw new Error(`Family with id ${id} not found`);
    }
    this.families.delete(id);
  }

  async updateFamily(id: string, label: string): Promise<Family> {
    const family = this.families.get(id);
    if (!family) {
      throw new Error(`Family with id ${id} not found`);
    }

    const updatedFamily: Family = {
      ...family,
      label,
    };

    this.families.set(id, updatedFamily);
    return updatedFamily;
  }

  async unlockLevel(familyId: string, levelNumber: number): Promise<Family> {
    const family = this.families.get(familyId);
    if (!family) {
      throw new Error(`Family with id ${familyId} not found`);
    }

    const updatedLevels = family.levels.map(level => {
      if (level.levelNumber === levelNumber) {
        return {
          ...level,
          unlocked: true,
          unlockedAt: new Date().toISOString(),
        };
      }
      return level;
    });

    const updatedFamily: Family = {
      ...family,
      levels: updatedLevels,
    };

    this.families.set(familyId, updatedFamily);
    return updatedFamily;
  }
}

export const storage = new MemStorage();
