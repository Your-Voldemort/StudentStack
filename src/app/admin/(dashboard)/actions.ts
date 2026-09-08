"use server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { verifyAdmin } from "@/lib/admin/auth";

function parseTags(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function refreshPublicPages() {
  revalidatePath("/");
  revalidatePath("/directory");
}

export async function createResource(formData: FormData) {
  await verifyAdmin();

  const categoryId = Number(formData.get("categoryId"));
  const deadlineRaw = String(formData.get("deadline") ?? "");

  await db.insert(schema.resources).values({
    slug: String(formData.get("name")).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: String(formData.get("name")),
    tagline: String(formData.get("tagline") ?? "") || null,
    description: String(formData.get("description")),
    url: String(formData.get("url")),
    hasStaticClaimUrl: true,
    categoryId,
    tags: parseTags(formData.get("tags")),
    region: (formData.get("region") as "IN" | "Global") ?? "Global",
    costType: formData.get("costType") as (typeof schema.resources.$inferInsert)["costType"],
    deadline: deadlineRaw ? new Date(deadlineRaw) : null,
    status: "active",
  });

  refreshPublicPages();
  redirect("/admin");
}

export async function updateResource(id: number, formData: FormData) {
  await verifyAdmin();

  const categoryId = Number(formData.get("categoryId"));
  const deadlineRaw = String(formData.get("deadline") ?? "");
  const urlRaw = String(formData.get("url") ?? "");

  await db
    .update(schema.resources)
    .set({
      name: String(formData.get("name")),
      tagline: String(formData.get("tagline") ?? "") || null,
      description: String(formData.get("description")),
      url: urlRaw || null,
      hasStaticClaimUrl: Boolean(urlRaw),
      categoryId,
      tags: parseTags(formData.get("tags")),
      region: (formData.get("region") as "IN" | "Global") ?? "Global",
      costType: formData.get("costType") as (typeof schema.resources.$inferInsert)["costType"],
      deadline: deadlineRaw ? new Date(deadlineRaw) : null,
      status: formData.get("status") as (typeof schema.resources.$inferInsert)["status"],
      updatedAt: new Date(),
    })
    .where(eq(schema.resources.id, id));

  refreshPublicPages();
  redirect("/admin");
}

export async function updateStatus(id: number, formData: FormData) {
  await verifyAdmin();

  await db
    .update(schema.resources)
    .set({
      status: formData.get("status") as (typeof schema.resources.$inferInsert)["status"],
      updatedAt: new Date(),
    })
    .where(eq(schema.resources.id, id));

  refreshPublicPages();
}

export async function deleteResource(id: number) {
  await verifyAdmin();
  await db.delete(schema.resources).where(eq(schema.resources.id, id));
  refreshPublicPages();
}
