import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ThreadLeftSidebar from "@/app/components/thread-left-sidebar";

export default async function ExpandPage(): Promise<JSX.Element> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get current user's profile
  const { data: currentProfile } = user
    ? await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio")
        .eq("id", user.id)
        .single()
    : { data: null };

  // Get following threads
  const { data: followingThreads } = user
    ? await supabase
        .from("user_threads")
        .select("thread:threads!user_threads_thread_id_fkey(id, name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6)
    : { data: [] as { thread: { id: string; name: string | null } | null }[] };

  // Get most liked works by counting likes per work
  const { data: likedWorkIds } = await supabase
    .from("likes")
    .select("work_id");

  // Count likes per work
  const likeCounts: Record<string, number> = {};
  likedWorkIds?.forEach((like) => {
    likeCounts[like.work_id] = (likeCounts[like.work_id] || 0) + 1;
  });

  // Fetch all works with images
  const { data: works } = await supabase
    .from("works")
    .select(
      `
      id,
      title,
      image_url,
      work_type,
      author_id,
      author:profiles!works_author_id_fkey(id, username, display_name, avatar_url)
    `
    )
    .eq("work_type", "image")
    .order("created_at", { ascending: false })
    .limit(50);

  // Sort works by like count (most liked first)
  const sortedWorks = (works || [])
    .map((work) => ({
      ...work,
      author: Array.isArray(work.author) ? work.author[0] : work.author,
      likeCount: likeCounts[work.id] || 0,
    }))
    .sort((a, b) => b.likeCount - a.likeCount);

  const threadItems =
    followingThreads
      ?.map((t) => t.thread)
      .filter(
        (thread): thread is { id: string; name: string | null } =>
          Boolean(thread)
      ) || [];

  // Assign varying heights for masonry effect
  const heights = [240, 364, 488, 240, 364, 240, 488, 240, 364];

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      {/* Left sidebar */}
      <ThreadLeftSidebar profile={currentProfile} threads={threadItems} />

      {/* Main content */}
      <div>
        {/* Heading with line */}
        <div className="flex items-center gap-4 mb-8">
          <p className="font-mono text-lg whitespace-nowrap">
            expand your horizons and see some top posts
          </p>
          <div className="flex-1 border-t border-black/30" />
        </div>

        {/* Masonry gallery */}
        {sortedWorks.length > 0 ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {sortedWorks.map((work, index) => {
              const height = heights[index % heights.length];
              return (
                <Link
                  key={work.id}
                  href={`/work/${work.id}`}
                  className="block break-inside-avoid overflow-hidden rounded-[10px] hover:opacity-90 transition-opacity"
                >
                  {work.image_url ? (
                    <img
                      src={work.image_url}
                      alt={work.title || ""}
                      className="w-full object-cover rounded-[10px]"
                      style={{ height: `${height}px` }}
                    />
                  ) : (
                    <div
                      className="w-full bg-[#518992] rounded-[10px]"
                      style={{ height: `${height}px` }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center py-20 text-black/50 font-mono">
            no posts yet — be the first to create!
          </div>
        )}
      </div>
    </div>
  );
}
