import type { Metadata } from "next";
import { POListPage } from "@/features/purchase-orders/po-list-page";

export const metadata: Metadata = { title: "Purchase orders" };

export default function Page() {
  return <POListPage />;
}
