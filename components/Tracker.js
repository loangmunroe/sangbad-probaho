"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// প্রতিটা পাতা দেখার সময় ভিজিটর পরিসংখ্যানের জন্য একটা ছোট অনুরোধ পাঠায়
export default function Tracker() {
  const path = usePathname();
  useEffect(() => {
    const body = JSON.stringify({ path, ref: document.referrer || "", w: window.innerWidth });
    try {
      if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      else fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
    } catch {}
  }, [path]);
  return null;
}
