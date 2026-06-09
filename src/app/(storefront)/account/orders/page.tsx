import { requireAuth } from "@/lib/rbac";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await requireAuth();
  const supabase = await createSupabaseServer();
  const { data: orders } = await supabase
    .from("orders").select("id, order_number, status, payment_status, total, currency, created_at")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl font-bold">Your orders</h1>
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(orders ?? []).map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.order_number}</TableCell>
                <TableCell>{new Date(o.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant={
                    o.status === "delivered" ? "success"
                    : o.status === "cancelled" || o.status === "failed" ? "destructive"
                    : "secondary"
                  }>{o.status}</Badge>
                </TableCell>
                <TableCell className="text-right">{o.currency} {Number(o.total).toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/account/orders/${o.id}`} className="text-sm text-primary underline">View</Link>
                </TableCell>
              </TableRow>
            ))}
            {!orders?.length && (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No orders yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
