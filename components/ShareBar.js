"use client";

import { useState } from "react";
import { SocialIcon } from "./SocialIcons";

const NETS = [
  { k: "facebook", label: "ফেসবুক", url: (u, t) => `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  { k: "whatsapp", label: "হোয়াটসঅ্যাপ", url: (u, t) => `https://wa.me/?text=${t}%20${u}` },
  { k: "x", label: "এক্স", url: (u, t) => `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
  { k: "telegram", label: "টেলিগ্রাম", url: (u, t) => `https://t.me/share/url?url=${u}&text=${t}` },
  { k: "linkedin", label: "লিংকডইন", url: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
];

export default function ShareBar({ title }) {
  const [copied, setCopied] = useState(false);
  const here = () => (typeof window !== "undefined" ? window.location.href : "");
  const open = (k) => {
    const n = NETS.find((x) => x.k === k);
    window.open(n.url(encodeURIComponent(here()), encodeURIComponent(title)), "_blank", "noopener,noreferrer,width=640,height=560");
  };

  return (
    <div className="share" aria-label="শেয়ার করুন">
      {NETS.map((n) => (
        <button key={n.k} className={`sh-${n.k}`} onClick={() => open(n.k)} aria-label={`${n.label}-এ শেয়ার`} title={n.label}>
          <SocialIcon name={n.k} size={17} />
        </button>
      ))}
      <button
        onClick={async () => {
          try {
            if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
              await navigator.share({ title, url: here() });
              return;
            }
            await navigator.clipboard.writeText(here());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {}
        }}
        aria-label="লিংক কপি বা শেয়ার"
        title="লিংক কপি"
      >
        {copied ? (
          <span className="share-ok">কপি হয়েছে</span>
        ) : (
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>
        )}
      </button>
    </div>
  );
}
