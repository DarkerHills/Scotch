import type { Metadata } from "next";
import { POWizardPage } from "@/features/purchase-orders/po-wizard-page";

export const metadata: Metadata = { title: "New purchase order" };

export default function Page() {
  return <POWizardPage />;
}
