import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RootLayout } from "@/versions/v3/RootLayout";

export const metadata: Metadata = {
  title: "Remorse Chess v3: an interactive tutorial",
  description: "Version 3 of the Remorse Chess tutorial.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return <RootLayout>{children}</RootLayout>;
}
