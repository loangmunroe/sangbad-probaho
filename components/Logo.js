// সেটিংসে লোগো ছবি দেওয়া থাকলে সেটা, না থাকলে নিজস্ব চিহ্ন + নাম
export default function Logo({ name, src, height = 46, size = "md" }) {
  if (src) {
    const h = size === "sm" ? Math.min(34, height) : size === "md" ? Math.min(40, height) : height;
    return (
      <span className="logo logo-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} style={{ height: h }} />
      </span>
    );
  }
  return (
    <span className={`logo logo-${size}`}>
      <svg className="logo-mark" viewBox="0 0 40 40" aria-hidden="true">
        <rect width="40" height="40" rx="9" fill="var(--green)" />
        <path d="M7 14c4.3-4 8.7-4 13 0s8.7 4 13 0" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <path d="M7 21c4.3-4 8.7-4 13 0s8.7 4 13 0" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round" opacity=".8" />
        <path d="M7 28c4.3-4 8.7-4 13 0s8.7 4 13 0" stroke="var(--red)" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      </svg>
      <span className="logo-word">{name}</span>
    </span>
  );
}
