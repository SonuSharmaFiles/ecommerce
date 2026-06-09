"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Ticket, Truck,
  Megaphone, BarChart3, FileText, Settings, Bot, Sparkles, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin/dashboard",   icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/products",    icon: Package,         label: "Products" },
  { href: "/admin/orders",      icon: ShoppingCart,    label: "Orders" },
  { href: "/admin/customers",   icon: Users,           label: "Customers" },
  { href: "/admin/coupons",     icon: Ticket,          label: "Coupons" },
  { href: "/admin/suppliers",   icon: Truck,           label: "Suppliers" },
  { href: "/admin/marketing",   icon: Megaphone,       label: "Marketing" },
  { href: "/admin/analytics",   icon: BarChart3,       label: "Analytics" },
  { href: "/admin/blog",        icon: FileText,        label: "Blog" },
  { href: "/admin/ai",          icon: Sparkles,        label: "AI tools" },
  { href: "/admin/chat",        icon: Bot,             label: "Chat" },
  { href: "/admin/settings",    icon: Settings,        label: "Settings" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-card md:flex md:flex-col">
      <div className="border-b p-5">
        <Link href="/admin/dashboard" className="font-display text-lg font-bold">ShopFlow Admin</Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3 text-sm">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </Link>
          );
        })}
      </nav>
      <form action="/api/auth/logout" method="post" className="border-t p-3">
        <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </form>
    </aside>
  );
}
