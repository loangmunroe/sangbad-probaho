import Link from "next/link";
import { getAllNews, getHomeOrder, byCategory, tickerItems } from "@/lib/news";
import { site, AD_SLOTS } from "@/lib/site";
import NewsCard from "@/components/NewsCard";
import Ticker from "@/components/Ticker";
import AdSlot from "@/components/AdSlot";

// পিনের মেয়াদ শেষ হলে ৫ মিনিটের মধ্যে প্রচ্ছদ নিজে আপডেট হবে
export const revalidate = 300;

function SectionHead({ cat }) {
  return (
    <div className="sec-h" style={{ "--c": cat.color }}>
      <h2><Link href={`/category/${cat.slug}`}>{cat.name}</Link></h2>
      <Link href={`/category/${cat.slug}`} className="sec-more">আরও খবর</Link>
    </div>
  );
}

export default function Home() {
  const news = getAllNews();

  if (!news.length) {
    return (
      <div className="empty">
        <h1>প্রথম খবরগুলো আসছে</h1>
        <p>কিছুক্ষণের মধ্যেই এখানে খবর দেখা যাবে।</p>
      </div>
    );
  }

  const ordered = getHomeOrder(news);
  const [lead, ...rest] = ordered;
  const side = rest.slice(0, 3);
  const leadMore = rest.slice(3, 5);
  const strip = rest.slice(5, 9);
  const latest = news.slice(0, 8);
  const shown = new Set([lead, ...side, ...leadMore, ...strip].map((n) => n.id));

  let sectionCount = 0;

  return (
    <>
      <Ticker items={tickerItems(news)} label={site.ticker.label} speed={site.ticker.speed} />

      <section className="top">
        <div className="top-lead">
          <NewsCard item={lead} variant="lead" priority showCat />
          {leadMore.length > 0 && (
            <div className="lead-more">
              {leadMore.map((n) => <NewsCard key={n.id} item={n} variant="row" />)}
            </div>
          )}
        </div>
        <div className="top-side">
          {side.map((n) => <NewsCard key={n.id} item={n} variant="card" showCat />)}
        </div>
        <aside className="latest" aria-labelledby="latest-h">
          <h2 id="latest-h" className="latest-h">সর্বশেষ</h2>
          <div className="latest-list">
            {latest.map((n) => <NewsCard key={n.id} item={n} variant="row" />)}
          </div>
          <AdSlot ad={site.ads.sidebar} size={AD_SLOTS.sidebar.size} className="ad-side" />
        </aside>
      </section>

      <AdSlot ad={site.ads.home_top} size={AD_SLOTS.home_top.size} className="ad-wide" />

      {strip.length > 0 && (
        <section className="strip">
          {strip.map((n) => <NewsCard key={n.id} item={n} variant="card" showCat />)}
        </section>
      )}

      {site.categories.map((c, i) => {
        const items = byCategory(news, c.slug).filter((n) => !shown.has(n.id)).slice(0, 5);
        if (items.length < 2) return null;
        sectionCount += 1;
        const midAd = sectionCount === 3 ? <AdSlot key={`ad-${c.slug}`} ad={site.ads.home_middle} size={AD_SLOTS.home_middle.size} className="ad-wide" /> : null;
        const [first, ...others] = items;
        const body = items.length < 4 ? (
          <div className="grid4">{items.map((n) => <NewsCard key={n.id} item={n} variant="card" />)}</div>
        ) : (
          <div className="sec-grid">
            <div className="sec-first"><NewsCard item={first} variant="lead" /></div>
            <div className="sec-rest">
              {others.map((n) => <NewsCard key={n.id} item={n} variant="row" />)}
            </div>
          </div>
        );
        return [
          midAd,
          <section key={c.slug} className={`sec ${i % 2 ? "sec-alt" : ""}`}>
            <SectionHead cat={c} />
            {body}
          </section>,
        ];
      })}
    </>
  );
}
