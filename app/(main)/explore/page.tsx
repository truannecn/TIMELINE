import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ExploreFeed from "./explore-feed";
import PortfolioCard from "@/app/components/portfolio-card";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: { q?: string };
}): Promise<JSX.Element> {
  const supabase = await createClient();
  const searchQuery = searchParams.q || "";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get current user's profile (also fetched in Header)
  const { data: currentProfile } = user
    ? await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio")
        .eq("id", user.id)
        .single()
    : { data: null };

  // Get list of users the current user follows
  const { data: followingData } = user
    ? await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id)
    : { data: null };

  const followingIds = new Set(followingData?.map((f) => f.following_id) || []);

  // Fetch works with like counts
  const { data: works } = await supabase
    .from("works")
    .select(
      `
      id,
      title,
      description,
      image_url,
      work_type,
      content,
      created_at,
      author_id,
      author:profiles!works_author_id_fkey(id, username, display_name, avatar_url)
    `
    )
    .order("created_at", { ascending: false })
    .limit(100);

  // Get like counts for all works
  const workIds = works?.map((w) => w.id) || [];
  const { data: likeCounts } = await supabase
    .from("likes")
    .select("work_id")
    .in("work_id", workIds);

  // Get current user's likes
  const { data: userLikes } = user
    ? await supabase
        .from("likes")
        .select("work_id")
        .eq("user_id", user.id)
        .in("work_id", workIds)
    : { data: null };

  // Create maps for efficient lookup
  const likeCountMap = new Map<string, number>();
  likeCounts?.forEach((like) => {
    likeCountMap.set(like.work_id, (likeCountMap.get(like.work_id) || 0) + 1);
  });

  const userLikedSet = new Set(userLikes?.map((like) => like.work_id) || []);

  // Sort works: followed users first, then by date
  const sortedWorks = works?.sort((a, b) => {
    const aFollowed = followingIds.has(a.author_id);
    const bFollowed = followingIds.has(b.author_id);

    if (aFollowed && !bFollowed) return -1;
    if (!aFollowed && bFollowed) return 1;

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Fetch all profiles for search functionality
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio")
    .order("created_at", { ascending: false });

  const { data: creatives } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .order("created_at", { ascending: false })
    .limit(6);

  const { data: threads } = await supabase
    .from("threads")
    .select("id, name")
    .order("created_at", { ascending: false })
    .limit(6);

  // Fetch threads the user follows
  const { data: followedThreadsData } = user
    ? await supabase
        .from("user_threads")
        .select("thread:threads!user_threads_thread_id_fkey(id, name)")
        .eq("user_id", user.id)
        .limit(6)
    : { data: null };

  const followedThreads = (followedThreadsData || [])
    .map((item: { thread: { id: string; name: string } | { id: string; name: string }[] | null }) => {
      const t = item.thread;
      return Array.isArray(t) ? t[0] : t;
    })
    .filter((t): t is { id: string; name: string } => t !== null && t !== undefined);

  // Get following list and counts
  const [followingResult, followerCountResult, followingCountResult] = user
    ? await Promise.all([
        supabase
          .from("follows")
          .select(
            "following:profiles!follows_following_id_fkey(id, username, display_name, avatar_url)"
          )
          .eq("follower_id", user.id)
          .limit(6),
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", user.id),
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", user.id),
      ])
    : [
        { data: [] as { following: { id: string; username: string | null; display_name: string | null; avatar_url: string | null } | null }[] },
        { count: 0 },
        { count: 0 },
      ];

  const following = followingResult.data;
  const followerCount = followerCountResult.count || 0;
  const followingCount = followingCountResult.count || 0;

  const displayName =
    currentProfile?.display_name || currentProfile?.username || "guest";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const threadItems = threads || [];

  // Normalize author field and add like info - Supabase can return single object or array
  const workItems = (sortedWorks || []).map((work) => ({
    ...work,
    author: Array.isArray(work.author) ? work.author[0] : work.author,
    likeCount: likeCountMap.get(work.id) || 0,
    isLiked: userLikedSet.has(work.id),
  }));
  const creativeItems = creatives || [];
  const followingItems =
    following
      ?.map((item) => {
        const f = item.following;
        return Array.isArray(f) ? f[0] : f;
      })
      .filter(
        (profile): profile is { id: string; username: string | null; display_name: string | null; avatar_url: string | null } =>
          profile !== null && profile !== undefined
      ) || [];

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-6 lg:grid-cols-[220px_minmax(0,1fr)_240px]">
          <aside className="hidden lg:flex lg:flex-col lg:gap-6">
            <PortfolioCard profile={currentProfile} />

            <div className="space-y-3 text-sm">
              <p className="text-black/70">following</p>
              {followingItems.length > 0 ? (
                <ul className="space-y-2">
                  {followingItems.map((profile) => (
                    <li key={profile.id}>
                      <Link
                        href={profile.username ? `/${profile.username}` : "#"}
                        className="hover:text-black/80 transition-colors"
                      >
                        {profile.username ? `@${profile.username}` : profile.display_name || "unknown"}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-black/50">no follows yet</p>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <p className="font-bold text-black/70">following threads</p>
              {followedThreads.length > 0 ? (
                <ul className="space-y-2 text-black/80">
                  {followedThreads.map((thread) => (
                    <li key={thread.id}>
                      <Link
                        href={`/thread/${thread.id}`}
                        className="hover:text-black transition-colors"
                      >
                        *-{thread.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-black/50">no threads yet</p>
              )}
            </div>

            <div className="mt-auto flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3a8d3a] text-white shadow-md">
                {avatarLetter}
              </div>
            </div>
          </aside>

          <ExploreFeed
            works={workItems}
            profiles={profiles || []}
            followingIds={Array.from(followingIds)}
            isAuthenticated={!!user}
            searchQuery={searchQuery}
          />

          <aside className="hidden lg:flex lg:flex-col lg:gap-10">
            <div className="space-y-4">
              <p className="text-sm font-bold text-black/70">threads for you</p>
              {threadItems.length > 0 ? (
                <ul className="space-y-3 text-sm">
                  {threadItems.map((thread) => (
                    <li key={thread.id}>
                      <Link
                        href={`/thread/${thread.id}`}
                        className="hover:text-black transition-colors"
                      >
                        *-{thread.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-black/50">no threads yet</p>
              )}
            </div>

            <div className="space-y-4">
              <p className="text-sm text-black/70">creatives for you</p>
              {creativeItems.length > 0 ? (
                <ul className="space-y-3 text-sm">
                  {creativeItems.map((item) => {
                    const label =
                      item.display_name ||
                      (item.username ? `@${item.username}` : "unknown");
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.username ? `/${item.username}` : "#"}
                          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                        >
                          {item.avatar_url ? (
                            <img
                              src={item.avatar_url}
                              alt={label}
                              className="h-8 w-8 rounded-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="h-8 w-8 rounded-full bg-[#d0d0d0] flex items-center justify-center text-xs">
                              {label.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <span>{label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-black/50">no creatives yet</p>
              )}
            </div>
          </aside>
    </div>
  );
}
