import "./globals.css";
import { site, fontStylesheets, fontVars } from "@/lib/site";

export const metadata = {
  title: { default: `${site.name} | ${site.tagline}`, template: `%s | ${site.name}` },
  description: site.tagline,
  icons: { icon: site.favicon || "/favicon.svg", apple: site.favicon || "/favicon.svg" },
  openGraph: { siteName: site.name, locale: "bn_BD", type: "website" },
};

export const viewport = { themeColor: "#006a4e" };

export default function RootLayout({ children }) {
  return (
    <html lang="bn" style={fontVars()}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {fontStylesheets().map((href) => <link key={href} rel="stylesheet" href={href} />)}
      </head>
      <body>{children}</body>
    </html>
  );
}
