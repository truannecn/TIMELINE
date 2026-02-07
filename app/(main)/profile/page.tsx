import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/avatar";

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

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
    .select("*")
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
        author:profiles!works_author_id_fkey(id, username, display_name, avatar_url)
      )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Extract works from bookmarks
  const savedWorks = bookmarkedWorks
    ?.map((b) => b.work)
    .filter((w): w is NonNullable<typeof w> => w !== null);

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-start gap-6 mb-8">
        <Avatar
          src={profile?.avatar_url}
          alt={profile?.display_name || "Avatar"}
          fallback={profile?.display_name || user.email || "?"}
          size="xl"
        />

        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {profile?.display_name || "Anonymous Artist"}
          </h1>
          {profile?.username && (
            <p className="text-muted-foreground">@{profile.username}</p>
          )}
          {profile?.bio && <p className="mt-2">{profile.bio}</p>}

          <div className="flex gap-4 mt-3 text-sm">
            <span>
              <strong>{postsCount}</strong>{" "}
              <span className="text-muted-foreground">posts</span>
            </span>
            <span>
              <strong>{followersCount || 0}</strong>{" "}
              <span className="text-muted-foreground">followers</span>
            </span>
            <span>
              <strong>{followingCount || 0}</strong>{" "}
              <span className="text-muted-foreground">following</span>
            </span>
          </div>

          <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
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

        <Link
          href="/profile/edit"
          className="px-4 py-2 border border-border rounded-md text-sm hover:bg-muted transition-colors"
        >
          Edit Profile
        </Link>
      </div>

      <div className="border-t border-border pt-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          <Link
            href="/profile"
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "works"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Works {works && works.length > 0 && `(${works.length})`}
          </Link>
          <Link
            href="/profile?tab=saved"
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "saved"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Saved {savedWorks && savedWorks.length > 0 && `(${savedWorks.length})`}
          </Link>
        </div>

        {displayWorks && displayWorks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayWorks.map((work) => (
              <Link
                key={work.id}
                href={`/work/${work.id}`}
                className="aspect-square relative rounded-lg overflow-hidden border border-border group"
              >
                {work.image_url && (
                  <img
                    src={work.image_url}
                    alt={work.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                {work.work_type === "essay" && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white text-xs font-medium rounded">
                    Essay
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
          <div className="text-center py-12">
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
                  className="inline-block px-6 py-2 bg-foreground text-background rounded-md font-medium hover:opacity-90 transition-opacity"
                >
                  Create Your First Work
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
