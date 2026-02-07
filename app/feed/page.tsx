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
        <h1 className="text-2xl font-bold mb-6">Your Feed</h1>

        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-muted-foreground mb-4">
            Welcome to Artfolio, {profile?.display_name || "artist"}!
          </p>
          <p className="text-sm text-muted-foreground">
            Your feed will show artwork from artists you follow. This is a
            placeholder page while we build out the full experience.
          </p>
        </div>

        {/* Debug info - remove in production */}
        <details className="mt-8">
          <summary className="text-sm text-muted-foreground cursor-pointer">
            Debug: User Info
          </summary>
          <pre className="mt-2 p-4 bg-muted rounded text-xs overflow-auto">
            {JSON.stringify({ user: user.email, profile }, null, 2)}
          </pre>
        </details>
      </main>
    </div>
  );
}
