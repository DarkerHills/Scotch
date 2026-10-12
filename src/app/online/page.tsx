import type { Metadata } from "next";
import { OnlinePage } from "@/features/online/online-page";

export const metadata: Metadata = { title: "Online sales" };

export default function Page() {
  return <OnlinePage />;
}
