import type { Metadata } from "next";
import { IntegrationDetailPage } from "@/features/integrations/integration-detail-page";

export const metadata: Metadata = { title: "Integration" };

export default function Page() {
  return <IntegrationDetailPage />;
}
