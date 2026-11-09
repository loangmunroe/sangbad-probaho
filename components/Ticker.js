import Link from "next/link";

export default function Ticker({ items }) {
  if (!items.length) return null;
  const row = items.map((n) => (
    <Link key={n.id} href={`/news/${n.id}`} className="tick-item">{n.title}</Link>
  ));
  return (
    <div className="ticker" role="region" aria-label="সদ্য পাওয়া খবর">
      <span className="ticker-label"><span className="live" />সদ্য</span>
      <div className="ticker-track">
        <div className="ticker-move">
          {row}
          <span aria-hidden="true">{row}</span>
        </div>
      </div>
    </div>
  );
}
