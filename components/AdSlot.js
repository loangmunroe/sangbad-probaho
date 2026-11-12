"use client";

import { useEffect, useRef } from "react";

/**
 * বিজ্ঞাপনের জায়গা। সেটিংস থেকে তিনভাবে দেওয়া যায়:
 *  - ছবি + লিংক
 *  - HTML/স্ক্রিপ্ট কোড (যেমন Google AdSense)
 *  - কিছু না দিলে কিন্তু চালু থাকলে "বিজ্ঞাপন" লেখা খালি জায়গা দেখায়
 */
export default function AdSlot({ ad, size, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ad?.enabled || !ad.html || !ref.current) return;
    const box = ref.current;
    box.innerHTML = ad.html;
    // innerHTML দিয়ে বসানো <script> চলে না, তাই নতুন করে তৈরি করে চালানো
    box.querySelectorAll("script").forEach((old) => {
      const s = document.createElement("script");
      for (const a of old.attributes) s.setAttribute(a.name, a.value);
      s.text = old.text;
      old.replaceWith(s);
    });
  }, [ad?.enabled, ad?.html]);

  if (!ad?.enabled) return null;

  return (
    <aside className={`ad ${className}`} aria-label="বিজ্ঞাপন">
      <span className="ad-label">বিজ্ঞাপন</span>
      {ad.html ? (
        <div ref={ref} className="ad-html" />
      ) : ad.image ? (
        <a href={ad.link || "#"} target="_blank" rel="noopener sponsored" className="ad-img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ad.image} alt="বিজ্ঞাপন" loading="lazy" />
        </a>
      ) : (
        <div className="ad-empty">বিজ্ঞাপনের জন্য নির্ধারিত জায়গা{size ? ` · ${size}` : ""}</div>
      )}
    </aside>
  );
}
