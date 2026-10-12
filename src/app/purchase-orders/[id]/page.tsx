import type { Metadata } from "next";
import { PODetailPage } from "@/features/purchase-orders/po-detail-page";

export const metadata: Metadata = { title: "Purchase order" };

export default function Page() {
  return <PODetailPage />;
}
