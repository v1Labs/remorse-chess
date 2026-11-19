import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RootLayout } from "@/versions/v1/RootLayout";

export const metadata: Metadata = {
  title: "Remorse Chess v1: an interactive tutorial",
  description: "Version 1 of the Remorse Chess tutorial.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return <RootLayout>{children}</RootLayout>;
}
