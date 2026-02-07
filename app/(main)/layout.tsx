import Header from "@/app/components/header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="min-h-screen bg-white text-[#1b1b1b] font-mono">
      <Header />
      <main>{children}</main>
    </div>
  );
}
