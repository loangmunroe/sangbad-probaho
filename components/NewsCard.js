import Link from "next/link";
import { getCategory } from "@/lib/news";
import TimeAgo from "./TimeAgo";

function Img({ item, ratio = "16/10", priority = false }) {
  return (
    <div className="ph" style={{ aspectRatio: ratio }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.image}
        alt={item.imageCaption || item.title}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
      />
    </div>
  );
}

export function Meta({ item, showCat = false }) {
  const cat = getCategory(item.category);
  return (
    <div className="meta">
      {showCat && <Link href={`/category/${cat.slug}`} className="meta-cat" style={{ color: cat.color }}>{cat.name}</Link>}
      <TimeAgo iso={item.publishedAt} />
    </div>
  );
}

/**
 * খবরের কার্ড। ছবি না থাকলে ছবির জায়গা ফাঁকা না রেখে লেখাভিত্তিক কার্ড দেখায়।
 */
export default function NewsCard({ item, variant = "card", priority = false, showCat = false }) {
  const href = `/news/${item.id}`;
  const has = Boolean(item.image);

  if (variant === "lead") {
    return (
      <article className={`c-lead ${has ? "" : "no-img"}`}>
        {has && <Link href={href} className="c-lead-img" tabIndex={-1} aria-hidden="true"><Img item={item} priority={priority} /></Link>}
        {!has && <Link href={`/category/${getCategory(item.category).slug}`} className="kicker" style={{ color: getCategory(item.category).color }}>{getCategory(item.category).name}</Link>}
        <h2 className="h-lead"><Link href={href}>{item.title}</Link></h2>
        {item.excerpt && <p className="dek">{item.excerpt}</p>}
        <Meta item={item} showCat={showCat && has} />
      </article>
    );
  }

  if (variant === "row") {
    return (
      <article className={`c-row ${has ? "" : "no-img"}`}>
        <div className="c-row-text">
          <h3 className="h-row"><Link href={href}>{item.title}</Link></h3>
          <Meta item={item} showCat={showCat} />
        </div>
        {has && <Link href={href} className="c-row-img" tabIndex={-1} aria-hidden="true"><Img item={item} ratio="4/3" /></Link>}
      </article>
    );
  }

  if (variant === "mini") {
    return (
      <article className="c-mini">
        <h3 className="h-mini"><Link href={href}>{item.title}</Link></h3>
        <Meta item={item} />
      </article>
    );
  }

  return (
    <article className={`c-card ${has ? "" : "no-img"}`}>
      {has && <Link href={href} tabIndex={-1} aria-hidden="true"><Img item={item} /></Link>}
      <h3 className="h-card"><Link href={href}>{item.title}</Link></h3>
      {!has && item.excerpt && <p className="dek dek-sm">{item.excerpt}</p>}
      <Meta item={item} showCat={showCat} />
    </article>
  );
}
