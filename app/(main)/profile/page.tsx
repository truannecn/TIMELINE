import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/avatar";

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

type Work = {
  id: string;
  title: string | null;
  work_type: string | null;
  image_url: string | null;
  created_at: string;
  primary_interest?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  author?: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export default async function ProfilePage({ searchParams }: Props) {
  const { tab } = await searchParams;
  const activeTab = tab === "saved" ? "saved" : "works";

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

  // Fetch the user's works
  const { data: works } = await supabase
    .from("works")
    .select(`
      *,
      primary_interest:interests!works_primary_interest_id_fkey(id, name, slug)
    `)
    .eq("author_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch bookmarked works with author info
  const { data: bookmarkedWorks } = await supabase
    .from("bookmarks")
    .select(
      `
      work_id,
      created_at,
      work:works(
        id,
        title,
        work_type,
        image_url,
        created_at,
        author:profiles!works_author_id_fkey(id, username, display_name, avatar_url),
        primary_interest:interests!works_primary_interest_id_fkey(id, name, slug)
      )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Extract works from bookmarks
  const savedWorks = bookmarkedWorks
    ?.map((b) => b.work as unknown as Work | null)
    .filter((w): w is Work => w !== null);

  // Get follower/following counts
  const { count: followersCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", user.id);

  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", user.id);

  const displayWorks = activeTab === "saved" ? savedWorks : works;
  const postsCount = works?.length || 0;
  const threadNames = Array.from(
    new Set(
      [
        ...(works
          ?.map((work) => work.primary_interest?.name)
          .filter(Boolean) || []),
        ...(savedWorks
          ?.map((work) => work.primary_interest?.name)
          .filter(Boolean) || []),
      ].filter(Boolean)
    )
  );

  return (
    <div className="min-h-screen bg-[#d9d9d9]">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex gap-10">
          <aside className="w-56 shrink-0 hidden lg:block">
            <div className="text-3xl font-mono mb-8">✳︎ –</div>
            <div className="font-mono text-sm text-foreground/80 mb-4">
              following threads
            </div>
            <div className="space-y-3 font-mono text-sm">
              {threadNames.length > 0 ? (
                threadNames.map((name) => (
                  <div key={name} className="text-foreground/90">
                    *-{name.toLowerCase()}
                  </div>
                ))
              ) : (
                <div className="text-foreground/60">No threads yet.</div>
              )}
            </div>
          </aside>

          <section className="flex-1 bg-white rounded-[32px] shadow-sm border border-black/5 px-8 py-10">
            <div className="flex flex-col md:flex-row md:items-start gap-8">
              <div className="flex items-start gap-6 flex-1">
                <div className="rounded-full bg-[#d9d9d9] p-4">
                  <Avatar
                    src={profile?.avatar_url}
                    alt={profile?.display_name || "Avatar"}
                    fallback={profile?.display_name || user.email || "?"}
                    size="xl"
                  />
                </div>

                <div className="flex-1">
                  <h1 className="text-3xl font-mono">
                    {profile?.display_name || "Anonymous Artist"}
                  </h1>
                  {profile?.username && (
                    <p className="text-muted-foreground font-mono mt-2">
                      @{profile.username}
                    </p>
                  )}
                  {profile?.bio && (
                    <p className="mt-3 text-sm text-foreground/80">
                      {profile.bio}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-6 mt-4 text-sm font-mono">
                    <span>
                      <strong>{postsCount}</strong> posts
                    </span>
                    <span>
                      <strong>{followersCount || 0}</strong> followers
                    </span>
                    <span>
                      <strong>{followingCount || 0}</strong> following
                    </span>
                  </div>

                  <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                    {profile?.location && <span>{profile.location}</span>}
                    {profile?.website && (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground"
                      >
                        {profile.website}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <Link
                href="/profile/edit"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-mono hover:bg-muted transition-colors"
              >
                Edit profile
              </Link>
            </div>

            <div className="mt-10 border-b border-black/10">
              <div className="flex items-center justify-between font-mono text-sm">
                <Link
                  href="/profile"
                  className={`px-2 pb-3 transition-colors ${
                    activeTab === "works"
                      ? "text-foreground border-b-2 border-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  timeline
                </Link>
                <span className="px-2 pb-3 text-muted-foreground">
                  reposts
                </span>
                <Link
                  href="/profile?tab=saved"
                  className={`px-2 pb-3 transition-colors ${
                    activeTab === "saved"
                      ? "text-foreground border-b-2 border-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  saved
                </Link>
              </div>
            </div>

            <div className="mt-8 bg-[#d9d9d9] rounded-[28px] p-6 min-h-[520px]">
              {displayWorks && displayWorks.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {displayWorks.map((work) => (
                    <Link
                      key={work.id}
                      href={`/work/${work.id}`}
                      className="aspect-square relative rounded-2xl overflow-hidden border border-black/10 group bg-white"
                    >
                      {work.image_url && (
                        <img
                          src={work.image_url}
                          alt={work.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                      {(work.primary_interest?.name ||
                        work.work_type === "essay") && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {work.primary_interest?.name || "Essay"}
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <p className="text-white text-sm font-medium truncate">
                          {work.title}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  {activeTab === "saved" ? (
                    <p className="text-muted-foreground">
                      You haven&apos;t saved any works yet.
                    </p>
                  ) : (
                    <>
                      <p className="text-muted-foreground mb-4">
                        You haven&apos;t created any works yet.
                      </p>
                      <Link
                        href="/upload"
                        className="inline-block px-6 py-2 bg-foreground text-background rounded-full font-medium hover:opacity-90 transition-opacity"
                      >
                        Create Your First Work
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
