import { Badge } from "@shared/schema";
import { format } from "date-fns";
import { Lock, Calendar } from "lucide-react";

interface BadgeTooltipProps {
  badge: Badge & { name: string; description: string; category: string };
  isVisible: boolean;
}

export function BadgeTooltip({ badge, isVisible }: BadgeTooltipProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-10 pointer-events-none">
      <div className="bg-card border-2 border-card-border rounded-xl p-4 shadow-xl min-w-[280px] max-w-[320px]">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-base font-bold text-foreground mb-1" data-testid={`tooltip-name-${badge.id}`}>
              {badge.name}
            </h3>
            <span className="inline-block px-2 py-0.5 bg-primary/20 text-primary text-xs font-semibold rounded">
              {badge.category}
            </span>
          </div>
          {!badge.unlocked && (
            <Lock className="w-5 h-5 text-muted-foreground ml-2 flex-shrink-0" />
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-3" data-testid={`tooltip-description-${badge.id}`}>
          {badge.description}
        </p>

        {badge.unlocked && badge.unlockedAt && (
          <div className="flex items-center gap-2 pt-3 border-t border-border">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-xs text-primary font-semibold" data-testid={`tooltip-unlock-date-${badge.id}`}>
              Unlocked: {format(new Date(badge.unlockedAt), "MMM d, yyyy 'at' h:mm a")}
            </span>
          </div>
        )}

        {!badge.unlocked && (
          <div className="pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground italic">
              Click to unlock this achievement
            </span>
          </div>
        )}
      </div>
      <div className="w-3 h-3 bg-card border-r-2 border-b-2 border-card-border rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2" />
    </div>
  );
}
