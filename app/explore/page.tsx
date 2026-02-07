import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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
    .limit(9);

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

  const workItems = works || [];
  const creativeItems = creatives || [];
  const followingItems =
    following
      ?.map((item) => item.following)
      .filter(
        (profile): profile is NonNullable<typeof profile> =>
          profile !== null
      ) || [];

  return (
    <div className="min-h-screen bg-[#d9d9d9] text-[#1b1b1b]">
      <div className="font-mono">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-black/20 px-6 py-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <span className="text-4xl leading-none">✱</span>
              <span className="text-4xl leading-none">—</span>
            </div>
            <button className="flex items-center gap-2 rounded-full border border-black/40 bg-[#e6e6e6] px-4 py-1.5 text-sm shadow-sm">
              <span className="text-base">+</span>
              <span>create</span>
            </button>
          </div>

          <div className="flex items-center rounded-full bg-white px-2 py-1 shadow-sm">
            <button className="rounded-full px-5 py-1 text-sm">explore</button>
            <button className="rounded-full px-5 py-1 text-sm text-black/60">
              expand
            </button>
          </div>

          <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2 shadow-sm">
            <input
              type="text"
              placeholder="search"
              className="w-48 bg-transparent text-sm outline-none placeholder:text-black/40"
            />
            <span className="text-black/60">⌕</span>
          </div>
        </header>

        <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-6 lg:grid-cols-[220px_minmax(0,1fr)_240px]">
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
                  <button className="rounded-full bg-[#dcdcdc] px-8 py-2 text-sm shadow-sm">
                    {currentProfile?.username ? (
                      <Link href={`/${currentProfile.username}`}>portfolio</Link>
                    ) : (
                      "portfolio"
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <p className="text-black/70">following</p>
              {followingItems.length > 0 ? (
                <ul className="space-y-2">
                  {followingItems.map((profile) => (
                    <li key={profile.id}>
                      {profile.username ? `@${profile.username}` : profile.display_name || "unknown"}
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

          <section className="space-y-8">
            {workItems.length > 0 ? (
              workItems.map((work) => {
                const author = work.author;
                const authorName =
                  author?.display_name ||
                  (author?.username ? `@${author.username}` : "anonymous");
                const authorInitial = authorName.charAt(0).toUpperCase();

                return (
                  <article key={work.id} className="overflow-hidden rounded-xl bg-white shadow-md">
                    {work.image_url ? (
                      <img
                        src={work.image_url}
                        alt={work.title || "Artwork"}
                        className="h-80 w-full object-cover"
                      />
                    ) : (
                      <div className="p-6 text-sm text-black/70">
                        <p className="text-base text-black/80">
                          {work.title || "Untitled"}
                        </p>
                        {work.description && (
                          <p className="mt-2 text-black/60">
                            {work.description}
                          </p>
                        )}
                        {work.work_type === "essay" && work.content && (
                          <p className="mt-2 line-clamp-3 text-black/50">
                            {work.content}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-3 border-t border-black/10 p-4 text-sm">
                      {author?.avatar_url ? (
                        <img
                          src={author.avatar_url}
                          alt={authorName}
                          className="h-10 w-10 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-[#e6e6e6] flex items-center justify-center">
                          {authorInitial}
                        </div>
                      )}
                      <div>
                        <p className="text-black/80">{authorName}</p>
                        {work.description && (
                          <p className="text-black/60">{work.description}</p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <article className="rounded-xl bg-white p-6 shadow-md text-sm text-black/60">
                No works yet.
              </article>
            )}
          </section>

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
                      <li key={item.id} className="flex items-center gap-3">
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
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-black/50">no creatives yet</p>
              )}
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
