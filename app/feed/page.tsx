import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function FeedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Get list of users the current user follows
  const { data: following } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  const followingIds = new Set(following?.map((f) => f.following_id) || []);

  // Fetch recent works with author profiles
  const { data: works, error: worksError } = await supabase
    .from("works")
    .select(
      `
      *,
      author:profiles!works_author_id_fkey(id, username, display_name, avatar_url)
    `
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (worksError) {
    console.error("Error fetching works:", worksError);
  }

  // Sort works: followed users first, then by date
  const sortedWorks = works?.sort((a, b) => {
    const aFollowed = followingIds.has(a.author_id);
    const bFollowed = followingIds.has(b.author_id);

    if (aFollowed && !bFollowed) return -1;
    if (!aFollowed && bFollowed) return 1;

    // Both followed or both not followed: sort by date
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Artfolio
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/feed"
              className="text-sm text-foreground font-medium"
            >
              Feed
            </Link>
            <Link
              href="/profile"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Profile
            </Link>
            <Link
              href="/upload"
              className="flex items-center gap-1 px-4 py-1.5 bg-foreground text-background rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <span>+</span> New
            </Link>
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Feed</h1>
        </div>

        {sortedWorks && sortedWorks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedWorks.map((work) => {
              const isFollowed = followingIds.has(work.author_id);
              const isEssay = work.work_type === "essay";
              return (
                <article
                  key={work.id}
                  className="border border-border rounded-lg overflow-hidden bg-card"
                >
                  <Link href={`/work/${work.id}`} className="block">
                    <div className="aspect-square relative">
                      {work.image_url && (
                        <img
                          src={work.image_url}
                          alt={work.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                      {isEssay && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white text-xs font-medium rounded">
                          Essay
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="p-4">
                    <Link href={`/work/${work.id}`}>
                      <h2 className="font-medium truncate hover:underline">{work.title}</h2>
                    </Link>
                    {work.description && !isEssay && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {work.description}
                      </p>
                    )}
                    <Link
                      href={work.author?.username ? `/${work.author.username}` : "#"}
                      className="flex items-center gap-2 mt-3 group"
                    >
                      {work.author?.avatar_url ? (
                        <img
                          src={work.author.avatar_url}
                          alt={work.author.display_name || "Author"}
                          className="w-6 h-6 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                          {(work.author?.display_name || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm text-muted-foreground group-hover:text-foreground">
                        {work.author?.display_name || "Anonymous"}
                      </span>
                      {isFollowed && (
                        <span className="text-xs text-muted-foreground">Following</span>
                      )}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground mb-4">
              No artwork yet. Be the first to share!
            </p>
            <Link
              href="/upload"
              className="inline-block px-6 py-2 bg-foreground text-background rounded-md font-medium hover:opacity-90 transition-opacity"
            >
              Upload Your First Artwork
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
