import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RootLayout } from "@/versions/v6/RootLayout";

export const metadata: Metadata = {
  title: "Remorse Chess v6: an interactive tutorial",
  description: "Version 6 of the Remorse Chess tutorial.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return <RootLayout>{children}</RootLayout>;
}
