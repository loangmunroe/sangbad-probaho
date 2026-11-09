import Link from "next/link";
import { getAllNews, getHomeOrder, site, byCategory } from "@/lib/news";
import NewsCard from "@/components/NewsCard";
import Ticker from "@/components/Ticker";

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
        <p>অটোমেটিক সিস্টেম চালু হলে এখানে খবর দেখা যাবে। GitHub-এর Actions ট্যাব থেকে “Fetch news” একবার চালিয়ে দিন।</p>
      </div>
    );
  }

  const ordered = getHomeOrder(news);
  const [lead, ...rest] = ordered;
  const side = rest.slice(0, 3);
  const leadMore = rest.slice(3, 5);
  const strip = rest.slice(5, 9);
  const latest = news.slice(0, 7);
  const shown = new Set([lead, ...side, ...leadMore, ...strip].map((n) => n.id));

  return (
    <>
      <Ticker items={news.slice(0, 10)} />

      <section className="top">
        <div className="top-lead">
          <NewsCard item={lead} variant="lead" priority />
          {leadMore.length > 0 && (
            <div className="lead-more">
              {leadMore.map((n) => <NewsCard key={n.id} item={n} variant="row" />)}
            </div>
          )}
        </div>
        <div className="top-side">
          {side.map((n) => <NewsCard key={n.id} item={n} variant="card" />)}
        </div>
        <aside className="latest" aria-labelledby="latest-h">
          <h2 id="latest-h" className="latest-h">সর্বশেষ</h2>
          <div className="latest-list">
            {latest.map((n) => <NewsCard key={n.id} item={n} variant="row" />)}
          </div>
        </aside>
      </section>

      {strip.length > 0 && (
        <section className="strip">
          {strip.map((n) => <NewsCard key={n.id} item={n} variant="card" />)}
        </section>
      )}

      {site.categories.map((c, i) => {
        const items = byCategory(news, c.slug).filter((n) => !shown.has(n.id)).slice(0, 5);
        if (items.length < 2) return null;
        const [first, ...others] = items;
        if (items.length < 4) {
          return (
            <section key={c.slug} className="sec">
              <SectionHead cat={c} />
              <div className="grid4">{items.map((n) => <NewsCard key={n.id} item={n} variant="card" />)}</div>
            </section>
          );
        }
        return (
          <section key={c.slug} className={`sec ${i % 2 ? "sec-alt" : ""}`}>
            <SectionHead cat={c} />
            <div className="sec-grid">
              <div className="sec-first"><NewsCard item={first} variant="lead" /></div>
              <div className="sec-rest">
                {others.map((n) => <NewsCard key={n.id} item={n} variant="row" />)}
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
