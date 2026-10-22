import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getAllResources, getAllResourceSlugs, getResourceBySlug, type Resource } from "@/lib/resources";
import { getSiteUrl } from "@/lib/site";
import { relativeTime } from "@/lib/format";
import { COST_LABELS, DURATION_LABELS, VERIFICATION_LABELS } from "@/lib/resource-labels";
import { comparisonSetsForResource } from "@/lib/comparisons";
import { SiteHeader } from "@/components/home/site-chrome";
import { ClaimButton } from "@/components/resource/claim-button";
import { BookmarksProvider } from "@/components/bookmarks/bookmarks-provider";
import { BookmarkButton } from "@/components/bookmarks/bookmark-button";
import { RatingStars } from "@/components/reviews/rating-stars";
import { ReviewForm } from "@/components/reviews/review-form";
import { HelpfulButton, HelpfulVotesProvider } from "@/components/reviews/helpful-votes";
import { getRatingSummary, getResourceReviews } from "@/lib/reviews";
import { getGotItCount } from "@/lib/bookmarks";
import { formatRating, parseReviewSort, type RatingSummary } from "@/lib/review-rules";
import { passFontVariables } from "@/lib/fonts";
import homeStyles from "@/components/home/brand.module.css";
import dirStyles from "@/components/directory/directory.module.css";

// Resources change via admin CRUD and the link-health cron; without this,
// Next statically prerenders the page at build time and on-demand
// revalidation doesn't reliably re-run this Server Component in self-hosted
// mode. Force per-request rendering instead (same as /directory).
export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const slugs = await getAllResourceSlugs();
  return slugs.map(({ slug }) => ({ slug }));
}

function pageDescription(resource: Resource): string {
  const base = resource.tagline ? `${resource.tagline}. ` : "";
  const text = `${base}${resource.description}`.replace(/\s+/g, " ").trim();
  return text.length > 155 ? `${text.slice(0, 152).trimEnd()}…` : text;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resource = await getResourceBySlug(slug);
  if (!resource) return {};
  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}/r/${resource.slug}`;
  const title = `${resource.name} — ${resource.tagline ?? "student discount"} | StudentStack`;
  const description = pageDescription(resource);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "StudentStack",
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-card/50 px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

function jsonLd(resource: Resource, canonical: string, rating: RatingSummary | null): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: resource.name,
    description: pageDescription(resource),
    category: resource.categoryName,
    url: canonical,
    brand: { "@type": "Brand", name: resource.name },
    offers: {
      "@type": "Offer",
      url: resource.url ?? canonical,
      price: resource.costType === "free" ? "0" : undefined,
      priceCurrency: "USD",
      availability: resource.status === "active" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      category: resource.categoryName,
    },
    ...(rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating.average.toFixed(1),
            reviewCount: rating.count,
          },
        }
      : {}),
  };
  // Guard against `</script>` breaking out of the JSON-LD block.
  return JSON.stringify(data).replace(/<\//g, "<\\/");
}

const reviewDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function ResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ reviews?: string }>;
}) {
  const { slug } = await params;
  const resource = await getResourceBySlug(slug);
  if (!resource) notFound();
  const reviewSort = parseReviewSort((await searchParams).reviews);
  const [reviews, rating, gotItCount] = await Promise.all([
    getResourceReviews(resource.id, reviewSort),
    getRatingSummary(resource.id),
    getGotItCount(resource.id),
  ]);

  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}/r/${resource.slug}`;
  const verified = relativeTime(resource.lastVerifiedAt);

  const allResources = await getAllResources();
  const related = allResources
    .filter((r) => r.categoryId === resource.categoryId && r.id !== resource.id)
    .slice(0, 6);
  const comparisons = comparisonSetsForResource(resource.slug);

  return (
    <div className={`${passFontVariables} ${homeStyles.root}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(resource, canonical, rating) }} />
      <SiteHeader total={allResources.length} />
      <div className={dirStyles.root}>
        <main className={dirStyles.wrap}>
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
            <Link href="/" className="hover:underline">Home</Link>
            <span aria-hidden className="mx-2">/</span>
            <Link href="/directory" className="hover:underline">Directory</Link>
            <span aria-hidden className="mx-2">/</span>
            <span aria-current="page" className="text-foreground">{resource.name}</span>
          </nav>

          <article>
            <header className="mb-8">
              <div className="mb-4 flex items-center gap-3">
                <span aria-hidden className="text-4xl">{resource.categoryIcon}</span>
                <span className="inline-flex rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/80 dark:text-amber-200">
                  {COST_LABELS[resource.costType]}
                </span>
                <span className="text-xs text-muted-foreground">{resource.region === "IN" ? "India" : "Global"}</span>
              </div>
              <h1 className={dirStyles.headline}>{resource.name}</h1>
              {resource.tagline ? <p className={dirStyles.subcopy}>{resource.tagline}</p> : null}
            </header>

            <p className="mb-8 max-w-2xl text-base leading-relaxed">{resource.description}</p>
            {resource.contributorCredit ? (
              <p className="-mt-6 mb-8 text-sm text-muted-foreground">Added by {resource.contributorCredit}</p>
            ) : null}

            <div className="mb-10 flex flex-wrap items-center gap-3">
              {resource.hasStaticClaimUrl && resource.url ? (
                <ClaimButton resourceId={resource.id} url={resource.url} />
              ) : (
                <div className="rounded border px-3 py-1.5 text-xs text-muted-foreground bg-muted/30">
                  Varies by university or regional portal
                </div>
              )}
              <BookmarksProvider>
                <BookmarkButton
                  resourceId={resource.id}
                  resourceName={resource.name}
                  className="inline-grid size-9 place-items-center rounded-md border border-border/70 text-muted-foreground hover:text-foreground"
                />
              </BookmarksProvider>
              {verified ? <span className="text-xs text-muted-foreground">{verified}</span> : null}
              {gotItCount > 0 ? (
                <span className="text-xs font-semibold">
                  {gotItCount} student{gotItCount === 1 ? "" : "s"} got this
                </span>
              ) : null}
            </div>

            <dl className="mb-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailRow label="Category">
                <Link href={`/directory?category=${resource.categorySlug}`} className="hover:underline">
                  {resource.categoryName}
                </Link>
              </DetailRow>
              <DetailRow label="Eligibility">
                {resource.verificationNeeded ? VERIFICATION_LABELS[resource.verificationNeeded] ?? "Check offer eligibility" : "Check offer eligibility"}
              </DetailRow>
              {resource.duration ? <DetailRow label="Duration">{DURATION_LABELS[resource.duration] ?? resource.duration}</DetailRow> : null}
              {resource.creditCardRequired !== null ? (
                <DetailRow label="Credit card">{resource.creditCardRequired ? "Required" : "Not required"}</DetailRow>
              ) : null}
              <DetailRow label="Region">{resource.region === "IN" ? "India" : "Global"}</DetailRow>
              {resource.deadline ? (
                <DetailRow label="Deadline">
                  {new Date(resource.deadline).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </DetailRow>
              ) : null}
            </dl>

            {resource.tags.length > 0 ? (
              <div className="mb-12 flex flex-wrap gap-2">
                {resource.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/directory?q=${encodeURIComponent(tag)}`}
                    className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground hover:underline"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            ) : null}

            {comparisons.length > 0 ? (
              <section aria-labelledby="compare-heading" className="mb-12">
                <h2 id="compare-heading" className="mb-4 text-xl font-semibold">
                  Compare side by side
                </h2>
                <ul className="flex flex-wrap gap-3">
                  {comparisons.map((set) => (
                    <li key={set.slug}>
                      <Link
                        href={`/compare/${set.slug}`}
                        className="inline-flex rounded-lg border border-border/60 bg-card/50 px-4 py-2 text-sm font-medium hover:underline"
                      >
                        {set.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section aria-labelledby="reviews-heading" className="mb-12">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
                <h2 id="reviews-heading" className="text-xl font-semibold">
                  Student reviews
                </h2>
                {rating ? (
                  <span className="inline-flex items-center gap-2 text-sm">
                    <RatingStars value={rating.average} />
                    {formatRating(rating)}
                  </span>
                ) : null}
              </div>
              <div className="mb-6">
                <ReviewForm resourceId={resource.id} slug={resource.slug} />
              </div>
              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
              ) : (
                <>
                  <nav aria-label="Sort reviews" className="mb-3 flex gap-3 text-sm">
                    <Link
                      href={`/r/${resource.slug}#reviews-heading`}
                      aria-current={reviewSort === "recent" ? "true" : undefined}
                      className={reviewSort === "recent" ? "font-semibold" : "text-muted-foreground hover:underline"}
                    >
                      Most recent
                    </Link>
                    <Link
                      href={`/r/${resource.slug}?reviews=highest#reviews-heading`}
                      aria-current={reviewSort === "highest" ? "true" : undefined}
                      className={reviewSort === "highest" ? "font-semibold" : "text-muted-foreground hover:underline"}
                    >
                      Highest rated
                    </Link>
                    <Link
                      href={`/r/${resource.slug}?reviews=helpful#reviews-heading`}
                      aria-current={reviewSort === "helpful" ? "true" : undefined}
                      className={reviewSort === "helpful" ? "font-semibold" : "text-muted-foreground hover:underline"}
                    >
                      Most helpful
                    </Link>
                  </nav>
                  <HelpfulVotesProvider resourceId={resource.id}>
                    <ul className="flex flex-col gap-3">
                      {reviews.map((review) => (
                        <li key={review.id} className="rounded-lg border border-border/60 bg-card/50 p-4">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                            <RatingStars value={review.rating} />
                            <span className="font-medium">Student</span>
                            {review.verifiedStudent ? (
                              <span className="rounded-full border border-emerald-300 px-2 py-0.5 text-xs text-emerald-800 dark:border-emerald-700 dark:text-emerald-300">
                                Verified student
                              </span>
                            ) : null}
                            <span className="text-xs text-muted-foreground">{reviewDate.format(review.createdAt)}</span>
                          </div>
                          {review.comment ? <p className="mt-2 whitespace-pre-line text-sm">{review.comment}</p> : null}
                          <div className="mt-3">
                            <HelpfulButton reviewId={review.id} count={review.helpfulCount} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </HelpfulVotesProvider>
                </>
              )}
            </section>

            {related.length > 0 ? (
              <section aria-labelledby="related-heading" className="mb-8">
                <h2 id="related-heading" className="mb-4 text-xl font-semibold">
                  More in {resource.categoryName}
                </h2>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {related.map((r) => (
                    <li key={r.id} className="rounded-lg border border-border/60 bg-card/50 p-4">
                      <Link href={`/r/${r.slug}`} className="font-medium hover:underline">
                        {r.name}
                      </Link>
                      {r.tagline ? <p className="mt-1 text-sm text-muted-foreground">{r.tagline}</p> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </article>
        </main>
      </div>
    </div>
  );
}
