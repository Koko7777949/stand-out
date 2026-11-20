import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Stand Out | احجز تذكرتك — Build Your Future Summit 2026",
  description:
    "Build Your Future Summit 2026 — السبت 21 نوفمبر 2026 في The GrEEK Campus وسط البلد، القاهرة. القمة اللي بتخليك تفرّق. الدخول مجاني، والمقاعد محدودة — احجز مقعدك وشارك دعوتك واجمع نقاط.",
  keywords: ["Stand Out", "Build Your Future Summit", "BYF Summit 2026", "Stand Out 2026", "قمة Stand Out", "حجز تذاكر", "The GrEEK Campus", "مسار"],
  authors: [{ name: "Stand Out — مبادرة مسار" }],
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "احجز مقعدك — Build Your Future Summit 2026",
    description:
      "السبت 21 نوفمبر 2026 في The GrEEK Campus وسط البلد. الدخول مجاني والمقاعد محدودة. احجز، ادعُ أصحابك، واجمع نقاط.",
    siteName: "Stand Out",
    type: "website",
    locale: "ar_EG",
  },
  twitter: {
    card: "summary_large_image",
    title: "Build Your Future Summit 2026 | احجز مجانًا",
    description: "السبت 21 نوفمبر 2026 — The GrEEK Campus وسط البلد، القاهرة. مقاعد محدودة.",
  },
};

export const viewport: Viewport = {
  themeColor: "#211434",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Schibsted+Grotesk:ital,wght@0,400..900;1,400..900&family=Cairo:wght@400;600;700;800;900&family=Courier+Prime:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster
          position="top-center"
          theme="light"
          toastOptions={{
            style: {
              background: "#FFFFFF",
              border: "3px solid #211434",
              boxShadow: "5px 5px 0 0 #211434",
              color: "#211434",
              fontWeight: 700,
              borderRadius: "12px",
            },
          }}
        />
      </body>
    </html>
  );
}
