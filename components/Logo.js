// নিজস্ব লোগো: "প্রবাহ" = স্রোত, তাই তিনটি ঢেউয়ের রেখা
export default function Logo({ name, size = "md" }) {
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
