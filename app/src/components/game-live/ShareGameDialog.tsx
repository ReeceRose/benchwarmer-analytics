import { useRef, useState } from "react";
import { Check, Copy, Download, Link2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GameScorecard } from "@/components/game-live/GameScorecard";
import type { LiveGameResponse } from "@/types";

type Status = { kind: "idle" } | { kind: "working" } | { kind: "done"; message: string } | { kind: "error"; message: string };

function canShareFiles(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
  return navigator.canShare({ files: [new File([], "card.png", { type: "image/png" })] });
}

function canCopyImages(): boolean {
  return typeof ClipboardItem !== "undefined" && typeof navigator.clipboard?.write === "function";
}

/** "Share" on the game header: the scorecard in a dialog, as an image or a link. */
export function ShareGameButton({ data }: { data: LiveGameResponse }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const title = `${data.away.abbrev} ${data.away.score}–${data.home.score} ${data.home.abbrev}`;
  const fileName = `${data.away.abbrev}-${data.home.abbrev}-${data.meta.gameId}.png`;
  const shareFiles = canShareFiles();
  const copyImages = canCopyImages();

  const renderImage = async (): Promise<Blob> => {
    const node = cardRef.current;
    if (!node) throw new Error("Scorecard isn't mounted");
    const { toBlob } = await import("html-to-image");
    const blob = await toBlob(node, { pixelRatio: 2, backgroundColor: getComputedStyle(node).backgroundColor });
    if (!blob) throw new Error("Empty image");
    return blob;
  };

  const run = async (action: () => Promise<string | null>) => {
    setStatus({ kind: "working" });
    try {
      const message = await action();
      setStatus(message ? { kind: "done", message } : { kind: "idle" });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return setStatus({ kind: "idle" });
      console.error("Sharing the scorecard failed", error);
      setStatus({ kind: "error", message: "Couldn't create the image. Try copying the link instead." });
    }
  };

  const shareImage = () =>
    run(async () => {
      const file = new File([await renderImage()], fileName, { type: "image/png" });
      await navigator.share({ files: [file], title, url: window.location.href });
      return null;
    });

  // Safari needs the clipboard write to start inside the click, so it gets
  // the pending blob rather than awaiting it first.
  const copyImage = () =>
    run(async () => {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": renderImage() })]);
      return "Image copied. Paste it into a post or chat.";
    });

  const downloadImage = () =>
    run(async () => {
      const url = URL.createObjectURL(await renderImage());
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      return "Image downloaded.";
    });

  const copyLink = () =>
    run(async () => {
      await navigator.clipboard.writeText(window.location.href);
      return "Link copied.";
    });

  const working = status.kind === "working";

  return (
    <Dialog onOpenChange={() => setStatus({ kind: "idle" })}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white hover:bg-white/25"
        >
          <Share2 className="size-3.5" />
          Share
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-svh overflow-y-auto rounded-2xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Share this game</DialogTitle>
          <DialogDescription>
            Post the scorecard as an image, or send a link to the game centre.
          </DialogDescription>
        </DialogHeader>

        <GameScorecard data={data} ref={cardRef} />

        <div className="flex flex-wrap gap-2">
          {shareFiles ? (
            <Button onClick={shareImage} disabled={working}>
              <Share2 />
              Share image
            </Button>
          ) : copyImages ? (
            <Button onClick={copyImage} disabled={working}>
              <Copy />
              Copy image
            </Button>
          ) : null}
          <Button variant={shareFiles || copyImages ? "outline" : "default"} onClick={downloadImage} disabled={working}>
            <Download />
            Download
          </Button>
          <Button variant="outline" onClick={copyLink} disabled={working}>
            <Link2 />
            Copy link
          </Button>
        </div>

        {(status.kind === "done" || status.kind === "error") && (
          <p role="status" className="-mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            {status.kind === "done" && <Check className="size-3.5" />}
            {status.message}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
