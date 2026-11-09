import Link from "next/link";
import { getCategory } from "@/lib/news";
import TimeAgo from "./TimeAgo";

/** ছবি; না থাকলে লোগো-চিহ্নসহ শান্ত ধূসর জায়গা */
export function Thumb({ item, ratio = "16/10", sizes }) {
  if (item.image) {
    return (
      <div className="ph" style={{ aspectRatio: ratio }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.image} alt={item.imageCaption || item.title} loading="lazy" sizes={sizes} />
      </div>
    );
  }
  const cat = getCategory(item.category);
  return (
    <div className="ph ph-empty" style={{ aspectRatio: ratio, "--c": cat.color }}>
      <svg viewBox="0 0 40 24" aria-hidden="true">
        <path d="M2 6c4.3-4 8.7-4 13 0s8.7 4 13 0 8.7-4 10-2" />
        <path d="M2 13c4.3-4 8.7-4 13 0s8.7 4 13 0 8.7-4 10-2" />
        <path d="M2 20c4.3-4 8.7-4 13 0s8.7 4 13 0 8.7-4 10-2" />
      </svg>
    </div>
  );
}

export function Meta({ item, showCat = false }) {
  const cat = getCategory(item.category);
  const by = item.manual ? item.author || item.source : item.source;
  return (
    <div className="meta">
      {showCat && <span className="meta-cat" style={{ color: cat.color }}>{cat.name}</span>}
      <TimeAgo iso={item.publishedAt} />
      {by && <span className="pill">{by}</span>}
    </div>
  );
}

export default function NewsCard({ item, variant = "card", priority = false }) {
  const href = `/news/${item.id}`;

  if (variant === "lead") {
    return (
      <article className="c-lead">
        <Link href={href} className="c-lead-img">
          {item.image ? (
            <div className="ph" style={{ aspectRatio: "16/10" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt={item.imageCaption || item.title} fetchPriority={priority ? "high" : undefined} />
            </div>
          ) : <Thumb item={item} />}
        </Link>
        <h2 className="h-lead"><Link href={href}>{item.title}</Link></h2>
        {item.excerpt && <p className="dek">{item.excerpt}</p>}
        <Meta item={item} />
      </article>
    );
  }

  if (variant === "row") {
    return (
      <article className="c-row">
        <div className="c-row-text">
          <h3 className="h-row"><Link href={href}>{item.title}</Link></h3>
          <Meta item={item} />
        </div>
        <Link href={href} className="c-row-img" tabIndex={-1} aria-hidden="true"><Thumb item={item} ratio="4/3" /></Link>
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
    <article className="c-card">
      <Link href={href} tabIndex={-1} aria-hidden="true"><Thumb item={item} /></Link>
      <h3 className="h-card"><Link href={href}>{item.title}</Link></h3>
      <Meta item={item} />
    </article>
  );
}
