import type { Metadata } from "next";
import { OrderDetailPage } from "@/features/online/order-detail-page";

export const metadata: Metadata = { title: "Online order" };

export default function Page() {
  return <OrderDetailPage />;
}
