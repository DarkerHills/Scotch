"use client";

import { Bell, DoubleCheck } from "iconoir-react";
import { useState } from "react";
import { useApp, useData } from "@/lib/store/app-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";
import { SegmentedControl } from "@/components/ui/tabs";
import { NotificationList } from "@/components/shell/notification-list";

export function NotificationsPage() {
  const data = useData();
  const markAll = useApp((s) => s.markAllNotificationsRead);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const unread = data.notifications.filter((n) => !n.read);
  const items = filter === "unread" ? unread : data.notifications;
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Stock alerts, purchase order updates, channel sync issues and new orders."
        actions={
          <Button variant="secondary" leftIcon={<DoubleCheck />} onClick={markAll} disabled={unread.length === 0}>
            Mark all as read
          </Button>
        }
      />
      <div className="mb-4">
        <SegmentedControl
          aria-label="Filter notifications"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: data.notifications.length },
            { value: "unread", label: "Unread", count: unread.length },
          ]}
        />
      </div>
      <Card className="overflow-hidden">
        {items.length === 0 ? (
          <EmptyState
            icon={<Bell />}
            title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
            description={filter === "unread" ? "You're all caught up." : "We'll alert you here when stock runs low, orders change or a channel needs attention."}
            action={
              filter === "unread" && data.notifications.length > 0 ? (
                <Button size="sm" variant="secondary" onClick={() => setFilter("all")}>
                  Show all
                </Button>
              ) : undefined
            }
          />
        ) : (
          <NotificationList items={items} />
        )}
      </Card>
    </>
  );
}
