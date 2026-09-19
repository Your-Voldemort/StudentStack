import { getAllResources } from "@/lib/resources";
import { SOURCES } from "@/lib/ingestion/sources";
import { runIngestion } from "@/lib/ingestion/run-ingestion";
import { getExistingCandidateKeys, insertCandidates } from "@/lib/ingestion/queries";

export const maxDuration = 270;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [resources, alreadySeenKeys] = await Promise.all([getAllResources(), getExistingCandidateKeys()]);
  const { toInsert, summary } = await runIngestion(SOURCES, resources, alreadySeenKeys);
  await insertCandidates(toInsert);

  console.log("ingestion run:", summary);
  return Response.json({ sources: summary, queued: toInsert.length });
}
