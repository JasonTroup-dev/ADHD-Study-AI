import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

type AuthenticatedRequest = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
};

export async function requireUser(): Promise<AuthenticatedRequest | Response> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return Response.json(
        { error: "You must be signed in to use AI features." },
        { status: 401 },
      );
    }

    return { supabase, user };
  } catch (error) {
    console.error("AI authentication check failed:", error);
    return Response.json(
      { error: "Authentication could not be checked. Try again shortly." },
      { status: 503 },
    );
  }
}
