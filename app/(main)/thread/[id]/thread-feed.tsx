"use client";

import { useMemo } from "react";
import Link from "next/link";

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

type ThreadFeedProps = {
  works: Work[];
  followingIds: string[];
  isAuthenticated: boolean;
};

export default function ThreadFeed({ works, followingIds, isAuthenticated }: ThreadFeedProps) {
  const followingSet = useMemo(() => new Set(followingIds), [followingIds]);

  return (
    <section className="space-y-6">
      {works.length > 0 ? (
        <div className="space-y-6">
          {works.map((work) => {
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
      ) : (
        <article className="rounded-xl bg-white p-6 shadow-md text-sm text-black/60">
          No posts in this thread yet.{" "}
          <Link href="/upload" className="underline hover:text-black">
            Be the first to post!
          </Link>
        </article>
      )}
    </section>
  );
}
