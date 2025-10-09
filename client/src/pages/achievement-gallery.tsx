import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Lock, RotateCcw } from "lucide-react";
import { Badge } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";

const TOTAL_BADGES = 12;

const getUnlockedBadges = (): number[] => {
  try {
    const saved = localStorage.getItem("unlockedBadges");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveUnlockedBadges = (ids: number[]) => {
  localStorage.setItem("unlockedBadges", JSON.stringify(ids));
};

export default function AchievementGallery() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [animatingBadge, setAnimatingBadge] = useState<number | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const unlockedIds = getUnlockedBadges();
    
    const initialBadges: Badge[] = Array.from({ length: TOTAL_BADGES }, (_, i) => ({
      id: i + 1,
      name: `Achievement ${i + 1}`,
      description: `Unlock this badge by clicking on it`,
      imageUrl: "/api/badge-image",
      unlocked: unlockedIds.includes(i + 1),
      unlockedAt: unlockedIds.includes(i + 1) ? new Date().toISOString() : undefined,
    }));
    
    setBadges(initialBadges);
  }, []);

  const unlockMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest<Badge>("POST", "/api/badges/unlock", { id });
    },
  });

  const handleUnlock = async (badgeId: number) => {
    const badge = badges.find(b => b.id === badgeId);
    if (badge?.unlocked) return;

    setAnimatingBadge(badgeId);

    setBadges(prev =>
      prev.map(b =>
        b.id === badgeId
          ? { ...b, unlocked: true, unlockedAt: new Date().toISOString() }
          : b
      )
    );

    const currentUnlocked = getUnlockedBadges();
    const newUnlocked = [...new Set([...currentUnlocked, badgeId])];
    saveUnlockedBadges(newUnlocked);

    try {
      await unlockMutation.mutateAsync(badgeId);
    } catch (error) {
      console.error("Failed to unlock badge on server:", error);
      
      setBadges(prev =>
        prev.map(b =>
          b.id === badgeId
            ? { ...b, unlocked: false, unlockedAt: undefined }
            : b
        )
      );
      
      const restored = currentUnlocked.filter(id => id !== badgeId);
      saveUnlockedBadges(restored);
    } finally {
      setTimeout(() => setAnimatingBadge(null), 500);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    
    setBadges(prev =>
      prev.map(b => ({ ...b, unlocked: false, unlockedAt: undefined }))
    );
    saveUnlockedBadges([]);

    try {
      await apiRequest("POST", "/api/badges/reset", {});
    } catch (error) {
      console.error("Failed to reset badges on server:", error);
    } finally {
      setIsResetting(false);
    }
  };

  const unlockedCount = badges.filter(b => b.unlocked).length;
  const progressPercentage = (unlockedCount / TOTAL_BADGES) * 100;

  return (
    <div className="min-h-screen bg-background py-12 md:py-20 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 md:mb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-foreground mb-4">
            Achievement Gallery
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Click on any locked badge to unlock it and watch it transform
          </p>

          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl font-bold text-foreground" data-testid="text-unlock-count">
                {unlockedCount} of {TOTAL_BADGES}
              </span>
              <span className="text-sm text-muted-foreground">Unlocked</span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden" data-testid="progress-bar">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out origin-left"
                style={{ width: `${progressPercentage}%` }}
                data-testid="progress-fill"
              />
            </div>
          </div>

          {unlockedCount > 0 && (
            <div className="mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isResetting}
                data-testid="button-reset"
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset All Badges
              </Button>
            </div>
          )}
        </header>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
          {badges.map((badge) => (
            <button
              key={badge.id}
              onClick={() => handleUnlock(badge.id)}
              disabled={badge.unlocked}
              data-testid={`badge-${badge.id}`}
              className={`
                relative aspect-square rounded-2xl overflow-hidden
                transition-all duration-200 ease-out
                ${badge.unlocked ? "cursor-default" : "cursor-pointer hover:scale-105 active:scale-95"}
                ${animatingBadge === badge.id ? "animate-unlock-pulse" : ""}
              `}
            >
              <img
                src={badge.imageUrl}
                alt={badge.name}
                className={`
                  w-full h-full object-cover
                  transition-all duration-500
                  ${!badge.unlocked ? "grayscale opacity-40" : ""}
                `}
                data-testid={`image-${badge.id}`}
              />

              {badge.unlocked && (
                <div className="absolute inset-0 border-2 border-primary rounded-2xl shadow-lg shadow-primary/20" />
              )}

              {!badge.unlocked && (
                <>
                  <div className="absolute inset-0 border-2 border-gray-700 rounded-2xl" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Lock className="w-12 h-12 md:w-16 md:h-16 text-gray-500" data-testid={`lock-icon-${badge.id}`} />
                  </div>
                </>
              )}

              {badge.unlocked && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-primary/10 animate-glow-pulse rounded-2xl" />
                </div>
              )}
            </button>
          ))}
        </div>

        {unlockedCount === TOTAL_BADGES && (
          <div className="mt-12 text-center" data-testid="completion-message">
            <div className="inline-block px-8 py-4 bg-primary/20 border-2 border-primary rounded-xl">
              <p className="text-2xl font-bold text-primary">
                All Achievements Unlocked!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
