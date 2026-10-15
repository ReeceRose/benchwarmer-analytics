import { cn } from "@/lib/utils";

/**
 * The NHL's trophy photo (shot on black) in a portrait frame. An empty frame
 * when there's no photo.
 */
export function TrophyImage({ src, className }: { src: string | null; className?: string }) {
  return (
    <div className={cn("aspect-2/3 shrink-0 overflow-hidden rounded-xl bg-black", className)}>
      {src && <img src={src} alt="" loading="lazy" className="size-full object-cover" />}
    </div>
  );
}
