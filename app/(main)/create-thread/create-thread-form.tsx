"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createThread } from "./actions";

export default function CreateThreadForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Thread name is required");
      return;
    }

    startTransition(() => {
      void (async () => {
        const result = await createThread(name.trim(), description.trim());

        if (!result.success) {
          setError(result.error || "Failed to create thread");
        } else if (result.threadId) {
          router.push(`/thread/${result.threadId}`);
        }
      })();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-black/70 mb-2">
          Thread name *
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="w-full rounded-lg border border-black/20 px-4 py-2 text-sm focus:border-black/40 focus:outline-none"
          placeholder="e.g., Pixel Art, Urban Sketching, Fan Art"
          disabled={isPending}
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-black/70 mb-2">
          Description (optional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={4}
          className="w-full rounded-lg border border-black/20 px-4 py-2 text-sm focus:border-black/40 focus:outline-none resize-none"
          placeholder="What kind of work belongs in this thread?"
          disabled={isPending}
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-black/20 px-6 py-2 text-sm hover:bg-black/5 transition-colors"
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-black px-6 py-2 text-sm text-white hover:bg-black/90 transition-colors disabled:opacity-50"
        >
          {isPending ? "Creating..." : "Create thread"}
        </button>
      </div>
    </form>
  );
}
