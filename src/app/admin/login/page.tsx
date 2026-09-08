import { login } from "./actions";

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-xl font-bold">Admin login</h1>
      <form action={login} className="flex flex-col gap-4">
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="border-line rounded-md border px-3 py-2"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          className="border-line rounded-md border px-3 py-2"
        />
        <button type="submit" className="bg-orange rounded-md px-4 py-2 font-medium">
          Sign in
        </button>
      </form>
      <LoginError searchParams={searchParams} />
    </main>
  );
}

async function LoginError({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (!error) return null;
  return <p className="text-destructive mt-4 text-sm">{error}</p>;
}
