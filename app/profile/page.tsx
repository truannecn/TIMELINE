import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ProfilePage() {
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
            <Link
              href="/profile"
              className="text-sm text-foreground font-medium"
            >
              Profile
            </Link>
            <form action="/auth/signout" method="post">
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
        <div className="flex items-start gap-6 mb-8">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name || "Avatar"}
              className="w-24 h-24 rounded-full"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
              <span className="text-2xl text-muted-foreground">
                {(profile?.display_name || user.email)?.[0]?.toUpperCase()}
              </span>
            </div>
          )}

          <div className="flex-1">
            <h1 className="text-2xl font-bold">
              {profile?.display_name || "Anonymous Artist"}
            </h1>
            {profile?.username && (
              <p className="text-muted-foreground">@{profile.username}</p>
            )}
            {profile?.bio && <p className="mt-2">{profile.bio}</p>}

            <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
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
          <h2 className="text-lg font-semibold mb-4">Your Works</h2>
          <p className="text-muted-foreground text-sm">
            You haven't uploaded any works yet. Your portfolio will appear here.
          </p>
        </div>
      </main>
    </div>
  );
}
