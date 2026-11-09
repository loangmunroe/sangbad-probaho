import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty">
      <h2>পাতাটি পাওয়া যায়নি</h2>
      <p>খবরটি হয়তো পুরনো হয়ে সরিয়ে ফেলা হয়েছে।</p>
      <p><Link href="/">প্রচ্ছদে ফিরে যান →</Link></p>
    </div>
  );
}
