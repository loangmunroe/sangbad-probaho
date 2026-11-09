"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import TodayDate from "./TodayDate";

function Icon({ d, size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
const MENU = "M4 6h16M4 12h16M4 18h16";
const CLOSE = "M6 6l12 12M18 6L6 18";
const SEARCH = "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm10 2-4.35-4.35";

export default function SiteHeader({ site }) {
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [q, setQ] = useState("");
  const path = usePathname();
  const router = useRouter();
  const inputRef = useRef(null);

  useEffect(() => { setMenu(false); setSearch(false); }, [path]);
  useEffect(() => { if (search) inputRef.current?.focus(); }, [search]);
  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    const onKey = (e) => e.key === "Escape" && (setMenu(false), setSearch(false));
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  const active = (href) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <>
      <header className="hdr">
        <div className="hdr-top wrap">
          <span className="hdr-date"><TodayDate /></span>
        </div>
        <div className="hdr-main wrap">
          <button className="icon-btn" onClick={() => setMenu(true)} aria-label="সব বিভাগ">
            <Icon d={MENU} />
          </button>
          <Link href="/" className="hdr-logo" aria-label={site.name}>
            <Logo name={site.name} size="lg" />
          </Link>
          <button className="icon-btn" onClick={() => setSearch((s) => !s)} aria-label="খুঁজুন" aria-expanded={search}>
            <Icon d={search ? CLOSE : SEARCH} />
          </button>
        </div>

        {search && (
          <form className="hdr-search wrap" onSubmit={(e) => { e.preventDefault(); if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`); }}>
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="কী খুঁজছেন?" aria-label="খোঁজার শব্দ" />
            <button type="submit">খুঁজুন</button>
          </form>
        )}

        <nav className="nav" aria-label="বিভাগ">
          <div className="nav-in wrap">
            <Link href="/" className={active("/") ? "on" : ""}>সর্বশেষ</Link>
            {site.categories.map((c) => (
              <Link key={c.slug} href={`/category/${c.slug}`} className={active(`/category/${c.slug}`) ? "on" : ""}>{c.name}</Link>
            ))}
          </div>
        </nav>
      </header>

      <div className={`drawer ${menu ? "open" : ""}`} aria-hidden={!menu}>
        <div className="drawer-bg" onClick={() => setMenu(false)} />
        <aside className="drawer-panel" role="dialog" aria-label="সব বিভাগ">
          <div className="drawer-head">
            <Logo name={site.name} size="sm" />
            <button className="icon-btn" onClick={() => setMenu(false)} aria-label="বন্ধ করুন"><Icon d={CLOSE} /></button>
          </div>
          <nav className="drawer-nav">
            <Link href="/">প্রচ্ছদ</Link>
            {site.categories.map((c) => (
              <Link key={c.slug} href={`/category/${c.slug}`}>
                <span className="dot" style={{ background: c.color }} />{c.name}
              </Link>
            ))}
          </nav>
        </aside>
      </div>
    </>
  );
}
