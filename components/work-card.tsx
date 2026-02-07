import Link from "next/link";
import { Avatar } from "./avatar";

interface WorkCardProps {
  work: {
    id: string;
    title: string;
    image_url?: string | null;
    work_type: "image" | "essay";
    description?: string | null;
    primary_thread?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  };
  author?: {
    username?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
  };
  showAuthor?: boolean;
  isFollowed?: boolean;
}

export function WorkCard({
  work,
  author,
  showAuthor = true,
  isFollowed = false,
}: WorkCardProps): JSX.Element {
  const isEssay = work.work_type === "essay";

  return (
    <article className="border border-border rounded-lg overflow-hidden bg-card group">
      <Link href={`/work/${work.id}`} className="block">
        <div className="aspect-square relative">
          {work.image_url && (
            <img
              src={work.image_url}
              alt={work.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {(work.primary_thread?.name || isEssay) && (
            <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {work.primary_thread?.name || "Essay"}
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
        {showAuthor && author && (
          <Link
            href={author.username ? `/${author.username}` : "#"}
            className="flex items-center gap-2 mt-3 group"
          >
            <Avatar
              src={author.avatar_url}
              alt={author.display_name || "Author"}
              fallback={author.display_name || "?"}
              size="xs"
            />
            <span className="text-sm text-muted-foreground group-hover:text-foreground">
              {author.display_name || "Anonymous"}
            </span>
            {isFollowed && (
              <span className="text-xs text-muted-foreground">Following</span>
            )}
          </Link>
        )}
      </div>
    </article>
  );
}
