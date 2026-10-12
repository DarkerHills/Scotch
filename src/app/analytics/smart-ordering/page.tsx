import type { Metadata } from "next";
import { SmartOrderingPage } from "@/features/analytics/smart-ordering-page";

export const metadata: Metadata = { title: "Smart ordering" };

export default function Page() {
  return <SmartOrderingPage />;
}
