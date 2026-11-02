import { requireUser } from "@/lib/auth";
import { hasMailKey } from "@/lib/email";
import { listOrders, listProducts } from "@/lib/store";
import { StoreManager } from "@/components/admin/store-manager";

export const dynamic = "force-dynamic";

export default async function StoreAdminPage() {
  await requireUser();
  return (
    <StoreManager
      products={listProducts()}
      orders={listOrders()}
      mailReady={hasMailKey()}
    />
  );
}
