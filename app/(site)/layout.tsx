import SiteNav from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/ui";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain min-h-screen overflow-x-hidden bg-coal text-paper-white selection:bg-ember/40">
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
