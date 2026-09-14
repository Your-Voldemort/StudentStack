import { useState } from "react";
import { AnimatedShinyButton } from "@/components/ui/animated-shiny-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Resource } from "@/lib/resources";
import { relativeTime } from "@/lib/format";

const COST_LABEL: Record<Resource["costType"], string> = {
  free: "Free",
  discount: "Discount",
  stipend: "Stipend",
  scholarship: "Scholarship",
  credits: "Credits",
  trial: "Trial",
};

function faviconUrl(claimUrl: string | null): string | null {
  if (!claimUrl) return null;
  try {
    const host = new URL(claimUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return null;
  }
}

function ResourceIcon({ resource }: { resource: Resource }) {
  const [failed, setFailed] = useState(false);
  const src = faviconUrl(resource.url);
  if (!src || failed) {
    return (
      <span className="text-2xl leading-none" aria-hidden>
        {resource.categoryIcon}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- external favicon, not an optimizable local asset
    <img
      src={src}
      alt=""
      width={24}
      height={24}
      className="size-6 rounded"
      onError={() => setFailed(true)}
    />
  );
}

export function ResourceCard({
  resource,
  onTagClick,
}: {
  resource: Resource;
  onTagClick: (tag: string) => void;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <ResourceIcon resource={resource} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-semibold">{resource.name}</h3>
            <Badge variant="outline">{COST_LABEL[resource.costType]}</Badge>
          </div>
          {resource.tagline && (
            <p className="text-muted-foreground text-sm">{resource.tagline}</p>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <button type="button" className="text-left">
              <p className="line-clamp-3 text-sm whitespace-pre-line">{resource.description}</p>
              {resource.description.length > 160 && (
                <span className="text-muted-foreground text-xs underline underline-offset-2">
                  Read more
                </span>
              )}
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{resource.name}</DialogTitle>
              <DialogDescription className="text-foreground whitespace-pre-line">
                {resource.description}
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        <div className="flex flex-wrap items-center gap-1.5">
          {resource.tags.slice(0, 2).map((tag) => (
            <button key={tag} type="button" onClick={() => onTagClick(tag)}>
              <Badge variant="secondary" className="cursor-pointer hover:opacity-80">
                {tag}
              </Badge>
            </button>
          ))}
          {resource.tags.length > 2 && <Badge variant="outline">+{resource.tags.length - 2}</Badge>}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {relativeTime(resource.lastVerifiedAt) && (
              <span className="text-green-700 dark:text-green-500">
                ✓ {relativeTime(resource.lastVerifiedAt)}
              </span>
            )}
            {resource.status === "broken" && (
              <Badge variant="destructive">⚠ Link may be down</Badge>
            )}
          </div>

          {resource.hasStaticClaimUrl && resource.url ? (
            <AnimatedShinyButton url={resource.url} compact>
              Claim
            </AnimatedShinyButton>
          ) : (
            <span
              title="This offer routes through an in-app redirect or varies by region — no single static link"
              className="text-muted-foreground rounded-md border px-3 py-1.5 text-sm"
            >
              Varies by region
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
