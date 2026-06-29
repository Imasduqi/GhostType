import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { AchievementToast } from "@/components/achievements/AchievementToast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const pressStart2P = Press_Start_2P({
  variable: "--font-press-start-2p",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GhostType - Split-Flap Departure Board Typing Race",
  description: "Latih kecepatan mengetik Anda dan berlombalah melawan ghost rekor terbaik Anda dengan visual papan keberangkatan fisik klasik.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${pressStart2P.variable} h-full antialiased`}
      suppressHydrationWarning={true}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme') || 'system';
                  var resolved = saved;
                  if (saved === 'system') {
                    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', resolved);
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {children}
          <AchievementToast />
        </ThemeProvider>
      </body>
    </html>
  );
}

