// Re-export the browser client for convenience in client components
export { createClient } from "./supabase/client";

export interface SavedThread {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  saved_at: string;
  user_id: string;
  tags: string[];
  notes: string | null;
  is_read: boolean;
}

export async function saveThread(
  url: string,
  meta?: Partial<Pick<SavedThread, "title" | "description" | "image" | "tags">>
): Promise<{ data: SavedThread | null; error: Error | null }> {
  const { createClient } = await import("./supabase/client");
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("threads")
    .insert([{ url, user_id: user?.id ?? null, ...meta }])
    .select()
    .single();

  return { data, error };
}
