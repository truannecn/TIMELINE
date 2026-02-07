"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";

interface Profile {
  display_name: string | null;
  username: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  avatar_url: string | null;
}

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile>({
    display_name: "",
    username: "",
    bio: "",
    website: "",
    location: "",
    avatar_url: null,
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  // Load profile on mount
  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, username, bio, website, location, avatar_url")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error loading profile:", error);
        setError("Failed to load profile");
        setLoading(false);
        return;
      }

      setProfile({
        display_name: data.display_name || "",
        username: data.username || "",
        bio: data.bio || "",
        website: data.website || "",
        location: data.location || "",
        avatar_url: data.avatar_url,
      });
      setLoading(false);
    }

    loadProfile();
  }, [supabase, router]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setError("Avatar must be less than 2MB");
      return;
    }

    // Validate file type
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
      setError("Avatar must be a JPEG, PNG, GIF, or WebP image");
      return;
    }

    setError(null);
    setAvatarFile(file);
    setRemoveAvatar(false);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveAvatar() {
    setRemoveAvatar(true);
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleCancelAvatarChange() {
    setRemoveAvatar(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      let newAvatarUrl = profile.avatar_url;

      // Handle avatar removal
      if (removeAvatar) {
        // Delete old avatar from storage if it's in our bucket
        if (profile.avatar_url?.includes("/avatars/")) {
          const oldPath = profile.avatar_url.split("/avatars/")[1];
          if (oldPath) {
            await supabase.storage.from("avatars").remove([oldPath]);
          }
        }
        newAvatarUrl = null;
      }

      // Handle avatar upload
      if (avatarFile) {
        setUploadingAvatar(true);

        // Delete old avatar from storage if it's in our bucket
        if (profile.avatar_url?.includes("/avatars/")) {
          const oldPath = profile.avatar_url.split("/avatars/")[1];
          if (oldPath) {
            await supabase.storage.from("avatars").remove([oldPath]);
          }
        }

        // Upload new avatar
        const fileExt = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatarFile, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Failed to upload avatar: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        newAvatarUrl = urlData.publicUrl;
        setUploadingAvatar(false);
      }

      // Validate website URL if provided
      let websiteUrl = profile.website?.trim() || null;
      if (websiteUrl && !websiteUrl.startsWith("http")) {
        websiteUrl = `https://${websiteUrl}`;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          display_name: profile.display_name?.trim() || null,
          bio: profile.bio?.trim() || null,
          website: websiteUrl,
          location: profile.location?.trim() || null,
          avatar_url: newAvatarUrl,
        })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      router.push("/profile");
      router.refresh();
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err instanceof Error ? err.message : "Failed to update profile");
      setUploadingAvatar(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Determine what avatar to show
  const displayAvatar = removeAvatar
    ? null
    : avatarPreview || profile.avatar_url;

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
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Edit Profile</h1>
          <Link
            href="/profile"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar section */}
          <div className="space-y-3">
            <label className="block text-sm font-medium">Profile Photo</label>
            <div className="flex items-center gap-4">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover border border-border"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border border-border">
                  <span className="text-2xl text-muted-foreground">
                    {profile.display_name?.[0]?.toUpperCase() || "?"}
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                  id="avatar-upload"
                />
                <label
                  htmlFor="avatar-upload"
                  className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-muted transition-colors cursor-pointer text-center"
                >
                  Change Photo
                </label>
                {(profile.avatar_url || avatarPreview) && !removeAvatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                  >
                    Remove Photo
                  </button>
                )}
                {(avatarFile || removeAvatar) && (
                  <button
                    type="button"
                    onClick={handleCancelAvatarChange}
                    className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel Change
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, GIF, or WebP. Max 2MB.
            </p>
            {removeAvatar && (
              <p className="text-xs text-amber-600">
                Photo will be removed when you save changes.
              </p>
            )}
          </div>

          {/* Username (read-only) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted-foreground">
              Username
            </label>
            <p className="px-4 py-2 border border-border rounded-md bg-muted/50 text-muted-foreground">
              @{profile.username || "username"}
            </p>
            <p className="text-xs text-muted-foreground">
              Username cannot be changed.
            </p>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <label htmlFor="display_name" className="block text-sm font-medium">
              Display Name
            </label>
            <input
              id="display_name"
              type="text"
              value={profile.display_name || ""}
              onChange={(e) =>
                setProfile({ ...profile, display_name: e.target.value })
              }
              placeholder="Your name"
              className="w-full px-4 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20"
              maxLength={100}
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label htmlFor="bio" className="block text-sm font-medium">
              Bio
            </label>
            <textarea
              id="bio"
              value={profile.bio || ""}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              rows={4}
              className="w-full px-4 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {(profile.bio || "").length}/500
            </p>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label htmlFor="location" className="block text-sm font-medium">
              Location
            </label>
            <input
              id="location"
              type="text"
              value={profile.location || ""}
              onChange={(e) =>
                setProfile({ ...profile, location: e.target.value })
              }
              placeholder="City, Country"
              className="w-full px-4 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20"
              maxLength={100}
            />
          </div>

          {/* Website */}
          <div className="space-y-2">
            <label htmlFor="website" className="block text-sm font-medium">
              Website
            </label>
            <input
              id="website"
              type="text"
              value={profile.website || ""}
              onChange={(e) =>
                setProfile({ ...profile, website: e.target.value })
              }
              placeholder="https://yourwebsite.com"
              className="w-full px-4 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20"
              maxLength={200}
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Submit button */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || uploadingAvatar}
              className="flex-1 py-2.5 bg-foreground text-background rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {uploadingAvatar
                ? "Uploading photo..."
                : saving
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
