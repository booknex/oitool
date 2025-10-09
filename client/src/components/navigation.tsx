import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Trophy, Award } from "lucide-react";

export function Navigation() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
        <Button
          variant={location === "/" ? "default" : "outline"}
          onClick={() => setLocation("/")}
          data-testid="button-achievement-gallery"
          className="gap-2"
        >
          <Award className="w-4 h-4" />
          Achievement Gallery
        </Button>

        <Button
          variant={location === "/trophies" ? "default" : "outline"}
          onClick={() => setLocation("/trophies")}
          data-testid="button-trophies"
          className="gap-2"
        >
          <Trophy className="w-4 h-4" />
          Trophies
        </Button>
      </div>
    </nav>
  );
}
