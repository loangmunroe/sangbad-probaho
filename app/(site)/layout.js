import Link from "next/link";
import { site, AD_SLOTS } from "@/lib/site";
import SiteHeader from "@/components/SiteHeader";
import Logo from "@/components/Logo";
import SocialIcons from "@/components/SocialIcons";
import AdSlot from "@/components/AdSlot";
import Tracker from "@/components/Tracker";

const bn = (v) => String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);

export default function SiteLayout({ children }) {
  const year = bn(new Date().getFullYear());
  const headerSite = {
    name: site.name, logo: site.logo, logoHeight: site.logoHeight,
    categories: site.categories, social: site.social,
  };

  return (
    <>
      <SiteHeader site={headerSite} />
      <div className="wrap"><AdSlot ad={site.ads.header} size={AD_SLOTS.header.size} className="ad-header" /></div>

      <main className="wrap main">{children}</main>

      <footer className="ftr">
        <div className="wrap ftr-in">
          <div className="ftr-brand">
            <Logo name={site.name} src={site.logo} height={site.logoHeight} size="md" />
            {site.footerText && <p className="ftr-slogan">{site.footerText}</p>}
            <SocialIcons social={site.social} className="social social-ftr" />
          </div>

          <nav className="ftr-nav" aria-label="বিভাগ">
            {site.categories.map((c) => (
              <Link key={c.slug} href={`/category/${c.slug}`}>{c.name}</Link>
            ))}
          </nav>

          <div className="ftr-contact">
            {site.editor && <p><span>সম্পাদক</span>{site.editor}</p>}
            {site.publisher && <p><span>প্রকাশক</span>{site.publisher}</p>}
            {site.address && <p><span>কার্যালয়</span>{site.address}</p>}
            {site.phone && <p><span>ফোন</span><a href={`tel:${site.phone.replace(/[^\d+]/g, "")}`}>{site.phone}</a></p>}
            {site.email && <p><span>ইমেইল</span><a href={`mailto:${site.email}`}>{site.email}</a></p>}
          </div>
        </div>

        <div className="ftr-bottom">
          <div className="wrap ftr-bottom-in">
            <span>© {year} {site.name}। সর্বস্বত্ব সংরক্ষিত।</span>
            <nav>
              <Link href="/about">আমাদের সম্পর্কে</Link>
              <Link href="/privacy">গোপনীয়তা নীতি</Link>
            </nav>
          </div>
        </div>
      </footer>
      <Tracker />
    </>
  );
}
