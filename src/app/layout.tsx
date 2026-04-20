import type { Metadata } from "next";
import { Space_Grotesk, Sora } from "next/font/google";
import "./globals.css";

import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getServerI18n } from "@/lib/i18n/server";

const bodyFont = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const headingFont = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Milsami Ticketing",
  description:
    "Platforma MVP pentru rezervarea biletelor gratuite la Stadionul Municipal Orhei.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, messages } = await getServerI18n();

  return (
    <html
      lang={locale}
      className={`${bodyFont.variable} ${headingFont.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#f7f7f8] text-[#161616]">
        <Providers locale={locale} messages={messages}>
          <div className="relative flex min-h-screen flex-col">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[linear-gradient(135deg,rgba(220,38,38,0.14),rgba(255,255,255,0))]" />
            <SiteHeader />
            <main className="relative flex flex-1 flex-col">{children}</main>
            <SiteFooter />
          </div>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
