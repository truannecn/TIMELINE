import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CreateThreadForm from "./create-thread-form";

export default async function CreateThreadPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="rounded-2xl bg-white p-8 shadow-md">
        <h1 className="mb-6 text-2xl font-medium">Create a new thread</h1>
        <CreateThreadForm />
      </div>
    </div>
  );
}
