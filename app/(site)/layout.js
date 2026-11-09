import Link from "next/link";
import { site } from "@/lib/news";
import SiteHeader from "@/components/SiteHeader";
import Logo from "@/components/Logo";

export default function SiteLayout({ children }) {
  const year = new Date().getFullYear().toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
  return (
    <>
      <SiteHeader site={{ name: site.name, categories: site.categories }} />

      <main className="wrap main">{children}</main>

      <footer className="ftr">
        <div className="wrap ftr-in">
          <div className="ftr-brand">
            <Logo name={site.name} size="md" />
            <p>{site.tagline}</p>
          </div>
          <nav className="ftr-nav" aria-label="বিভাগ">
            {site.categories.map((c) => (
              <Link key={c.slug} href={`/category/${c.slug}`}>{c.name}</Link>
            ))}
          </nav>
          <p className="ftr-note">
            এখানকার অনেক খবর দেশের বিভিন্ন সংবাদমাধ্যমের প্রতিবেদন থেকে AI-এর সাহায্যে সংক্ষেপে লেখা।
            প্রতিটির সঙ্গে মূল সূত্র ও লিংক দেওয়া আছে।
          </p>
          <p className="ftr-copy">© {year} {site.name}</p>
        </div>
      </footer>
    </>
  );
}
