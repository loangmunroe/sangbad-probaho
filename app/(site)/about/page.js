import { site } from "@/lib/site";
import InfoPage from "@/components/InfoPage";

export const metadata = { title: "আমাদের সম্পর্কে" };

export default function About() {
  const contact = [
    site.editor && `সম্পাদক: ${site.editor}`,
    site.publisher && `প্রকাশক: ${site.publisher}`,
    site.address && `কার্যালয়: ${site.address}`,
    site.phone && `ফোন: ${site.phone}`,
    site.email && `ইমেইল: ${site.email}`,
  ].filter(Boolean).join("\n");
  const text = site.about || `${site.name} একটি বাংলা অনলাইন সংবাদমাধ্যম। দেশ-বিদেশের গুরুত্বপূর্ণ খবর দ্রুত, সহজ ভাষায় ও নিরপেক্ষভাবে পাঠকের কাছে পৌঁছে দেওয়াই আমাদের লক্ষ্য।\n\nজাতীয়, রাজনীতি, সারাদেশ, আন্তর্জাতিক, অর্থনীতি, খেলা, বিনোদন, প্রযুক্তি, শিক্ষা, স্বাস্থ্যসহ নানা বিষয়ে আমরা প্রতিদিন খবর প্রকাশ করি।`;
  return <InfoPage title="আমাদের সম্পর্কে" text={contact ? `${text}\n\n## যোগাযোগ\n\n${contact.replace(/\n/g, "\n\n")}` : text} />;
}
