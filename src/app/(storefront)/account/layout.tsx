import Link from "next/link";
import { requireAuth } from "@/lib/rbac";

const TABS = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/loyalty", label: "Rewards" },
  { href: "/account/referrals", label: "Referrals" },
  { href: "/account/settings", label: "Settings" },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth("/auth/login?next=/account");
  return (
    <div className="container grid grid-cols-1 gap-8 py-10 md:grid-cols-[220px_1fr]">
      <aside>
        <div className="mb-4 rounded-md border p-3 text-sm">
          <div className="font-medium">{user.full_name ?? user.email}</div>
          <div className="text-xs text-muted-foreground">{user.email}</div>
        </div>
        <nav className="flex flex-col gap-1">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} className="rounded-md px-3 py-2 text-sm hover:bg-accent">
              {t.label}
            </Link>
          ))}
          <form action="/api/auth/logout" method="post" className="mt-4">
            <button className="w-full rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10">
              Log out
            </button>
          </form>
        </nav>
      </aside>
      <section>{children}</section>
    </div>
  );
}
