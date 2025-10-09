import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Lock, Plus, Trash2, Edit2, Check, MoreVertical, RotateCcw } from "lucide-react";
import { type Family } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function LevelsGallery() {
  const [animatingLevel, setAnimatingLevel] = useState<string | null>(null);
  const [editingFamily, setEditingFamily] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [newFamilyLabel, setNewFamilyLabel] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: families = [], isLoading } = useQuery<Family[]>({
    queryKey: ["/api/families"],
  });

  const createFamilyMutation = useMutation({
    mutationFn: async (label: string) => {
      return apiRequest("POST", "/api/families", { label });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/families"] });
      setNewFamilyLabel("");
      setIsAddDialogOpen(false);
    },
  });

  const deleteFamilyMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/families/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/families"] });
    },
  });

  const updateFamilyMutation = useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      return apiRequest("PATCH", `/api/families/${id}`, { label });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/families"] });
      setEditingFamily(null);
      setEditLabel("");
    },
  });

  const unlockLevelMutation = useMutation({
    mutationFn: async ({ familyId, levelNumber }: { familyId: string; levelNumber: number }) => {
      return apiRequest("POST", "/api/families/unlock", { familyId, levelNumber });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/families"] });
    },
  });

  const resetFamilyMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/families/${id}/reset`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/families"] });
    },
  });

  const handleUnlockLevel = async (familyId: string, levelNumber: number, isUnlocked: boolean) => {
    if (isUnlocked) return;

    setAnimatingLevel(`${familyId}-${levelNumber}`);

    try {
      await unlockLevelMutation.mutateAsync({ familyId, levelNumber });
    } catch (error) {
      console.error("Failed to unlock level:", error);
    } finally {
      setTimeout(() => setAnimatingLevel(null), 500);
    }
  };

  const handleCreateFamily = async () => {
    if (!newFamilyLabel.trim()) return;
    await createFamilyMutation.mutateAsync(newFamilyLabel);
  };

  const handleResetFamily = async (id: string, label: string) => {
    if (confirm(`Are you sure you want to reset all levels for "${label}"?`)) {
      await resetFamilyMutation.mutateAsync(id);
    }
  };

  const handleDeleteFamily = async (id: string, label: string) => {
    if (confirm(`Are you sure you want to delete "${label}"?`)) {
      await deleteFamilyMutation.mutateAsync(id);
    }
  };

  const startEditingFamily = (family: Family) => {
    setEditingFamily(family.id);
    setEditLabel(family.label);
  };

  const handleUpdateFamily = async (id: string) => {
    if (!editLabel.trim()) return;
    await updateFamilyMutation.mutateAsync({ id, label: editLabel });
  };

  const totalLevels = families.reduce((sum, family) => sum + 4, 0);
  const unlockedCount = families.reduce(
    (sum, family) => sum + family.levels.filter(l => l.unlocked).length,
    0
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-xl text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent" data-testid="heading-levels">
            Levels
          </h1>
          <p className="text-xl text-muted-foreground" data-testid="text-level-counter">
            {unlockedCount} of {totalLevels} Levels Unlocked
          </p>
        </div>

        <div className="mb-8 flex justify-center">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" data-testid="button-add-family">
                <Plus className="w-5 h-5 mr-2" />
                Add Job Position
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Job Position</DialogTitle>
                <DialogDescription>
                  Create a new job position family with 4 progression levels
                </DialogDescription>
              </DialogHeader>
              <Input
                placeholder="Enter job position name (e.g., Software Engineer)"
                value={newFamilyLabel}
                onChange={(e) => setNewFamilyLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFamily()}
                data-testid="input-family-label"
              />
              <DialogFooter>
                <Button
                  onClick={handleCreateFamily}
                  disabled={!newFamilyLabel.trim() || createFamilyMutation.isPending}
                  data-testid="button-create-family"
                >
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-8">
          {families.map((family) => (
            <div
              key={family.id}
              className="border-2 border-primary/30 rounded-3xl p-6 md:p-8 bg-primary/5"
              data-testid={family.id}
            >
              <div className="flex items-center justify-between mb-6">
                {editingFamily === family.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUpdateFamily(family.id)}
                      className="max-w-md"
                      data-testid={`input-edit-label-${family.id}`}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleUpdateFamily(family.id)}
                      data-testid={`button-save-label-${family.id}`}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 flex-1">
                    <h2 className="text-2xl md:text-3xl font-display font-bold text-primary" data-testid={`text-family-label-${family.id}`}>
                      {family.label}
                    </h2>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEditingFamily(family)}
                      data-testid={`button-edit-label-${family.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      data-testid={`button-menu-${family.id}`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleResetFamily(family.id, family.label)}
                      data-testid={`button-reset-family-${family.id}`}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset Levels
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteFamily(family.id, family.label)}
                      className="text-destructive focus:text-destructive"
                      data-testid={`button-delete-family-${family.id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Family
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                {family.levels.map((level) => (
                  <button
                    key={level.levelNumber}
                    onClick={() => handleUnlockLevel(family.id, level.levelNumber, level.unlocked)}
                    data-testid={`level-${family.id}-${level.levelNumber}`}
                    className={`
                      relative aspect-square rounded-2xl overflow-hidden w-full bg-gray-800
                      transition-all duration-200 ease-out
                      ${level.unlocked ? "cursor-default" : "cursor-pointer hover:scale-105 active:scale-95"}
                      ${animatingLevel === `${family.id}-${level.levelNumber}` ? "animate-unlock-pulse" : ""}
                    `}
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      <span className={`
                        text-2xl md:text-3xl font-display font-bold tracking-wide
                        transition-all duration-500
                        ${level.unlocked ? "text-primary" : "text-gray-500 opacity-40"}
                      `}>
                        LEVEL {level.levelNumber}
                      </span>
                    </div>

                    {level.unlocked && (
                      <div className="absolute inset-0 border-2 border-primary rounded-2xl shadow-lg shadow-primary/20" />
                    )}

                    {!level.unlocked && (
                      <>
                        <div className="absolute inset-0 border-2 border-gray-700 rounded-2xl" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Lock className="w-12 h-12 md:w-16 md:h-16 text-gray-500" data-testid={`lock-icon-${family.id}-${level.levelNumber}`} />
                        </div>
                      </>
                    )}

                    {level.unlocked && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 bg-primary/10 animate-glow-pulse rounded-2xl" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {families.length === 0 && (
          <div className="text-center py-16" data-testid="empty-state">
            <p className="text-xl text-muted-foreground mb-6">
              No job positions yet. Create your first one!
            </p>
          </div>
        )}

        {unlockedCount === totalLevels && totalLevels > 0 && (
          <div className="mt-12 text-center" data-testid="completion-message">
            <div className="inline-block px-8 py-4 bg-primary/20 border-2 border-primary rounded-xl">
              <p className="text-2xl font-bold text-primary">
                All Levels Unlocked!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
