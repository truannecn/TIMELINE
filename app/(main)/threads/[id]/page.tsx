import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ThreadLeftSidebar from "@/app/components/thread-left-sidebar";
import ThreadRightSidebar from "@/app/components/thread-right-sidebar";

interface ThreadPageProps {
  params: Promise<{ id: string }>;
}

type Thread = {
  id: string;
  name: string | null;
  description: string | null;
  created_at: string;
  created_by?: string | null;
  creator?: Profile | null;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type Work = {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  created_at: string;
  author_id: string | null;
  author?: Profile | null;
};

type WorkThreadLink = {
  created_at: string;
  work: Work | null;
};

function normalizeWork(link?: WorkThreadLink | null): Work | null {
  if (!link || !link.work) return null;
  // Supabase may return an array for embedded resources at runtime
  const work = link.work as Work | Work[];
  return Array.isArray(work) ? work[0] : work;
}

function normalizeAuthor(work: Work | null): Work | null {
  if (!work) return null;
  // Supabase may return an array for embedded resources at runtime
  const author = work.author as Profile | Profile[] | null | undefined;
  return {
    ...work,
    author: Array.isArray(author) ? (author[0] ?? null) : (author ?? null),
  };
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: thread } = await supabase
    .from("threads")
    .select(
      "id, name, description, created_at, created_by, creator:profiles!threads_created_by_fkey(id, username, display_name, avatar_url)"
    )
    .eq("id", id)
    .single();

  if (!thread) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: currentProfile } = user
    ? await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio")
        .eq("id", user.id)
        .single()
    : { data: null };

  const { data: threadLinks } = user
    ? await supabase
        .from("user_threads")
        .select("thread:threads(id, name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6)
    : { data: [] as { thread: { id: string; name: string | null } | null }[] };

  const { data: featuredLinks } = await supabase
    .from("work_threads")
    .select(
      `
      created_at,
      work:works(
        id,
        title,
        description,
        image_url,
        created_at,
        author_id,
        author:profiles!works_author_id_fkey(id, username, display_name, avatar_url)
      )
    `
    )
    .eq("thread_id", id)
    .order("created_at", { ascending: false })
    .limit(1);

  const featuredWork = featuredLinks?.[0]
    ? normalizeAuthor(normalizeWork(featuredLinks[0] as unknown as WorkThreadLink))
    : null;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: trendingLinks } = await supabase
    .from("work_threads")
    .select(
      `
      created_at,
      work:works(
        id,
        title,
        image_url,
        created_at,
        author_id,
        author:profiles!works_author_id_fkey(id, username, display_name, avatar_url)
      )
    `
    )
    .eq("thread_id", id)
    .gte("created_at", weekAgo)
    .order("created_at", { ascending: false })
    .limit(6);

  const trendingWorks = (trendingLinks || [])
    .map((link) => normalizeWork(link as unknown as WorkThreadLink))
    .filter((work): work is Work => Boolean(work))
    .map(normalizeAuthor)
    .filter((work): work is Work => Boolean(work));

  const { data: allThreadLinks } = await supabase
    .from("work_threads")
    .select("work:works(author_id)")
    .eq("thread_id", id)
    .limit(200);

  const { data: threadFollow } = user
    ? await supabase
        .from("user_threads")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("thread_id", id)
        .maybeSingle()
    : { data: null };

  const creativesCount = new Set(
    (allThreadLinks || [])
      .map((link) => {
        const work = normalizeWork(link as unknown as WorkThreadLink | null);
        return work?.author_id || null;
      })
      .filter(Boolean)
  ).size;

  const createdLabel = new Date(thread.created_at)
    .toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
    .toLowerCase();

  const rawCreator = thread.creator as Profile | Profile[] | null | undefined;
  const normalizedThread: Thread = {
    ...thread,
    creator: Array.isArray(rawCreator) ? (rawCreator[0] ?? null) : (rawCreator ?? null),
  };

  const creatorLabel = featuredWork?.author?.username
    ? `by @${featuredWork.author.username}`
    : featuredWork?.author?.display_name
      ? `by ${featuredWork.author.display_name}`
      : "by @community";

  const authorName =
    featuredWork?.author?.display_name ||
    (featuredWork?.author?.username
      ? `@${featuredWork.author.username}`
      : "@anonymous");

  const caption =
    featuredWork?.description ||
    featuredWork?.title ||
    "new work from this thread";

  const isFollowingThread = Boolean(threadFollow);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto grid w-full max-w-none grid-cols-1 gap-6 px-5 py-6 lg:grid-cols-[200px_minmax(0,1fr)_360px] lg:pl-6 lg:pr-6">
      <ThreadLeftSidebar
        profile={currentProfile}
        threads={(threadLinks || [])
          .map((item) => item.thread)
          .filter(
            (thread): thread is { id: string; name: string | null } =>
              Boolean(thread)
          )}
      />

        <section className="space-y-8">
          <div className="rounded-[32px] bg-white p-8 shadow-sm">
            <div>
              <div className="overflow-hidden rounded-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]">
                {featuredWork?.image_url ? (
                  <img
                    src={featuredWork.image_url}
                    alt={featuredWork.title || "Thread highlight"}
                    className="h-[360px] w-full object-cover"
                  />
                ) : (
                  <div className="flex h-[360px] items-center justify-center bg-[#cfcfcf] text-sm text-black/60">
                    no featured post yet
                  </div>
                )}
              </div>

              <div className="-mt-1 rounded-b-[10px] bg-white px-6 py-4 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.3),0px_2px_6px_2px_rgba(0,0,0,0.15)]">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 overflow-hidden rounded-full bg-[#d9d9d9]">
                    {featuredWork?.author?.avatar_url ? (
                      <img
                        src={featuredWork.author.avatar_url}
                        alt={authorName}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-black/60">
                        {authorName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-black font-[family-name:var(--font-jetbrains-mono)]">
                      {authorName}
                    </p>
                    <p className="mt-1 text-xs text-black/70 font-['Inria_Serif',serif]">
                      {caption}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <ThreadRightSidebar
          thread={normalizedThread}
        createdLabel={createdLabel}
        creativesCount={creativesCount}
        creatorLabel={creatorLabel}
        isFollowing={isFollowingThread}
        trendingWorks={trendingWorks.map((work) => ({
          id: work.id,
          image_url: work.image_url,
          title: work.title,
          }))}
        />
      </div>
    </div>
  );
}
