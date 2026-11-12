// "আমাদের সম্পর্কে" ও "গোপনীয়তা নীতি"-র লেখা: খালি লাইন দিয়ে অনুচ্ছেদ, "## " দিয়ে উপশিরোনাম
export default function InfoPage({ title, text }) {
  const blocks = String(text || "").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <article className="info">
      <h1 className="page-title">{title}</h1>
      <div className="info-body">
        {blocks.map((b, i) =>
          b.startsWith("## ") ? <h2 key={i}>{b.slice(3)}</h2> : <p key={i}>{b}</p>
        )}
      </div>
    </article>
  );
}
