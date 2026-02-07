import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import CreateDropdown from "./create-dropdown";
import HeaderSearch from "./header-search";
import NotificationBell from "./notification-bell";
import { getNotifications } from "@/app/(main)/notifications/actions";
import logo from "@/app/icon.svg";

export default async function Header(): Promise<JSX.Element> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: currentProfile }, notifications] = user
    ? await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .eq("id", user.id)
          .single(),
        getNotifications(),
      ])
    : [{ data: null }, []];

  const unreadCount = notifications.filter((n) => !n.read).length;

  const displayName =
    currentProfile?.display_name || currentProfile?.username || "guest";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 bg-[#8C7B9A] border-b border-black/20 px-6 py-4 font-mono">
      <div className="flex items-center gap-6">
        <Link href="/explore" className="flex items-center">
          <Image
            src={logo}
            alt="timeline"
            width={66}
            height={33}
            priority
            className="h-8 w-auto"
          />
        </Link>
        <CreateDropdown />
      </div>

      <div className="flex items-center rounded-full bg-white px-2 py-1 shadow-sm">
        <Link
          href="/explore"
          className="rounded-full px-5 py-1 text-sm hover:bg-black/5 transition-colors"
        >
          explore
        </Link>
        <Link
          href="/expand"
          className="rounded-full px-5 py-1 text-sm text-black/60 hover:bg-black/5 transition-colors"
        >
          expand
        </Link>
      </div>

      <HeaderSearch />

      <div className="flex items-center gap-3">
        {user && (
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
          />
        )}
        {user && currentProfile?.username && (
          <Link
            href={`/${currentProfile.username}`}
            className="rounded-full border border-black/40 bg-[#e6e6e6] px-4 py-1.5 text-sm shadow-sm hover:bg-[#dcdcdc] transition-colors"
          >
            profile
          </Link>
        )}
        {user && (
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="rounded-full border border-black/40 bg-[#e6e6e6] px-4 py-1.5 text-sm shadow-sm hover:bg-[#dcdcdc] transition-colors"
            >
              logout
            </button>
          </form>
        )}
        {!user && (
          <Link
            href="/login"
            className="rounded-full border border-black/40 bg-[#e6e6e6] px-4 py-1.5 text-sm shadow-sm hover:bg-[#dcdcdc] transition-colors"
          >
            login
          </Link>
        )}
      </div>
    </header>
  );
}
