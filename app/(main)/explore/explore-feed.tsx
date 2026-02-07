"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import Fuse from "fuse.js";
import { toggleFollow } from "./actions";

type Work = {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  work_type: string | null;
  content: string | null;
  created_at: string;
  author_id: string;
  author: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  primary_interest?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type ExploreFeedProps = {
  works: Work[];
  profiles: Profile[];
  followingIds: string[];
  isAuthenticated: boolean;
  searchQuery?: string;
};

type SearchMode = "posts" | "users";

export default function ExploreFeed({ works, profiles, followingIds, isAuthenticated, searchQuery }: ExploreFeedProps) {
  const [searchMode, setSearchMode] = useState<SearchMode>("posts");
  const [followingState, setFollowingState] = useState<Set<string>>(new Set(followingIds));
  const [isPending, startTransition] = useTransition();

  const followingSet = useMemo(() => new Set(followingIds), [followingIds]);

  const worksFuse = useMemo(
    () =>
      new Fuse(works, {
        keys: ["title", "description"],
        threshold: 0.4,
      }),
    [works]
  );

  const profilesFuse = useMemo(
    () =>
      new Fuse(profiles, {
        keys: ["username", "display_name", "bio"],
        threshold: 0.4,
      }),
    [profiles]
  );

  const filteredWorks = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) {
      return works;
    }

    const results = worksFuse.search(searchQuery);
    const matched = results.map((r) => r.item);

    // Re-apply followed-users-first sorting after filtering
    return matched.sort((a, b) => {
      const aFollowed = followingSet.has(a.author_id);
      const bFollowed = followingSet.has(b.author_id);

      if (aFollowed && !bFollowed) return -1;
      if (!aFollowed && bFollowed) return 1;

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [searchQuery, works, worksFuse, followingSet]);

  const filteredProfiles = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) {
      return profiles;
    }

    const results = profilesFuse.search(searchQuery);
    return results.map((r) => r.item);
  }, [searchQuery, profiles, profilesFuse]);

  const handleFollow = (profileId: string) => {
    if (!isAuthenticated) return;

    startTransition(() => {
      void (async () => {
        const result = await toggleFollow(profileId);

        if (result.success) {
          setFollowingState((prev) => {
            const next = new Set(prev);
            if (result.isFollowing) {
              next.add(profileId);
            } else {
              next.delete(profileId);
            }
            return next;
          });
        }
      })();
    });
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center rounded-full bg-white px-2 py-1 shadow-sm w-fit">
        <button
          onClick={() => setSearchMode("posts")}
          className={`rounded-full px-5 py-1 text-sm transition-colors ${
            searchMode === "posts"
              ? "bg-black/5"
              : "text-black/60 hover:bg-black/5"
          }`}
        >
          posts
        </button>
        <button
          onClick={() => setSearchMode("users")}
          className={`rounded-full px-5 py-1 text-sm transition-colors ${
            searchMode === "users"
              ? "bg-black/5"
              : "text-black/60 hover:bg-black/5"
          }`}
        >
          users
        </button>
      </div>

      {searchMode === "posts" ? (
        filteredWorks.length > 0 ? (
          <div className="space-y-6">
            {filteredWorks.map((work) => {
            const author = work.author;
            const authorName =
              author?.display_name ||
              (author?.username ? `@${author.username}` : "anonymous");
            const authorInitial = authorName.charAt(0).toUpperCase();
            const isFollowed = followingSet.has(work.author_id);

            return (
              <article
                key={work.id}
                className="overflow-hidden rounded-xl bg-white shadow-md group"
              >
                <Link href={`/work/${work.id}`} className="block">
                  {work.image_url ? (
                    <div className="relative">
                      <img
                        src={work.image_url}
                        alt={work.title || "Artwork"}
                        className="h-80 w-full object-cover hover:opacity-95 transition-opacity"
                      />
                      {(work.primary_interest?.name || work.work_type === "essay") && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {work.primary_interest?.name || "Essay"}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="p-6 text-sm text-black/70 hover:bg-black/5 transition-colors">
                      <p className="text-base text-black/80">
                        {work.title || "Untitled"}
                      </p>
                      {work.description && (
                        <p className="mt-2 text-black/60">{work.description}</p>
                      )}
                      {work.work_type === "essay" && work.content && (
                        <p className="mt-2 line-clamp-3 text-black/50">
                          {work.content}
                        </p>
                      )}
                    </div>
                  )}
                </Link>
                <div className="flex items-center justify-between border-t border-black/10 p-4 text-sm">
                  <Link
                    href={author?.username ? `/${author.username}` : "#"}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
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
                      {work.title && work.image_url && (
                        <p className="text-black/60">{work.title}</p>
                      )}
                    </div>
                  </Link>
                  {isFollowed && (
                    <span className="text-xs text-black/50 bg-black/5 px-2 py-1 rounded-full">
                      Following
                    </span>
                  )}
                </div>
              </article>
            );
          })}
          </div>
        ) : searchQuery ? (
          <article className="rounded-xl bg-white p-6 shadow-md text-sm text-black/60">
            No works found for &quot;{searchQuery}&quot;
          </article>
        ) : (
          <article className="rounded-xl bg-white p-6 shadow-md text-sm text-black/60">
            No works yet.{" "}
            <Link href="/upload" className="underline hover:text-black">
              Be the first to share!
            </Link>
          </article>
        )
      ) : (
        filteredProfiles.length > 0 ? (
          <div className="space-y-4">
            {filteredProfiles.map((profile) => {
              const displayName = profile.display_name || profile.username || "anonymous";
              const initial = displayName.charAt(0).toUpperCase();
              const isFollowing = followingState.has(profile.id);

              return (
                <article
                  key={profile.id}
                  className="overflow-hidden rounded-xl bg-white shadow-md p-4"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={profile.username ? `/${profile.username}` : "#"}
                      className="flex items-center gap-4 hover:opacity-80 transition-opacity flex-1"
                    >
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={displayName}
                          className="h-12 w-12 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-[#e6e6e6] flex items-center justify-center text-lg">
                          {initial}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-black/90">
                          {displayName}
                        </p>
                        {profile.username && (
                          <p className="text-sm text-black/50">
                            @{profile.username}
                          </p>
                        )}
                        {profile.bio && (
                          <p className="text-sm text-black/60 mt-1 line-clamp-2">
                            {profile.bio}
                          </p>
                        )}
                      </div>
                    </Link>
                    {isAuthenticated && (
                      <button
                        onClick={() => handleFollow(profile.id)}
                        disabled={isPending}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 ${
                          isFollowing
                            ? "bg-black/5 text-black/70 hover:bg-black/10"
                            : "bg-black text-white hover:bg-black/90"
                        }`}
                      >
                        {isFollowing ? "Following" : "Follow"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : searchQuery ? (
          <article className="rounded-xl bg-white p-6 shadow-md text-sm text-black/60">
            No users found for &quot;{searchQuery}&quot;
          </article>
        ) : (
          <article className="rounded-xl bg-white p-6 shadow-md text-sm text-black/60">
            No users yet.
          </article>
        )
      )}
    </section>
  );
}
