"use server";
import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/admin/auth";
import { markCandidateReviewed } from "@/lib/ingestion/queries";

export async function rejectCandidate(id: number) {
  await verifyAdmin();
  await markCandidateReviewed(id, "rejected");
  revalidatePath("/admin/ingestion");
}
