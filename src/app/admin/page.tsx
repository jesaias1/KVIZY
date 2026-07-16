import { cookies } from "next/headers";
import { validToken, ADMIN_COOKIE } from "@/lib/admin-auth";
import { AdminDashboard } from "@/components/admin-dashboard";
import Link from "next/link";
import { BrandLockup } from "@/components/brand-lockup";
export default async function AdminPage() {
  const jar = await cookies();
  if (!validToken(jar.get(ADMIN_COOKIE)?.value))
    return (
      <main className="mx-auto flex min-h-dvh max-w-md items-center px-4">
        <form
          action="/api/admin/login"
          method="post"
          className="w-full rounded-2xl border bg-card p-6"
        >
          <BrandLockup className="mb-6" />
          <h1 className="text-2xl font-black">KVIZY administration</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Indtast den server-side ADMIN_SECRET.
          </p>
          <input
            name="secret"
            type="password"
            required
            className="mt-6 h-11 w-full rounded-md border bg-background px-3"
          />
          <button className="mt-3 h-11 w-full rounded-md bg-primary font-bold text-primary-foreground">
            Log ind
          </button>
          <Link
            href="/"
            className="mt-4 block text-center text-sm text-muted-foreground"
          >
            Tilbage til spillet
          </Link>
        </form>
      </main>
    );
  return <AdminDashboard />;
}
