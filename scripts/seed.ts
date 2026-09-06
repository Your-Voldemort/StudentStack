// Idempotent: clears and reloads categories/resources from offers.json.
// Re-run any time the raw data source changes: `pnpm db:seed`.
import path from "node:path";
import { db, schema } from "../src/db";
import { normalizeOffers } from "./normalize-data";

async function main() {
  const { categories, resources } = normalizeOffers(
    path.join(process.cwd(), "offers.json"),
  );

  db.delete(schema.resources).run();
  db.delete(schema.categories).run();

  const categoryIdBySlug = new Map<string, number>();
  for (const c of categories) {
    const [row] = db.insert(schema.categories).values(c).returning().all();
    categoryIdBySlug.set(c.slug, row.id);
  }

  const now = new Date();
  for (const r of resources) {
    const categoryId = categoryIdBySlug.get(r.categorySlug);
    if (!categoryId) throw new Error(`unknown category slug ${r.categorySlug}`);
    db.insert(schema.resources)
      .values({
        slug: r.slug,
        name: r.name,
        tagline: r.tagline,
        description: r.description,
        url: r.url,
        hasStaticClaimUrl: r.hasStaticClaimUrl,
        categoryId,
        tags: r.tags,
        region: r.region,
        costType: r.costType,
        status: r.status,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  console.log(`Seeded ${categories.length} categories and ${resources.length} resources.`);
}

main();
