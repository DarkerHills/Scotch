import type { Metadata } from "next";
import { ProductDetailPage } from "@/features/inventory/product-detail-page";

export const metadata: Metadata = { title: "Product" };

export default function Page() {
  return <ProductDetailPage />;
}
