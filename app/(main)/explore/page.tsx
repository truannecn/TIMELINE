import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ExploreFeed from "./explore-feed";

export default async function ExplorePage(): Promise<JSX.Element> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: currentProfile } = user
    ? await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
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

  // Get user's interest preferences
  const { data: userInterests } = user
    ? await supabase
        .from("user_interests")
        .select("interest_id")
        .eq("user_id", user.id)
    : { data: null };

  const userInterestIds = userInterests?.map((ui) => ui.interest_id) || [];

  // Get work IDs that match user's interests (if user has interests)
  let matchingWorkIds: string[] | null = null;
  if (userInterestIds.length > 0) {
    const { data: matchingWorks } = await supabase
      .from("work_interests")
      .select("work_id")
      .in("interest_id", userInterestIds);

    if (matchingWorks) {
      const workIdSet = new Set(matchingWorks.map((w) => w.work_id).filter((id): id is string => id !== null));
      matchingWorkIds = Array.from(workIdSet);
    }
  }

  // Build works query with optional interest filtering
  let worksQuery = supabase
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
    );

  // Filter by matching interests if user has preferences
  if (matchingWorkIds !== null) {
    worksQuery = worksQuery.in("id", matchingWorkIds);
  }

  const { data: works } = await worksQuery
    .order("created_at", { ascending: false })
    .limit(100);

  // Sort works: followed users first, then by date
  const sortedWorks = works?.sort((a, b) => {
    const aFollowed = followingIds.has(a.author_id);
    const bFollowed = followingIds.has(b.author_id);

    if (aFollowed && !bFollowed) return -1;
    if (!aFollowed && bFollowed) return 1;

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

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

  const { data: following } = user
    ? await supabase
        .from("follows")
        .select(
          "following:profiles!follows_following_id_fkey(id, username, display_name, avatar_url)"
        )
        .eq("follower_id", user.id)
        .limit(6)
    : { data: [] as { following: { id: string; username: string | null; display_name: string | null; avatar_url: string | null } | null }[] };

  const displayName =
    currentProfile?.display_name || currentProfile?.username || "guest";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const threadItems =
    threads?.map((thread) => thread.name?.trim()).filter(Boolean) || [];

  // Normalize author field - Supabase can return single object or array
  const workItems = (sortedWorks || []).map((work) => ({
    ...work,
    author: Array.isArray(work.author) ? work.author[0] : work.author,
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
    <div className="bg-[#d9d9d9] text-[#1b1b1b] font-mono">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-6 lg:grid-cols-[220px_minmax(0,1fr)_240px]">
          <aside className="hidden lg:flex lg:flex-col lg:gap-6">
            <div className="rounded-2xl bg-[#d9d9d9] p-4 shadow-sm">
              <div className="relative overflow-hidden rounded-2xl bg-[#f2f2f2]">
                <div className="h-28 bg-white" />
                <div className="h-32 bg-[#9a9a9a]" />
                <div className="absolute left-1/2 top-20 -translate-x-1/2">
                  {currentProfile?.avatar_url ? (
                    <img
                      src={currentProfile.avatar_url}
                      alt={displayName}
                      className="h-24 w-24 rounded-full border-4 border-[#f2f2f2] object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-full border-4 border-[#f2f2f2] bg-[#d8d8d8] flex items-center justify-center text-3xl text-black/70">
                      {avatarLetter}
                    </div>
                  )}
                </div>
                <div className="flex justify-center pb-6 pt-10">
                  {currentProfile?.username ? (
                    <Link
                      href={`/${currentProfile.username}`}
                      className="rounded-full bg-[#dcdcdc] px-8 py-2 text-sm shadow-sm hover:bg-[#d0d0d0] transition-colors"
                    >
                      portfolio
                    </Link>
                  ) : (
                    <span className="rounded-full bg-[#dcdcdc] px-8 py-2 text-sm shadow-sm">
                      portfolio
                    </span>
                  )}
                </div>
              </div>
            </div>

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

            <div className="mt-auto flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3a8d3a] text-white shadow-md">
                {avatarLetter}
              </div>
            </div>
          </aside>

          <ExploreFeed
            works={workItems}
            followingIds={Array.from(followingIds)}
          />

          <aside className="hidden lg:flex lg:flex-col lg:gap-10">
            <div className="space-y-4">
              <p className="text-sm text-black/70">threads for you</p>
              {threadItems.length > 0 ? (
                <ul className="space-y-3 text-sm">
                  {threadItems.map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-md bg-[#d0d0d0]" />
                      <span>{item}</span>
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
    </div>
  );
}
