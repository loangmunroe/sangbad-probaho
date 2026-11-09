"use client";

const BN = "০১২৩৪৫৬৭৮৯";
const bn = (v) => String(v).replace(/\d/g, (d) => BN[d]);

export function timeAgo(iso, now = Date.now()) {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "এইমাত্র";
  if (m < 60) return `${bn(m)} মিনিট আগে`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${bn(h)} ঘণ্টা আগে`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${bn(d)} দিন আগে`;
  return new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "long", timeZone: "Asia/Dhaka" }).format(new Date(iso));
}

export default function TimeAgo({ iso }) {
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {timeAgo(iso)}
    </time>
  );
}
