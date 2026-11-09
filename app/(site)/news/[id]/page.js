import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllNews, getCategory, formatTime } from "@/lib/news";
import NewsCard from "@/components/NewsCard";
import ShareBar from "@/components/ShareBar";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllNews().map((n) => ({ id: n.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const item = getAllNews().find((n) => n.id === id);
  if (!item) return {};
  return {
    title: item.title,
    description: item.excerpt,
    openGraph: { title: item.title, description: item.excerpt, images: item.image ? [item.image] : undefined },
  };
}

export default async function NewsPage({ params }) {
  const { id } = await params;
  const news = getAllNews();
  const item = news.find((n) => n.id === id);
  if (!item) notFound();

  const cat = getCategory(item.category);
  const related = news.filter((n) => n.category === item.category && n.id !== item.id).slice(0, 4);
  const latest = news.filter((n) => n.id !== item.id).slice(0, 6);
  const byline = item.manual ? item.author || "নিজস্ব প্রতিবেদক" : item.source;

  return (
    <>
      <div className="art-wrap">
        <article className="art">
          <Link href={`/category/${cat.slug}`} className="art-cat" style={{ color: cat.color }}>{cat.name}</Link>
          <h1 className="art-title">{item.title}</h1>
          {item.excerpt && <p className="art-dek">{item.excerpt}</p>}

          <div className="art-meta">
            <div>
              <div className="art-by">{item.manual ? byline : <>সূত্র: {byline}</>}</div>
              <div className="art-time">প্রকাশ: {formatTime(item.publishedAt)}</div>
            </div>
            <ShareBar title={item.title} />
          </div>

          {item.image && (
            <figure className="art-fig">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt={item.imageCaption || item.title} />
              {(item.imageCaption || item.imageCredit) && (
                <figcaption>
                  {item.imageCaption}
                  {item.imageCredit && (
                    <span className="credit">
                      ছবি:{" "}
                      {item.imageCreditUrl
                        ? <a href={item.imageCreditUrl} target="_blank" rel="noopener noreferrer">{item.imageCredit}</a>
                        : item.imageCredit}
                    </span>
                  )}
                </figcaption>
              )}
            </figure>
          )}

          <div className="art-body">
            {item.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </div>

          {item.tags?.length > 0 && (
            <div className="tags">
              {item.tags.map((t) => <Link key={t} href={`/search?q=${encodeURIComponent(t)}`}>{t}</Link>)}
            </div>
          )}

          {item.sourceUrl && (
            <a className="src-box" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
              <span className="src-label">পুরো প্রতিবেদন</span>
              <span className="src-name">{item.source ? `${item.source}-এ পড়ুন` : "মূল সূত্রে পড়ুন"}</span>
            </a>
          )}
          {item.alsoReportedBy?.length > 0 && (
            <p className="also">
              একই খবর আরও প্রকাশ করেছে{" "}
              {item.alsoReportedBy.map((a, i) => (
                <span key={a.url}>
                  {i > 0 && ", "}
                  <a href={a.url} target="_blank" rel="noopener noreferrer">{a.name}</a>
                </span>
              ))}
            </p>
          )}
          {item.manual && item.source && !item.sourceUrl && <p className="note">সূত্র: {item.source}</p>}
          {!item.manual && <p className="note">মূল প্রতিবেদনের তথ্য থেকে AI-এর সাহায্যে সংক্ষেপে লেখা।</p>}
        </article>

        <aside className="art-aside">
          <h2 className="latest-h">সর্বশেষ</h2>
          <div className="latest-list">
            {latest.map((n) => <NewsCard key={n.id} item={n} variant="row" />)}
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="sec">
          <div className="sec-h" style={{ "--c": cat.color }}>
            <h2><Link href={`/category/${cat.slug}`}>{cat.name} নিয়ে আরও</Link></h2>
          </div>
          <div className="grid4">
            {related.map((n) => <NewsCard key={n.id} item={n} variant="card" />)}
          </div>
        </section>
      )}
    </>
  );
}
