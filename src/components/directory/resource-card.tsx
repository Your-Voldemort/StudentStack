import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
        <span className="text-2xl leading-none" aria-hidden>
          {resource.categoryIcon}
        </span>
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
        <p className="text-sm whitespace-pre-line">{resource.description}</p>

        <div className="flex flex-wrap gap-1.5">
          {resource.tags.map((tag) => (
            <button key={tag} type="button" onClick={() => onTagClick(tag)}>
              <Badge variant="secondary" className="cursor-pointer hover:opacity-80">
                {tag}
              </Badge>
            </button>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{relativeTime(resource.lastVerifiedAt)}</span>
            {resource.status === "broken" && (
              <Badge variant="destructive">⚠ Link may be down</Badge>
            )}
          </div>

          {resource.hasStaticClaimUrl && resource.url ? (
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium hover:opacity-90"
            >
              Claim
            </a>
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
