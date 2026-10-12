import { Compass } from "iconoir-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";

export default function NotFound() {
  return (
    <Card>
      <EmptyState
        icon={<Compass />}
        title="This page doesn't exist"
        description="The link may be out of date, or the record belongs to a different demo store."
        action={
          <Button asChild variant="primary">
            <Link href="/">Back to overview</Link>
          </Button>
        }
        secondary={
          <Button asChild variant="secondary">
            <Link href="/inventory">Go to inventory</Link>
          </Button>
        }
      />
    </Card>
  );
}
