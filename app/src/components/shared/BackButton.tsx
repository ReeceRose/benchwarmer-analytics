import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  fallbackPath?: string;
  label?: string;
}

export function BackButton({ fallbackPath = "/", label = "Back" }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      router.history.back();
    } else {
      // Fallback to provided path if no history
      router.navigate({ to: fallbackPath });
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}
