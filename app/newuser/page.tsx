"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { uploadFileWithPresignedUrl } from "@/lib/amplify/storage";

export default function NewUserPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [checkingUsername, setCheckingUsername] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Load user and profile on mount
  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);

      // Get current profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single();

      // If user already has username, redirect to feed
      if (profile?.username) {
        router.push("/feed");
        return;
      }

      setAvatarUrl(profile?.avatar_url || null);
      setLoading(false);
    }

    loadUser();
  }, [supabase, router]);

  // Validate username format
  function validateUsername(value: string): string | null {
    if (value.length < 3) {
      return "Username must be at least 3 characters";
    }
    if (value.length > 30) {
      return "Username must be 30 characters or less";
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return "Only letters, numbers, and underscores allowed";
    }
    return null;
  }

  // Check username availability
  async function checkUsername(value: string) {
    const formatError = validateUsername(value);
    if (formatError) {
      setUsernameError(formatError);
      return;
    }

    setCheckingUsername(true);
    setUsernameError("");

    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", value.toLowerCase())
      .maybeSingle();

    setCheckingUsername(false);

    if (error) {
      setUsernameError("Error checking username");
      return;
    }

    if (data) {
      setUsernameError("Username already taken");
    }
  }

  // Handle username input change
  function handleUsernameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(value);
    setUsernameError("");
  }

  // Handle username blur (check availability)
  function handleUsernameBlur() {
    if (username) {
      checkUsername(username);
    }
  }

  // Handle avatar file selection
  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be less than 2MB");
      return;
    }

    setAvatarFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user) return;

    // Validate username
    const formatError = validateUsername(username);
    if (formatError) {
      setUsernameError(formatError);
      return;
    }

    if (usernameError) return;

    setSaving(true);

    try {
      let finalAvatarUrl = avatarUrl;

      // Upload new avatar if selected
      if (avatarFile) {
        try {
          const uploadResult = await uploadFileWithPresignedUrl(avatarFile);
          finalAvatarUrl = uploadResult.url;
        } catch {
          throw new Error("Failed to upload avatar");
        }
      }

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          username: username.toLowerCase(),
          avatar_url: finalAvatarUrl,
        })
        .eq("id", user.id);

      if (updateError) {
        if (updateError.code === "23505") {
          setUsernameError("Username already taken");
          setSaving(false);
          return;
        }
        throw updateError;
      }

      // Redirect to feed
      router.push("/feed");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Something went wrong. Please try again.");
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

  const displayAvatar = avatarPreview || avatarUrl;
  const isValid = username.length >= 3 && !usernameError && !checkingUsername;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Welcome to Artfolio</h1>
          <p className="text-muted-foreground">
            Let&apos;s set up your profile
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative group"
            >
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-3xl text-muted-foreground">?</span>
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-sm">Change</span>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <p className="text-sm text-muted-foreground">
              Click to upload a profile picture
            </p>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-medium">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                @
              </span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={handleUsernameChange}
                onBlur={handleUsernameBlur}
                placeholder="yourname"
                autoComplete="off"
                className={`w-full pl-8 pr-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20 ${
                  usernameError ? "border-red-500" : "border-border"
                }`}
              />
              {checkingUsername && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  Checking...
                </span>
              )}
            </div>
            {usernameError && (
              <p className="text-sm text-red-500">{usernameError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Letters, numbers, and underscores only. 3-30 characters.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!isValid || saving}
            className="w-full py-2.5 bg-foreground text-background rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Setting up..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
