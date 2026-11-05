import SiteNav from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/ui";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-clip bg-black text-cream selection:bg-teal selection:text-black">
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
