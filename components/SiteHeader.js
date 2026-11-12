"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import TodayDate from "./TodayDate";
import SocialIcons from "./SocialIcons";

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

function SearchForm({ className, autoFocus, onDone }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  const ref = useRef(null);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
  return (
    <form
      className={className}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (!q.trim()) return;
        router.push(`/search?q=${encodeURIComponent(q.trim())}`);
        onDone?.();
      }}
    >
      <Icon d={SEARCH} size={18} />
      <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="খবর খুঁজুন…" aria-label="খবর খুঁজুন" />
      <button type="submit">খুঁজুন</button>
    </form>
  );
}

export default function SiteHeader({ site }) {
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const path = usePathname();

  useEffect(() => { setMenu(false); setSearch(false); }, [path]);
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
        <div className="hdr-top">
          <div className="wrap hdr-top-in">
            <TodayDate />
            <SocialIcons social={site.social} className="social social-top" />
          </div>
        </div>

        <div className="hdr-main wrap">
          <button className="icon-btn" onClick={() => setMenu(true)} aria-label="সব বিভাগ">
            <Icon d={MENU} />
          </button>
          <Link href="/" className="hdr-logo" aria-label={site.name}>
            <Logo name={site.name} src={site.logo} height={site.logoHeight} size="lg" />
          </Link>
          <div className="hdr-right">
            <SearchForm className="search-inline" />
            <button className="icon-btn search-toggle" onClick={() => setSearch((s) => !s)} aria-label="খুঁজুন" aria-expanded={search}>
              <Icon d={search ? CLOSE : SEARCH} />
            </button>
          </div>
        </div>

        {search && <SearchForm className="search-drop wrap" autoFocus onDone={() => setSearch(false)} />}

        <nav className="nav" aria-label="বিভাগ">
          <div className="nav-in wrap">
            <Link href="/" className={active("/") ? "on" : ""}>প্রচ্ছদ</Link>
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
            <Logo name={site.name} src={site.logo} height={site.logoHeight} size="sm" />
            <button className="icon-btn" onClick={() => setMenu(false)} aria-label="বন্ধ করুন"><Icon d={CLOSE} /></button>
          </div>
          <SearchForm className="search-drawer" onDone={() => setMenu(false)} />
          <nav className="drawer-nav">
            <Link href="/">প্রচ্ছদ</Link>
            {site.categories.map((c) => (
              <Link key={c.slug} href={`/category/${c.slug}`}>
                <span className="dot" style={{ background: c.color }} />{c.name}
              </Link>
            ))}
          </nav>
          <div className="drawer-foot">
            <Link href="/about">আমাদের সম্পর্কে</Link>
            <Link href="/privacy">গোপনীয়তা নীতি</Link>
            <SocialIcons social={site.social} />
          </div>
        </aside>
      </div>
    </>
  );
}
