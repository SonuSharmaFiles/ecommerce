import { Header } from "@/components/storefront/header";
import { Footer } from "@/components/storefront/footer";
import { ChatWidget } from "@/components/storefront/chat-widget";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-[60vh]">{children}</main>
      <Footer />
      <ChatWidget />
    </>
  );
}
