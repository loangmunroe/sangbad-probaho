"use client";

import { useEffect, useState } from "react";

const BN = "০১২৩৪৫৬৭৮৯";
const toBn = (v) => String(v).replace(/\d/g, (d) => BN[d]);
const MONTHS = ["বৈশাখ", "জ্যৈষ্ঠ", "আষাঢ়", "শ্রাবণ", "ভাদ্র", "আশ্বিন", "কার্তিক", "অগ্রহায়ণ", "পৌষ", "মাঘ", "ফাল্গুন", "চৈত্র"];
const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

// বাংলাদেশের সংশোধিত বঙ্গাব্দ পঞ্জিকা (১৪ এপ্রিল = ১ বৈশাখ)
function bangabda(date) {
  const y = date.getFullYear();
  const startYear = date >= new Date(y, 3, 14) ? y : y - 1;
  const start = new Date(startYear, 3, 14);
  let days = Math.floor((date - start) / 86400000);
  const lens = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, isLeap(startYear + 1) ? 30 : 29, 30];
  let m = 0;
  while (m < 11 && days >= lens[m]) {
    days -= lens[m];
    m++;
  }
  return `${toBn(days + 1)} ${MONTHS[m]} ${toBn(startYear - 593)} বঙ্গাব্দ`;
}

export default function TodayDate() {
  const [text, setText] = useState("");
  useEffect(() => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }));
    const greg = new Intl.DateTimeFormat("bn-BD", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now);
    let hijri = "";
    try {
      hijri = new Intl.DateTimeFormat("bn-BD-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" })
        .format(now)
        .replace(/যুগ|AH/g, "")
        .trim() + " হিজরি";
    } catch {}
    setText([greg, bangabda(now), hijri].filter(Boolean).join(" · "));
  }, []);
  return <span suppressHydrationWarning>{text || " "}</span>;
}
