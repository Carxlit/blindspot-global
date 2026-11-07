import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blindspot - Autonomous Newsroom",
  description: "Blindspot autonomous newsroom dashboard: global news radar, omnichannel queue, and channel health.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 antialiased selection:bg-rose-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
