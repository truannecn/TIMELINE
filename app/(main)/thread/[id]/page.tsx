import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ThreadFeed from "./thread-feed";

export default async function ThreadPage({
  params,
}: {
  params: { id: string };
}): Promise<JSX.Element> {
  const supabase = await createClient();
  const threadId = params.id;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get thread details
  const { data: thread } = await supabase
    .from("threads")
    .select("id, name, description, created_by, created_at")
    .eq("id", threadId)
    .single();

  if (!thread) {
    notFound();
  }

  // Get works in this thread via work_threads junction table
  const { data: workThreads } = await supabase
    .from("work_threads")
    .select(
      `
      work:works!work_threads_work_id_fkey(
        id,
        title,
        description,
        image_url,
        work_type,
        content,
        created_at,
        author_id,
        author:profiles!works_author_id_fkey(id, username, display_name, avatar_url)
      )
    `
    )
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false });

  // Also get works where this is the primary thread
  const { data: primaryWorks } = await supabase
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
    .eq("primary_thread_id", threadId)
    .order("created_at", { ascending: false });

  // Combine and deduplicate works
  const allWorks = [...(primaryWorks || [])];
  const workIds = new Set(allWorks.map((w) => w.id));

  if (workThreads) {
    for (const wt of workThreads) {
      // Normalize work - can be array or single object
      const work = Array.isArray(wt.work) ? wt.work[0] : wt.work;
      if (work && !workIds.has(work.id)) {
        allWorks.push(work);
        workIds.add(work.id);
      }
    }
  }

  // Sort by date
  allWorks.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Get list of users the current user follows
  const { data: followingData } = user
    ? await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id)
    : { data: null };

  const followingIds = new Set(followingData?.map((f) => f.following_id) || []);

  // Sort works: followed users first, then by date
  const sortedWorks = allWorks.sort((a, b) => {
    const aFollowed = followingIds.has(a.author_id);
    const bFollowed = followingIds.has(b.author_id);

    if (aFollowed && !bFollowed) return -1;
    if (!aFollowed && bFollowed) return 1;

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Normalize author field
  const workItems = sortedWorks.map((work) => ({
    ...work,
    author: Array.isArray(work.author) ? work.author[0] : work.author,
  }));

  const isSystemThread = thread.created_by === null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                href="/explore"
                className="text-sm text-black/50 hover:text-black/70 transition-colors"
              >
                ← back to explore
              </Link>
            </div>
            <h1 className="text-3xl font-medium mb-2">{thread.name}</h1>
            {thread.description && (
              <p className="text-black/70">{thread.description}</p>
            )}
            <p className="text-sm text-black/50 mt-2">
              {isSystemThread ? "Default thread" : "Community thread"} • {workItems.length} {workItems.length === 1 ? "post" : "posts"}
            </p>
          </div>
        </div>
      </div>

      <ThreadFeed
        works={workItems}
        followingIds={Array.from(followingIds)}
        isAuthenticated={!!user}
      />
    </div>
  );
}
