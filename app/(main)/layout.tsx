import Link from "next/link";
import { getUser } from "@/lib/supabase/server";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  const user = await getUser();

  return (
    <div className="min-h-screen">
      <nav className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-xl font-bold">
                Artfolio
              </Link>
              <div className="hidden sm:flex gap-6">
                <Link
                  href="/feed"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Feed
                </Link>
                <Link
                  href="/explore"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Explore
                </Link>
                <Link
                  href="/upload"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Upload
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground hidden sm:block">
                    {user.email}
                  </span>
                  <form action="/signout" method="POST">
                    <button
                      type="submit"
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  );
}
