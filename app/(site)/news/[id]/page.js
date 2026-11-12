import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllNews, getCategory, formatTime, getRelated } from "@/lib/news";
import { site, AD_SLOTS, bylineOf } from "@/lib/site";
import NewsCard from "@/components/NewsCard";
import ShareBar from "@/components/ShareBar";
import AdSlot from "@/components/AdSlot";

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
    openGraph: { title: item.title, description: item.excerpt, type: "article", images: item.image ? [item.image] : undefined },
    twitter: { card: item.image ? "summary_large_image" : "summary", title: item.title, description: item.excerpt },
  };
}

export default async function NewsPage({ params }) {
  const { id } = await params;
  const news = getAllNews();
  const item = news.find((n) => n.id === id);
  if (!item) notFound();

  const cat = getCategory(item.category);
  const related = getRelated(item, news, 8);
  const latest = news.filter((n) => n.id !== item.id).slice(0, 6);
  const paras = item.paragraphs || [];

  return (
    <>
      <div className="art-wrap">
        <article className="art">
          <nav className="crumbs" aria-label="অবস্থান">
            <Link href="/">প্রচ্ছদ</Link>
            <span aria-hidden="true">›</span>
            <Link href={`/category/${cat.slug}`} style={{ color: cat.color }}>{cat.name}</Link>
          </nav>
          <h1 className="art-title">{item.title}</h1>
          {item.excerpt && <p className="art-dek">{item.excerpt}</p>}

          <div className="art-meta">
            <div className="art-by-wrap">
              <span className="art-avatar" aria-hidden="true">{bylineOf(item).trim().charAt(0)}</span>
              <div>
                <div className="art-by">{bylineOf(item)}</div>
                <div className="art-time">
                  প্রকাশ: {formatTime(item.publishedAt)}
                  {item.updatedAt && item.updatedAt !== item.publishedAt && new Date(item.updatedAt) - new Date(item.publishedAt) > 600e3 && (
                    <> <span className="dotsep">|</span> আপডেট: {formatTime(item.updatedAt)}</>
                  )}
                </div>
              </div>
            </div>
            <ShareBar title={item.title} />
          </div>

          {item.image && (
            <figure className="art-fig">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt={item.imageCaption || item.title} />
              {(item.imageCaption || item.imageCredit) && (
                <figcaption>
                  {item.imageCaption && <span>{item.imageCaption}</span>}
                  {item.imageCredit && <span className="credit">ছবি: {item.imageCredit}</span>}
                </figcaption>
              )}
            </figure>
          )}

          <div className="art-body">
            {paras.map((p, i) => (
              <div key={i}>
                <p>{p}</p>
                {i === 1 && paras.length > 2 && <AdSlot ad={site.ads.article_inline} size={AD_SLOTS.article_inline.size} className="ad-inline" />}
              </div>
            ))}
          </div>

          {item.tags?.length > 0 && (
            <div className="tags">
              {item.tags.map((t) => <Link key={t} href={`/search?q=${encodeURIComponent(t)}`}>{t}</Link>)}
            </div>
          )}

          <div className="art-share-end">
            <span>খবরটি শেয়ার করুন</span>
            <ShareBar title={item.title} />
          </div>

          <AdSlot ad={site.ads.article_bottom} size={AD_SLOTS.article_bottom.size} className="ad-wide" />
        </article>

        <aside className="art-aside">
          <AdSlot ad={site.ads.sidebar} size={AD_SLOTS.sidebar.size} className="ad-side" />
          <h2 className="latest-h">সর্বশেষ</h2>
          <div className="latest-list">
            {latest.map((n) => <NewsCard key={n.id} item={n} variant="row" />)}
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="sec related">
          <div className="sec-h" style={{ "--c": cat.color }}>
            <h2>সম্পর্কিত খবর</h2>
          </div>
          <div className="grid4">
            {related.map((n) => <NewsCard key={n.id} item={n} variant="card" showCat />)}
          </div>
        </section>
      )}
    </>
  );
}
