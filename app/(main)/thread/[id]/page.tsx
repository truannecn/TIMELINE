import { redirect } from "next/navigation";

export default async function ThreadPage({
  params,
}: {
  params: { id: string };
}): Promise<never> {
  redirect(`/threads/${params.id}`);
}
