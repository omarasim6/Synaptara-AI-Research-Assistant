import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/providers/SessionProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { AvatarProvider } from "@/providers/AvatarProvider";
import AssistantMount from "@/app/components/assistant/AssistantMount";

/* Runs before paint to avoid a flash of the wrong theme. */
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('synaptara-theme');
    var isDark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

const SITE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
const SITE_NAME = "Synaptara";
const TITLE = "Synaptara – Your AI Research Assistant";
const DESCRIPTION =
  "Synaptara reads every paper, blog, and newsletter so you don't have to & then summarizes, organizes, and cites it for you.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · Synaptara",
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "AI research assistant",
    "literature review",
    "paper summarizer",
    "research search engine",
    "arXiv search",
    "citation generator",
  ],
  authors: [{ name: "Synaptara" }],
  alternates: {
    // Relative to metadataBase, so this resolves against NEXTAUTH_URL in
    // every environment without hardcoding a domain.
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    // Falls back to the generated app/opengraph-image.tsx (1200×630) if
    // no page-specific image is provided.
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    // Falls back to the generated app/opengraph-image.tsx as well.
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <Providers>
            <ToastProvider>
              <AvatarProvider>
                {children}
                <AssistantMount />
              </AvatarProvider>
            </ToastProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
