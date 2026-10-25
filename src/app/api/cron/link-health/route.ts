import { eq, and, isNotNull, ne, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { checkUrl, deadlineRollover, resolveStatusTransition, runWithConcurrency } from "@/lib/link-health";
import { notifyBrokenLinks, type BrokenLink } from "@/lib/admin-notify";
import { FLAGSHIP_OPPORTUNITIES } from "@/lib/flagship-opportunities";
import { flagshipsNeedingRefresh } from "@/lib/flagship-freshness";

export const maxDuration = 270;

export async function GET(request: Request) {
  // An unset CRON_SECRET must not turn "Bearer undefined" into a valid key.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Issue #83: retire or roll over past deadlines before checking links,
  // so newly expired rows aren't link-checked this run.
  const rolloverNow = new Date();
  const pastDeadline = await db
    .select({
      id: schema.resources.id,
      deadline: schema.resources.deadline,
      recurrence: schema.resources.recurrence,
      status: schema.resources.status,
    })
    .from(schema.resources)
    .where(
      and(
        eq(schema.resources.approved, true),
        ne(schema.resources.status, "expired"),
        lt(schema.resources.deadline, rolloverNow),
      ),
    );
  let deadlinesExpired = 0;
  let deadlinesRolledOver = 0;
  for (const row of pastDeadline) {
    const rollover = deadlineRollover(row, rolloverNow.getTime());
    if (!rollover) continue;
    if (rollover.action === "expire") deadlinesExpired++;
    else deadlinesRolledOver++;
    await db
      .update(schema.resources)
      .set(rollover.action === "expire" ? { status: "expired", updatedAt: rolloverNow } : { deadline: null, updatedAt: rolloverNow })
      .where(eq(schema.resources.id, row.id));
  }

  // Only link-checkable, admin-APPROVED resources — unapproved submissions
  // (approved = false) must never be server-fetched (SSRF, see #88), and
  // 'expired' is an admin decision, not something the cron should try to
  // resurrect.
  const targets = await db
    .select({
      id: schema.resources.id,
      url: schema.resources.url,
      status: schema.resources.status,
      consecutiveFailures: schema.resources.consecutiveFailures,
    })
    .from(schema.resources)
    .where(
      and(
        isNotNull(schema.resources.url),
        eq(schema.resources.hasStaticClaimUrl, true),
        eq(schema.resources.approved, true),
        ne(schema.resources.status, "expired"),
      ),
    );

  let broken = 0;
  let active = 0;
  let expired = 0;
  const now = new Date();
  // Issue #41: links that flipped to broken/expired in this run — the
  // admin gets a proactive notification about exactly these.
  const newlyFlagged: BrokenLink[] = [];

  await runWithConcurrency(targets, 25, async (target) => {
    const outcome = await checkUrl(target.url!);
    // Issue #76: first failure → 'broken'; 2 consecutive failures →
    // 'expired'; a passing check heals back to 'active'.
    const transition = resolveStatusTransition({
      previousStatus: target.status,
      consecutiveFailures: target.consecutiveFailures,
      outcome,
    });
    if (transition.status === "broken") broken++;
    else if (transition.status === "expired") expired++;
    else active++;

    if (transition.status !== target.status && transition.status !== "active") {
      newlyFlagged.push({
        id: target.id,
        url: target.url!,
        previousStatus: target.status,
        newStatus: transition.status,
      });
    }

    await db
      .update(schema.resources)
      .set({
        status: transition.status,
        lastVerifiedAt: now,
        consecutiveFailures: transition.consecutiveFailures,
      })
      .where(eq(schema.resources.id, target.id));
  });

  // / and /directory are statically prerendered (no dynamic API in either
  // page) — without this, cron-driven status flips wouldn't show up until
  // the next deploy. Admin CRUD (src/app/admin/(dashboard)/actions.ts)
  // does the same after every mutation, for the same reason.
  revalidatePath("/");
  revalidatePath("/directory");
  revalidatePath("/deadlines");

  const summary = { checked: targets.length, active, broken, expired, checkedAt: now.toISOString() };
  console.log(`link-health: ${deadlinesExpired} past deadline(s) expired, ${deadlinesRolledOver} rolled over.`);
  console.log("link-health run:", summary);

  // Issue #120: curated programs in src/lib/flagship-opportunities.ts whose
  // dates need a re-check. That file only changes on deploy, so the cron
  // can't fix them; it reminds the admin in the same weekly message.
  const flagshipRefresh = flagshipsNeedingRefresh(FLAGSHIP_OPPORTUNITIES, now);
  console.log(`link-health: ${flagshipRefresh.length} curated program(s) to re-check.`);

  // Issue #41: proactively notify the admin about newly broken links.
  // Opt-in via LINK_HEALTH_WEBHOOK_URL — without it the cron behaves
  // exactly as before, and a notification failure never fails the run.
  if (newlyFlagged.length > 0 || flagshipRefresh.length > 0) {
    const notification = await notifyBrokenLinks(newlyFlagged, summary, { flagshipRefresh });
    if (notification.sent) {
      console.log(
        `link-health: notified admin about ${newlyFlagged.length} newly flagged link(s) and ${flagshipRefresh.length} curated program(s) to re-check.`,
      );
    } else {
      console.log(`link-health: admin notification skipped (${notification.reason}).`);
    }
  }

  return Response.json(summary);
}
