import Link from "next/link";

export type PortfolioProfile = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
};

type PortfolioCardProps = {
  profile: PortfolioProfile | null;
  className?: string;
};

export default function PortfolioCard({
  profile,
  className,
}: PortfolioCardProps): JSX.Element {
  const displayName = profile?.display_name || profile?.username || "guest";
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const usernameLabel = profile?.username ? `@${profile.username}` : "@guest";
  const nameParts = displayName.trim().split(/\s+/);
  const firstName = nameParts[0] || displayName;
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
  const bio = profile?.bio?.trim() || "";

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/60 bg-[rgba(95,102,107,0.85)] shadow-[0px_18px_35px_rgba(0,0,0,0.12)] backdrop-blur-xl ${
        className || ""
      }`}
    >
      <div className="h-24 bg-white/95" />
      <div className="absolute left-8 top-12">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={displayName}
            className="h-24 w-24 rounded-full border-4 border-[#d9d9d9] object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#d9d9d9] bg-[#d8d8d8] text-3xl text-black/70">
            {avatarLetter}
          </div>
        )}
      </div>
      <div className="px-6 pb-6 pt-10 text-white">
        <div className="mt-6">
          <p className="text-xl font-[family-name:var(--font-jetbrains-mono)] whitespace-nowrap overflow-hidden text-ellipsis">
            {firstName}
            {lastName ? ` ${lastName}` : ""}
          </p>
          <p className="mt-1 text-sm opacity-90">{usernameLabel}</p>
        </div>
        <p className="mt-8 text-sm leading-relaxed text-white/90 max-h-20 overflow-hidden">
          {bio}
        </p>
        <div className="mt-6 flex justify-center">
          {profile?.username ? (
            <Link
              href={`/${profile.username}`}
              className="rounded-full bg-[#d9d9d9] px-8 py-2 text-sm text-black font-[family-name:var(--font-jetbrains-mono)] shadow-sm hover:bg-white transition-colors"
            >
              portfolio
            </Link>
          ) : (
            <span className="rounded-full bg-[#d9d9d9] px-8 py-2 text-sm text-black font-[family-name:var(--font-jetbrains-mono)] shadow-sm">
              portfolio
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
