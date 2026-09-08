import { eq, and, isNotNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { checkUrl, classifyCheck, runWithConcurrency } from "@/lib/link-health";

export const maxDuration = 270;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Only link-checkable, admin-active resources — 'expired' is an admin
  // decision, not something the cron should try to resurrect.
  const targets = await db
    .select({ id: schema.resources.id, url: schema.resources.url })
    .from(schema.resources)
    .where(
      and(
        isNotNull(schema.resources.url),
        eq(schema.resources.hasStaticClaimUrl, true),
        ne(schema.resources.status, "expired"),
      ),
    );

  let broken = 0;
  let active = 0;
  const now = new Date();

  await runWithConcurrency(targets, 25, async (target) => {
    const outcome = await checkUrl(target.url!);
    const status = classifyCheck(outcome);
    if (status === "broken") broken++;
    else active++;

    await db
      .update(schema.resources)
      .set({ status, lastVerifiedAt: now })
      .where(eq(schema.resources.id, target.id));
  });

  // / and /directory are statically prerendered (no dynamic API in either
  // page) — without this, cron-driven status flips wouldn't show up until
  // the next deploy. Admin CRUD (src/app/admin/(dashboard)/actions.ts)
  // does the same after every mutation, for the same reason.
  revalidatePath("/");
  revalidatePath("/directory");

  const summary = { checked: targets.length, active, broken, checkedAt: now.toISOString() };
  console.log("link-health run:", summary);
  return Response.json(summary);
}
