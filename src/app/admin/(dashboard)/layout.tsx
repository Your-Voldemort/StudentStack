import Link from "next/link";
import { verifyAdmin } from "@/lib/admin/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { email } = await verifyAdmin();

  return (
    <div className="min-h-screen">
      <header className="border-line flex items-center justify-between border-b px-6 py-4">
        <Link href="/admin" className="font-bold">
          StudentStack Admin
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">{email}</span>
          <Link href="/admin/ingestion">Ingestion</Link>
          <Link href="/directory">View site</Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
