import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found · Remorse Chess",
};

// Each version has its own root layout, so unmatched URLs need a standalone 404 page.
// It uses inline styles to stay independent of any version's stylesheet.
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f6f2ec",
          color: "#2a211c",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <main>
          <p style={{ fontSize: 48, margin: 0 }} aria-hidden>
            😢
          </p>
          <h1 style={{ margin: "8px 0" }}>This square is empty</h1>
          <p>
            <Link href="/" style={{ color: "#9f1239" }}>
              Back to the tutorial
            </Link>
          </p>
        </main>
      </body>
    </html>
  );
}
