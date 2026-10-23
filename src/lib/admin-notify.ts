/**
 * Admin notifications: the weekly link-health cron (issue #41) and new
 * community submissions (issue #35).
 *
 * PRD §8.6 requires the admin to get a summary notification when the cron
 * finds broken links. Until the Phase 5 email infrastructure exists, this
 * goes out as a webhook POST — Slack incoming webhooks and most generic
 * JSON webhooks accept `{ "text": "..." }`.
 *
 * Configure with the LINK_HEALTH_WEBHOOK_URL env var. When it is unset the
 * cron keeps its current behavior (console summary only): notifications
 * are strictly opt-in and never fail the cron run.
 *
 * Issue #120: the same message carries a short list of curated flagship
 * programs whose dates need a re-check (src/lib/flagship-freshness.ts).
 */

import type { FlagshipRefreshEntry } from "./flagship-freshness";

export type BrokenLink = {
  id: number;
  url: string;
  previousStatus: string;
  newStatus: "broken" | "expired";
};

export type LinkHealthSummary = {
  checked: number;
  active: number;
  broken: number;
  expired: number;
  checkedAt: string;
};

export type NotifyResult = { sent: true } | { sent: false; reason: string };

/** Reads the webhook URL from the environment (null when unconfigured). */
export function getWebhookUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const url = env.LINK_HEALTH_WEBHOOK_URL?.trim();
  return url ? url : null;
}

/**
 * Renders the plain-text notification body listing newly flagged links,
 * plus the curated programs to re-check when there are any.
 */
export function buildBrokenLinksMessage(
  links: BrokenLink[],
  summary: LinkHealthSummary,
  flagshipRefresh: FlagshipRefreshEntry[] = [],
): string {
  const shown = links.slice(0, 20);
  const lines = shown.map(
    (link) => `- ${link.url} (${link.previousStatus} -> ${link.newStatus})`,
  );
  if (links.length > shown.length) {
    lines.push(`…and ${links.length - shown.length} more`);
  }
  const message = [
    links.length > 0
      ? `Link-health cron: ${links.length} newly flagged link${links.length === 1 ? "" : "s"}`
      : "Link-health cron: no newly flagged links",
    `Checked ${summary.checked} URLs — ${summary.active} active, ${summary.broken} broken, ${summary.expired} expired (${summary.checkedAt}).`,
  ];
  if (lines.length > 0) message.push("", ...lines);
  if (flagshipRefresh.length > 0) {
    const refreshShown = flagshipRefresh.slice(0, 10);
    message.push(
      "",
      `${flagshipRefresh.length} curated program${flagshipRefresh.length === 1 ? "" : "s"} to re-check in src/lib/flagship-opportunities.ts:`,
      ...refreshShown.map(
        (entry) => `- ${entry.name}: ${entry.reasons.map((r) => r.message).join("; ")} (${entry.source})`,
      ),
    );
    if (flagshipRefresh.length > refreshShown.length) {
      message.push(`…and ${flagshipRefresh.length - refreshShown.length} more on the admin dashboard`);
    }
  }
  return message.join("\n");
}

// Shared webhook POST. Never throws: a missing webhook, an HTTP error, or a
// network failure is reported in the result so callers can log it and
// carry on.
async function postWebhook(
  text: string,
  webhookUrl: string,
  fetchImpl: typeof fetch,
): Promise<NotifyResult> {
  try {
    const res = await fetchImpl(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return { sent: false, reason: `webhook returned HTTP ${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * POSTs the broken-links summary to the configured webhook. Never throws.
 * Sends when there are newly flagged links or curated programs to re-check;
 * the cron runs weekly, so a pending re-check is a weekly reminder at most.
 */
export async function notifyBrokenLinks(
  links: BrokenLink[],
  summary: LinkHealthSummary,
  options: {
    webhookUrl?: string | null;
    fetchImpl?: typeof fetch;
    flagshipRefresh?: FlagshipRefreshEntry[];
  } = {},
): Promise<NotifyResult> {
  const flagshipRefresh = options.flagshipRefresh ?? [];
  if (links.length === 0 && flagshipRefresh.length === 0) {
    return { sent: false, reason: "no newly flagged links" };
  }
  const webhookUrl =
    options.webhookUrl !== undefined ? options.webhookUrl : getWebhookUrl();
  if (!webhookUrl) {
    return { sent: false, reason: "LINK_HEALTH_WEBHOOK_URL is not configured" };
  }
  return postWebhook(
    buildBrokenLinksMessage(links, summary, flagshipRefresh),
    webhookUrl,
    options.fetchImpl ?? fetch,
  );
}

/**
 * New community submissions (issue #35). Uses SUBMISSIONS_WEBHOOK_URL,
 * falling back to LINK_HEALTH_WEBHOOK_URL so one Slack channel can take
 * both. Unset = no notification; the admin queue still shows the row.
 */
export type NewSubmission = {
  name: string;
  url: string;
  categoryName?: string;
};

export function getSubmissionsWebhookUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const url = env.SUBMISSIONS_WEBHOOK_URL?.trim();
  return url ? url : getWebhookUrl(env);
}

export function buildNewSubmissionMessage(
  submission: NewSubmission,
  adminUrl: string,
): string {
  const category = submission.categoryName ? ` (${submission.categoryName})` : "";
  return [
    `New community submission waiting for review: ${submission.name}${category}`,
    submission.url,
    `Review it at ${adminUrl}`,
  ].join("\n");
}

export async function notifyNewSubmission(
  submission: NewSubmission,
  adminUrl: string,
  options: {
    webhookUrl?: string | null;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<NotifyResult> {
  const webhookUrl =
    options.webhookUrl !== undefined
      ? options.webhookUrl
      : getSubmissionsWebhookUrl();
  if (!webhookUrl) {
    return { sent: false, reason: "SUBMISSIONS_WEBHOOK_URL is not configured" };
  }
  return postWebhook(
    buildNewSubmissionMessage(submission, adminUrl),
    webhookUrl,
    options.fetchImpl ?? fetch,
  );
}
