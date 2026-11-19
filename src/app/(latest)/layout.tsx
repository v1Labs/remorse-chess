import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LatestRootLayout } from "@/versions/latest";

export const metadata: Metadata = {
  title: "Remorse Chess: an interactive tutorial",
  description: "Learn Remorse Chess, the chess variant where capturing pieces feel guilt.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return <LatestRootLayout>{children}</LatestRootLayout>;
}
