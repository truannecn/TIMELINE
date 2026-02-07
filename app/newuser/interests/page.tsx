"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Thread {
  id: string;
  name: string;
}

export default function InterestsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Fetch threads and user's existing selections on mount
  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Fetch all threads from database
      const { data: threadsData } = await supabase
        .from("threads")
        .select("id, name")
        .order("name");

      if (threadsData) {
        setThreads(threadsData);
      }

      // Fetch user's existing thread selections
      const { data: userThreads } = await supabase
        .from("user_threads")
        .select("thread_id")
        .eq("user_id", user.id);

      if (userThreads && userThreads.length > 0) {
        setSelected(new Set(userThreads.map((ut) => ut.thread_id)));
      }

      setLoading(false);
    }

    init();
  }, [supabase, router]);

  function toggleThread(threadId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  }

  async function handleDone() {
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // Delete existing user thread follows for idempotency
    await supabase.from("user_threads").delete().eq("user_id", user.id);

    // Insert new selections as thread follows
    if (selected.size > 0) {
      const inserts = Array.from(selected).map((threadId) => ({
        user_id: user.id,
        thread_id: threadId,
      }));

      await supabase.from("user_threads").insert(inserts);
    }

    router.push("/explore");
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#516e73]">
        <div className="animate-pulse text-white/70 font-[family-name:var(--font-jetbrains-mono)]">
          Loading...
        </div>
      </div>
    );
  }

  const isValid = selected.size >= 2;

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
            what are <span className="italic">you</span> interested in?
          </p>
        </div>

        <div className="hidden lg:block" />
      </div>

      {/* Right section — interests card */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-4 sm:p-8 lg:py-8 lg:px-12">
        <div className="bg-white/70 rounded-[43px] w-full max-w-[650px] px-8 sm:px-14 py-8 sm:py-10 flex flex-col h-full max-h-[874px]">
          {/* Header */}
          <p className="font-['Inria_Serif',serif] text-black text-2xl sm:text-[32px] text-center mb-6">
            Select at least 2
          </p>

          {/* Interest tags grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-3 gap-3 justify-items-center">
              {threads.map((thread) => {
                const isSelected = selected.has(thread.id);
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => toggleThread(thread.id)}
                    className={`w-full h-[53px] rounded-[20px] font-[family-name:var(--font-jetbrains-mono)] text-white text-sm sm:text-base transition-colors ${
                      isSelected
                        ? "bg-[#3f5357]"
                        : "bg-[rgba(25,37,71,0.2)] hover:bg-[rgba(25,37,71,0.35)]"
                    }`}
                  >
                    {thread.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Done button */}
          <div className="flex justify-center pt-6">
            <button
              type="button"
              onClick={handleDone}
              disabled={!isValid || saving}
              className="bg-[#3f5357] text-white font-[family-name:var(--font-jetbrains-mono)] text-[19px] h-[53px] px-12 rounded-[20px] hover:bg-[#4a6266] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "saving..." : "Done"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
