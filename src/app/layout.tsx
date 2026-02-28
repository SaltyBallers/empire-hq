import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Empire HQ - Admin Dashboard",
  description: "Centralized admin dashboard for monitoring all Empire ventures",
  keywords: ["admin", "dashboard", "monitoring", "empire"],
  authors: [{ name: "Empire HQ Team" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}