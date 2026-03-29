import React from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";

export const metadata = {
  title: "Dashboard | Harvest Finance",
  description: "View and manage your vaults and portfolio",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
