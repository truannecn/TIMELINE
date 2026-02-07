import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Noto_Serif_KR } from "next/font/google";
import "./globals.css";
import { AmplifyProvider } from "@/components/providers/amplify-provider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: true,
});

const notoSerifKR = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-serif-display",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "timeline — Create. Explore. Expand. Conquer.",
  description:
    "An AI-free artist portfolio and social platform. Share your authentic work with a community that values human creativity.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      <body className={`${inter.className} ${jetbrainsMono.variable} ${notoSerifKR.variable}`}>
        <AmplifyProvider>{children}</AmplifyProvider>
      </body>
    </html>
  );
}
