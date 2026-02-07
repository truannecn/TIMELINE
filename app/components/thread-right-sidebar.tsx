import Link from "next/link";
import ThreadFollowButton from "@/app/(main)/threads/thread-follow-button";

type Thread = {
  id: string;
  name: string | null;
  description: string | null;
  created_at: string;
  creator?: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

type WorkItem = {
  id: string;
  image_url: string | null;
  title: string | null;
};

type ThreadRightSidebarProps = {
  thread: Thread;
  createdLabel: string;
  creativesCount: number;
  creatorLabel: string;
  trendingWorks: WorkItem[];
  isFollowing: boolean;
};

export default function ThreadRightSidebar({
  thread,
  createdLabel,
  creativesCount,
  creatorLabel,
  trendingWorks,
  isFollowing,
}: ThreadRightSidebarProps): JSX.Element {
  const tint = getThreadTint(thread.name);
  const glassBackground = hexToRgba(tint, 0.3);
  return (
    <aside className="hidden lg:block lg:self-start lg:sticky lg:top-6 lg:h-[calc(100vh-48px)] lg:mb-6">
      <div
        className="rounded-[21px] p-6 h-full border border-white/70 shadow-[0px_22px_45px_rgba(0,0,0,0.16)] backdrop-blur-3xl"
        style={{
          backgroundColor: glassBackground,
          backgroundImage:
            "linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.22))",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl text-black font-[family-name:var(--font-jetbrains-mono)]">
              *-{thread.name || "untitled thread"}
            </h2>
            <p className="mt-1 text-xs text-black font-[family-name:var(--font-jetbrains-mono)]">
              {creatorLabel}
            </p>
            <p className="mt-3 text-xs text-black font-[family-name:var(--font-jetbrains-mono)]">
              {creativesCount.toLocaleString()} creatives
            </p>
          </div>
          <ThreadFollowButton
            threadId={thread.id}
            isFollowing={isFollowing}
            tint={tint}
          />
        </div>

        <div className="mt-8">
          <p className="font-['Inria_Serif',serif] text-base">description</p>
          <p className="mt-3 whitespace-pre-wrap text-sm text-black/80 font-['Inria_Serif',serif]">
            {thread.description || "no description yet."}
          </p>
          <p className="mt-4 text-xs text-black/70 font-['Inria_Serif',serif]">
            created {createdLabel}
          </p>
        </div>

        <div className="mt-8">
          <p className="font-['Inria_Serif',serif] text-base">
            trending posts from this week
          </p>
          {trendingWorks.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-4">
              {trendingWorks.map((work) => (
                <Link
                  key={work.id}
                  href={`/work/${work.id}`}
                  className="block overflow-hidden rounded-md bg-[#518992]"
                >
                  {work.image_url ? (
                    <img
                      src={work.image_url}
                      alt={work.title || "Trending work"}
                      className="h-20 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-20 items-center justify-center text-xs text-white/80">
                      no image
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-black/60 font-['Inria_Serif',serif]">
              no trending posts yet
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

const THREAD_TINTS = ["#8C7B9A"];

function getThreadTint(name: string | null): string {
  if (!name) return THREAD_TINTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 2147483647;
  }
  return THREAD_TINTS[Math.abs(hash) % THREAD_TINTS.length];
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
