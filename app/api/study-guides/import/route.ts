import { requireUser } from "@/lib/api/requireUser";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_IMPORT_GUIDES = 20;

type LegacyGuide = {
  id?: unknown;
  title?: unknown;
  content?: unknown;
  originalFileName?: unknown;
  createdAt?: unknown;
};

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  let body: { guides?: unknown };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid study guide import." }, { status: 400 });
  }

  if (!Array.isArray(body.guides)) {
    return Response.json({ error: "No study guides were provided." }, { status: 400 });
  }

  const guides = body.guides
    .slice(0, MAX_IMPORT_GUIDES)
    .filter(isLegacyGuide)
    .map((guide) => ({
      id: guide.id,
      user_id: auth.user.id,
      title: guide.title.trim(),
      content: guide.content,
      original_file_name: guide.originalFileName.trim(),
      created_at: isValidDate(guide.createdAt) ? guide.createdAt : new Date().toISOString(),
    }));

  if (guides.length === 0) {
    return Response.json({ error: "No valid study guides were provided." }, { status: 400 });
  }

  const { error } = await auth.supabase
    .from("study_guides")
    .upsert(guides, { onConflict: "id", ignoreDuplicates: true });

  if (error) {
    console.error("Could not import saved study guides:", error);
    return Response.json({ error: "Could not import saved study guides." }, { status: 500 });
  }

  return Response.json({ imported: guides.length });
}

function isLegacyGuide(value: unknown): value is Required<LegacyGuide> & {
  id: string;
  title: string;
  content: string;
  originalFileName: string;
  createdAt: string;
} {
  if (!value || typeof value !== "object") return false;
  const guide = value as LegacyGuide;

  return (
    typeof guide.id === "string" &&
    UUID_PATTERN.test(guide.id) &&
    typeof guide.title === "string" &&
    guide.title.trim().length > 0 &&
    typeof guide.content === "string" &&
    guide.content.trim().length > 0 &&
    typeof guide.originalFileName === "string" &&
    guide.originalFileName.trim().length > 0 &&
    typeof guide.createdAt === "string"
  );
}

function isValidDate(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}
