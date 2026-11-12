"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * মসৃণ শিরোনাম টিকার: লেখার দৈর্ঘ্য মেপে গতি ঠিক হয় (সব ফোনে একই গতি),
 * মাউস রাখলে বা আঙুল ছোঁয়ালে থামে, দুই পাশে হালকা ফেড।
 */
export default function Ticker({ items, label = "শিরোনাম", speed = 60 }) {
  const moveRef = useRef(null);
  const [dur, setDur] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = moveRef.current;
    if (!el) return;
    const measure = () => setDur(Math.max(20, el.scrollWidth / 2 / Math.max(20, speed)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items, speed]);

  if (!items.length) return null;

  const row = (hidden) =>
    items.map((n, i) =>
      n.href ? (
        <Link key={`${hidden}-${i}`} href={n.href} className="tick-item" tabIndex={hidden ? -1 : undefined}>{n.title}</Link>
      ) : (
        <span key={`${hidden}-${i}`} className="tick-item">{n.title}</span>
      )
    );

  return (
    <div className="ticker" role="region" aria-label={label}>
      <span className="ticker-label"><span className="live" aria-hidden="true" />{label}</span>
      <div
        className="ticker-track"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div
          ref={moveRef}
          className="ticker-move"
          style={{ animationDuration: dur ? `${dur}s` : undefined, animationPlayState: paused ? "paused" : "running" }}
        >
          <span className="tick-row">{row(false)}</span>
          <span className="tick-row" aria-hidden="true">{row(true)}</span>
        </div>
      </div>
    </div>
  );
}
