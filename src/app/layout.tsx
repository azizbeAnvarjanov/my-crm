import type { Metadata } from "next";
import { QueryProvider } from "@/lib/providers/query-provider";
import { ThemeProvider } from "@/lib/providers/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Pro - Enterprise Customer Management",
  description: "Professional CRM solution for modern businesses. Manage contacts, projects, and communications in one place.",
  keywords: ["CRM", "customer management", "business", "enterprise", "contacts", "projects"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider defaultTheme="dark" storageKey="crm-theme">
          <QueryProvider>
            {children}
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
