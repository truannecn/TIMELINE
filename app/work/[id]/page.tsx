import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DeleteButton } from "./delete-button";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WorkPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // Get current user (may be null)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch the work with author
  const { data: work, error } = await supabase
    .from("works")
    .select(
      `
      *,
      author:profiles!works_author_id_fkey(id, username, display_name, avatar_url)
    `
    )
    .eq("id", id)
    .single();

  if (error || !work) {
    notFound();
  }

  const isOwner = user?.id === work.author_id;

  // Format date
  const publishedDate = new Date(work.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Calculate reading time for essays (rough estimate: 200 words per minute)
  const readingTime =
    work.work_type === "essay" && work.content
      ? Math.max(1, Math.ceil(work.content.split(/\s+/).length / 200))
      : null;

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
                  className="flex items-center gap-1 px-4 py-1.5 bg-foreground text-background rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <span>+</span> New
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

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Cover image */}
        {work.image_url && (
          <div className="mb-8">
            <img
              src={work.image_url}
              alt={work.title}
              className={`w-full rounded-lg ${
                work.work_type === "essay" ? "max-h-80 object-cover" : ""
              }`}
            />
          </div>
        )}

        {/* Title and meta */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              {work.work_type === "essay" && (
                <span className="inline-block px-2 py-0.5 bg-muted text-muted-foreground text-xs font-medium rounded mb-3">
                  Essay
                </span>
              )}
              <h1 className="text-3xl font-bold mb-4">{work.title}</h1>
            </div>
            {isOwner && <DeleteButton workId={work.id} />}
          </div>

          {/* Author info */}
          <div className="flex items-center gap-3">
            <Link
              href={work.author?.username ? `/${work.author.username}` : "#"}
              className="flex items-center gap-3 group"
            >
              {work.author?.avatar_url ? (
                <img
                  src={work.author.avatar_url}
                  alt={work.author.display_name || "Author"}
                  className="w-10 h-10 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground">
                    {(work.author?.display_name || "?")[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="font-medium group-hover:underline">
                  {work.author?.display_name || "Anonymous"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {publishedDate}
                  {readingTime && ` · ${readingTime} min read`}
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Description for images */}
        {work.work_type === "image" && work.description && (
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p className="text-lg text-muted-foreground">{work.description}</p>
          </div>
        )}

        {/* Essay content */}
        {work.work_type === "essay" && work.content && (
          <article className="prose prose-neutral dark:prose-invert max-w-none">
            {work.content.split("\n\n").map((paragraph: string, i: number) => (
              <p key={i} className="mb-4 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </article>
        )}

        {/* Back link */}
        <div className="mt-12 pt-8 border-t border-border">
          <Link
            href="/feed"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Feed
          </Link>
        </div>
      </main>
    </div>
  );
}
