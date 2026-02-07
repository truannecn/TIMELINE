"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

export default function NewUserPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [birthday, setBirthday] = useState("");
  const [bio, setBio] = useState("");

  const [usernameError, setUsernameError] = useState("");
  const [checkingUsername, setCheckingUsername] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url, display_name")
        .eq("id", user.id)
        .single();

      // If user already has username, redirect to feed
      if (profile?.username) {
        router.push("/feed");
        return;
      }

      // Pre-fill name from OAuth display_name if available
      if (profile?.display_name) {
        const parts = profile.display_name.split(" ");
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
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

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user) return;

    const formatError = validateUsername(username);
    if (formatError) {
      setUsernameError(formatError);
      return;
    }

    if (usernameError) return;

    setSaving(true);

    try {
      const displayName =
        [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || null;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          username: username.toLowerCase(),
          display_name: displayName,
          bio: bio.trim() || null,
          avatar_url: avatarUrl,
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

      // Redirect to interests selection
      router.push("/newuser/interests");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#516e73]">
        <div className="animate-pulse text-white/70 font-[family-name:var(--font-jetbrains-mono)]">
          Loading...
        </div>
      </div>
    );
  }

  const isValid = username.length >= 3 && !usernameError && !checkingUsername && birthday !== "";

  return (
    <div className="h-screen bg-[#516e73] flex flex-col lg:flex-row overflow-hidden">
      {/* Left section — branding + text */}
      <div className="flex-1 flex flex-col justify-between p-8 sm:p-12 lg:p-16">
        <p className="font-[family-name:var(--font-jetbrains-mono)] text-white text-6xl sm:text-8xl lg:text-[128px] leading-none">
          *-
        </p>

        <div className="my-8 lg:my-0">
          <h1 className="font-[family-name:var(--font-jetbrains-mono)] text-white text-4xl sm:text-5xl lg:text-[64px] leading-none mb-6 lg:mb-8">
            personalize.
          </h1>
          <p className="font-['Inria_Serif',serif] text-white text-xl sm:text-2xl lg:text-[32px] leading-tight">
            first, tell us the basics...
          </p>
        </div>

        <div className="hidden lg:block" />
      </div>

      {/* Right section — form card */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-4 sm:p-8 lg:py-8 lg:px-12">
        <div className="bg-white/70 rounded-[43px] w-full max-w-[650px] px-8 sm:px-14 py-8 sm:py-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* First Name */}
            <div>
              <label className="block font-['Jeju_Myeongjo',serif] text-black text-base mb-1">
                first name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full h-[48px] bg-white/70 rounded-[20px] px-5 text-black focus:outline-none focus:ring-2 focus:ring-[#3f5357]/30"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block font-['Jeju_Myeongjo',serif] text-black text-base mb-1">
                last name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full h-[48px] bg-white/70 rounded-[20px] px-5 text-black focus:outline-none focus:ring-2 focus:ring-[#3f5357]/30"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block font-['Jeju_Myeongjo',serif] text-black text-base mb-1">
                username
              </label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-black/50 text-base">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  onBlur={handleUsernameBlur}
                  autoComplete="off"
                  className={`w-full h-[48px] bg-white/70 rounded-[20px] pl-10 pr-5 text-black focus:outline-none focus:ring-2 focus:ring-[#3f5357]/30 ${
                    usernameError ? "ring-2 ring-red-400" : ""
                  }`}
                />
              </div>
              {usernameError && (
                <p className="text-sm text-red-600 mt-1">{usernameError}</p>
              )}
              {checkingUsername && (
                <p className="text-sm text-white/70 mt-1">Checking...</p>
              )}
            </div>

            {/* Birthday */}
            <div>
              <label className="block font-['Jeju_Myeongjo',serif] text-black text-base mb-1">
                birthday
              </label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full h-[48px] bg-white/70 rounded-[20px] px-5 text-black focus:outline-none focus:ring-2 focus:ring-[#3f5357]/30"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block font-['Jeju_Myeongjo',serif] text-black text-base mb-1">
                bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Don't worry, you can always change this later..."
                className="w-full h-[150px] bg-white/70 rounded-[20px] px-5 py-3 text-black placeholder:text-[#9d9191] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#3f5357]/30"
                maxLength={500}
              />
            </div>

            {/* Continue button */}
            <div className="flex justify-center pt-1">
              <button
                type="submit"
                disabled={!isValid || saving}
                className="bg-[#3f5357] text-white font-[family-name:var(--font-jetbrains-mono)] text-[19px] h-[44px] px-10 rounded-[20px] hover:bg-[#4a6266] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "saving..." : "continue"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
