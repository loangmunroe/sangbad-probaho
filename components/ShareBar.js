"use client";

import { useState } from "react";

export default function ShareBar({ title }) {
  const [copied, setCopied] = useState(false);
  const url = () => (typeof window !== "undefined" ? window.location.href : "");
  const open = (u) => window.open(u, "_blank", "noopener,noreferrer,width=640,height=560");

  return (
    <div className="share" aria-label="শেয়ার করুন">
      <button onClick={() => open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url())}`)} aria-label="ফেসবুকে শেয়ার">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M14 8V6.5c0-.8.2-1.3 1.4-1.3H17V2.2c-.3 0-1.2-.2-2.4-.2-2.4 0-4 1.4-4 4.1V8H8v3.3h2.6V22H14V11.3h2.7l.4-3.3H14z" /></svg>
      </button>
      <button onClick={() => open(`https://wa.me/?text=${encodeURIComponent(`${title} ${url()}`)}`)} aria-label="হোয়াটসঅ্যাপে শেয়ার">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8 0-1.4.7-2 1-2.3.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.2.1.6-.1 1.1z" /></svg>
      </button>
      <button
        onClick={async () => {
          try { await navigator.clipboard.writeText(url()); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
        }}
        aria-label="লিংক কপি করুন"
      >
        {copied ? (
          <span className="share-ok">কপি হয়েছে</span>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>
        )}
      </button>
    </div>
  );
}
