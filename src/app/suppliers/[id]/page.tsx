import type { Metadata } from "next";
import { SupplierDetailPage } from "@/features/suppliers/supplier-detail-page";

export const metadata: Metadata = { title: "Supplier" };

export default function Page() {
  return <SupplierDetailPage />;
}
