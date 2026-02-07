import Link from "next/link";
import PortfolioCard, { type PortfolioProfile } from "@/app/components/portfolio-card";

type ThreadLink = {
  id: string;
  name: string | null;
};

type ThreadLeftSidebarProps = {
  profile: PortfolioProfile | null;
  threads: ThreadLink[];
  footer?: React.ReactNode;
  className?: string;
};

export default function ThreadLeftSidebar({
  profile,
  threads,
  footer,
  className,
}: ThreadLeftSidebarProps): JSX.Element {
  return (
    <aside className={`hidden lg:flex lg:flex-col lg:gap-6 ${className || ""}`}>
      <PortfolioCard profile={profile} />

      <div className="text-black">
        <div className="flex items-center gap-3 text-4xl font-[family-name:var(--font-jetbrains-mono)]">
          <span>✱</span>
          <span className="translate-y-1">—</span>
        </div>
        <div className="mt-6 space-y-3 text-sm">
          <p className="tracking-wide">following threads</p>
          {threads.length > 0 ? (
            <ul className="space-y-2 text-black/80">
              {threads.map((thread) => (
                <li key={thread.id}>
                  {thread.name ? (
                    <Link href={`/thread/${thread.id}`} className="hover:text-black transition-colors">
                      *-{thread.name}
                    </Link>
                  ) : (
                    <span>*-untitled</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-black/50">no threads yet</p>
          )}
        </div>
      </div>

      {footer ? <div className="mt-auto">{footer}</div> : null}
    </aside>
  );
}
