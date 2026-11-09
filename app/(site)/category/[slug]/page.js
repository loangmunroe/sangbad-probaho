import { notFound } from "next/navigation";
import { getAllNews, site, byCategory } from "@/lib/news";
import NewsCard from "@/components/NewsCard";

export const dynamicParams = false;
export const revalidate = 300;

export function generateStaticParams() {
  return site.categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const c = site.categories.find((x) => x.slug === slug);
  return c ? { title: c.name } : {};
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const cat = site.categories.find((c) => c.slug === slug);
  if (!cat) notFound();
  const items = byCategory(getAllNews(), slug);
  const [lead, ...rest] = items;

  return (
    <>
      <h1 className="page-title" style={{ "--c": cat.color }}>{cat.name}</h1>
      {!items.length ? (
        <div className="empty"><p>এই বিভাগে এখনো খবর আসেনি। একটু পরে আবার দেখুন।</p></div>
      ) : (
        <>
          <section className="cat-top">
            <div className="cat-lead"><NewsCard item={lead} variant="lead" priority /></div>
            <div className="cat-side">
              {rest.slice(0, 4).map((n) => <NewsCard key={n.id} item={n} variant="row" />)}
            </div>
          </section>
          {rest.length > 4 && (
            <section className="grid4">
              {rest.slice(4).map((n) => <NewsCard key={n.id} item={n} variant="card" />)}
            </section>
          )}
        </>
      )}
    </>
  );
}
