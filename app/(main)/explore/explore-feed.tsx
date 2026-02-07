"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Fuse from "fuse.js";

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
};

type ExploreFeedProps = {
  works: Work[];
  followingIds: string[];
};

export default function ExploreFeed({ works, followingIds }: ExploreFeedProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const followingSet = useMemo(() => new Set(followingIds), [followingIds]);

  const fuse = useMemo(
    () =>
      new Fuse(works, {
        keys: ["title", "description"],
        threshold: 0.4,
      }),
    [works]
  );

  const filteredWorks = useMemo(() => {
    if (!searchQuery.trim()) {
      return works;
    }

    const results = fuse.search(searchQuery);
    const matched = results.map((r) => r.item);

    // Re-apply followed-users-first sorting after filtering
    return matched.sort((a, b) => {
      const aFollowed = followingSet.has(a.author_id);
      const bFollowed = followingSet.has(b.author_id);

      if (aFollowed && !bFollowed) return -1;
      if (!aFollowed && bFollowed) return 1;

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [searchQuery, works, fuse, followingSet]);

  return (
    <section className="space-y-8">
      <div className="relative">
        <input
          type="text"
          placeholder="Search works..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-black/40 focus:border-black/20 focus:outline-none focus:ring-1 focus:ring-black/10"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/60"
            aria-label="Clear search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      {filteredWorks.length > 0 ? (
        filteredWorks.map((work) => {
          const author = work.author;
          const authorName =
            author?.display_name ||
            (author?.username ? `@${author.username}` : "anonymous");
          const authorInitial = authorName.charAt(0).toUpperCase();
          const isFollowed = followingSet.has(work.author_id);

          return (
            <article
              key={work.id}
              className="overflow-hidden rounded-xl bg-white shadow-md"
            >
              <Link href={`/work/${work.id}`} className="block">
                {work.image_url ? (
                  <img
                    src={work.image_url}
                    alt={work.title || "Artwork"}
                    className="h-80 w-full object-cover hover:opacity-95 transition-opacity"
                  />
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
        })
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
      )}
    </section>
  );
}
