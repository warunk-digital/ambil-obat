import { BottomNav } from "@/components/bottom-nav";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh">
      <main className="pb-nav">{children}</main>
      <BottomNav />
    </div>
  );
}
