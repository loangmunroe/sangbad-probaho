import { getAllNews } from "@/lib/news";
import NewsCard from "@/components/NewsCard";

export const metadata = { title: "খুঁজুন", robots: { index: false } };

const BN = "০১২৩৪৫৬৭৮৯";
const bn = (v) => String(v).replace(/\d/g, (d) => BN[d]);

export default async function SearchPage({ searchParams }) {
  const { q = "" } = await searchParams;
  const term = String(q).trim();
  const words = term.split(/\s+/).filter(Boolean);
  const results = words.length
    ? getAllNews().filter((n) => {
        const hay = `${n.title} ${n.excerpt || ""} ${(n.tags || []).join(" ")} ${(n.paragraphs || []).join(" ")}`;
        return words.every((w) => hay.includes(w));
      })
    : [];

  return (
    <>
      <form className="search-big" action="/search">
        <input name="q" defaultValue={term} placeholder="কী খুঁজছেন?" aria-label="খোঁজার শব্দ" />
        <button type="submit">খুঁজুন</button>
      </form>
      {term && (
        <p className="search-count">
          “{term}” লিখে {results.length ? `${bn(results.length)}টি খবর পাওয়া গেছে` : "কোনো খবর পাওয়া যায়নি। অন্য শব্দ দিয়ে চেষ্টা করুন।"}
        </p>
      )}
      <div className="search-list">
        {results.slice(0, 60).map((n) => <NewsCard key={n.id} item={n} variant="row" />)}
      </div>
    </>
  );
}
