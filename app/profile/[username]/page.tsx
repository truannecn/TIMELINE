import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { FollowButton } from "./follow-button";

interface Props {
  params: Promise<{ username: string }>;
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  // Get current user (may be null if not logged in)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch the profile by username
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .single();

  if (error || !profile) {
    notFound();
  }

  // If viewing own profile, redirect to /profile
  if (user && profile.id === user.id) {
    redirect("/profile");
  }

  // Fetch the user's works
  const { data: works } = await supabase
    .from("works")
    .select("*")
    .eq("author_id", profile.id)
    .order("created_at", { ascending: false });

  // Check if current user is following this profile
  let isFollowing = false;
  if (user) {
    const { data: follow } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("following_id", profile.id)
      .maybeSingle();

    isFollowing = !!follow;
  }

  // Get follower/following counts
  const { count: followersCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", profile.id);

  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", profile.id);

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
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Feed
            </Link>
            {user ? (
              <>
                <Link
                  href="/profile"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Profile
                </Link>
                <Link
                  href="/upload"
                  className="px-4 py-1.5 bg-foreground text-background rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Upload
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="px-4 py-1.5 bg-foreground text-background rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-start gap-6 mb-8">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name || "Avatar"}
              className="w-24 h-24 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
              <span className="text-2xl text-muted-foreground">
                {(profile.display_name || "?")[0].toUpperCase()}
              </span>
            </div>
          )}

          <div className="flex-1">
            <h1 className="text-2xl font-bold">
              {profile.display_name || "Anonymous Artist"}
            </h1>
            <p className="text-muted-foreground">@{profile.username}</p>
            {profile.bio && <p className="mt-2">{profile.bio}</p>}

            <div className="flex gap-4 mt-3 text-sm">
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
              {profile.location && <span>{profile.location}</span>}
              {profile.website && (
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

          {user && (
            <FollowButton
              profileId={profile.id}
              isFollowing={isFollowing}
            />
          )}
        </div>

        <div className="border-t border-border pt-8">
          <h2 className="text-lg font-semibold mb-4">
            Works {works && works.length > 0 && `(${works.length})`}
          </h2>

          {works && works.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {works.map((work) => (
                <div
                  key={work.id}
                  className="aspect-square relative rounded-lg overflow-hidden border border-border group"
                >
                  {work.image_url && (
                    <img
                      src={work.image_url}
                      alt={work.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <p className="text-white text-sm font-medium truncate">
                      {work.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No works yet.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
