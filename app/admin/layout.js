import "./admin.css";

export const metadata = {
  title: "অ্যাডমিন প্যানেল",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
  return <div className="adm">{children}</div>;
}
