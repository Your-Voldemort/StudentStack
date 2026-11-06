import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark } from "@/components/ui/logo";
import { verifyAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { email } = await verifyAdmin();

  return (
    <div className="min-h-screen">
      <header className="border-line flex items-center justify-between border-b px-6 py-4">
        <Link href="/admin" className="inline-flex items-center gap-2 font-bold">
          <LogoMark className="size-5 shrink-0" />
          <span>StudentStack Admin</span>
        </Link>
        <div className="flex items-center gap-4 text-sm" data-has-theme-toggle>
          <span className="text-muted-foreground">{email}</span>
          <Link href="/admin/ingestion">Ingestion</Link>
          <Link href="/directory">View site</Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
