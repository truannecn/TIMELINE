"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleThreadFollow } from "./actions";

type ThreadFollowButtonProps = {
  threadId: string;
  isFollowing: boolean;
  tint: string;
};

export default function ThreadFollowButton({
  threadId,
  isFollowing: initialIsFollowing,
  tint,
}: ThreadFollowButtonProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isPending, startTransition] = useTransition();

  function handleToggleFollow() {
    startTransition(() => {
      void (async () => {
        const result = await toggleThreadFollow(threadId);

        if (result.success) {
          setIsFollowing(result.isFollowing);
          router.refresh();
        }
      })();
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggleFollow}
      disabled={isPending}
      className={`rounded-md px-3 py-1 text-xs text-black font-[family-name:var(--font-jetbrains-mono)] disabled:opacity-50 ${
        isFollowing ? "opacity-70" : ""
      }`}
      style={{ backgroundColor: tint }}
    >
      {isPending ? "..." : isFollowing ? "following" : "+ follow"}
    </button>
  );
}
