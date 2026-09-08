// Idempotent: clears and reloads categories/resources from offers.json.
// Re-run any time the raw data source changes: `pnpm db:seed`.
import path from "node:path";
import { db, schema } from "../src/db";
import { normalizeOffers } from "./normalize-data";

async function main() {
  const { categories, resources } = normalizeOffers(
    path.join(process.cwd(), "offers.json"),
  );

  await db.delete(schema.resources);
  await db.delete(schema.categories);

  const insertedCategories = await db.insert(schema.categories).values(categories).returning();
  const categoryIdBySlug = new Map(insertedCategories.map((c) => [c.slug, c.id]));

  const now = new Date();
  const resourceRows = resources.map((r) => {
    const categoryId = categoryIdBySlug.get(r.categorySlug);
    if (!categoryId) throw new Error(`unknown category slug ${r.categorySlug}`);
    return {
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
    };
  });
  await db.insert(schema.resources).values(resourceRows);

  console.log(`Seeded ${categories.length} categories and ${resources.length} resources.`);
  process.exit(0);
}

main();
