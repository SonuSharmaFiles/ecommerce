import { AdminSidebar } from "@/components/admin/sidebar";
import { requireAdmin } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="container max-w-6xl py-8">{children}</div>
      </main>
    </div>
  );
}
