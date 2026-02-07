"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface FollowButtonProps {
  profileId: string;
  isFollowing: boolean;
}

export function FollowButton({ profileId, isFollowing: initialIsFollowing }: FollowButtonProps) {
  const router = useRouter();
  const supabase = createClient();

  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);

  async function handleToggleFollow() {
    setIsLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profileId);

        if (error) throw error;
        setIsFollowing(false);
      } else {
        // Follow
        const { error } = await supabase
          .from("follows")
          .insert({
            follower_id: user.id,
            following_id: profileId,
          });

        if (error) throw error;
        setIsFollowing(true);
      }

      router.refresh();
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggleFollow}
      disabled={isLoading}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
        isFollowing
          ? "border border-border hover:bg-muted"
          : "bg-foreground text-background hover:opacity-90"
      }`}
    >
      {isLoading ? "..." : isFollowing ? "Following" : "Follow"}
    </button>
  );
}
