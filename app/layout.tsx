import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Two Truths, One Lie",
  description: "A real-time party game for teams. Submit, vote, and find the liar.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-full">
        <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
