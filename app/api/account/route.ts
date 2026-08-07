import { requireUser } from "@/lib/api/requireUser";
import { reportServerError } from "@/lib/monitoring/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ASSIGNMENT_FILES_BUCKET = "assignment-files";
const STORAGE_PAGE_SIZE = 1_000;

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'Type "DELETE" to confirm account deletion.' },
      { status: 400 },
    );
  }

  if (!isDeletionConfirmation(body)) {
    return Response.json(
      { error: 'Type "DELETE" to confirm account deletion.' },
      { status: 400 },
    );
  }

  try {
    const admin = createAdminClient();
    const storagePaths = await listStoragePaths(admin, auth.user.id);

    for (let index = 0; index < storagePaths.length; index += STORAGE_PAGE_SIZE) {
      const { error } = await admin.storage
        .from(ASSIGNMENT_FILES_BUCKET)
        .remove(storagePaths.slice(index, index + STORAGE_PAGE_SIZE));

      if (error) throw error;
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(
      auth.user.id,
    );
    if (deleteError) throw deleteError;

    console.info(
      JSON.stringify({
        event: "account.deleted",
        timestamp: new Date().toISOString(),
        storageObjectsDeleted: storagePaths.length,
      }),
    );

    return new Response(null, { status: 204 });
  } catch (error) {
    await reportServerError(error, {
      source: "account-deletion",
      route: "/api/account",
    });

    return Response.json(
      {
        error:
          "Your account deletion could not be completed. Please try again or report the problem.",
      },
      { status: 500 },
    );
  }
}

async function listStoragePaths(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const paths: string[] = [];
  const pendingPrefixes = [userId];

  while (pendingPrefixes.length > 0) {
    const prefix = pendingPrefixes.pop();
    if (!prefix) continue;

    let offset = 0;
    while (true) {
      const { data, error } = await admin.storage
        .from(ASSIGNMENT_FILES_BUCKET)
        .list(prefix, {
          limit: STORAGE_PAGE_SIZE,
          offset,
          sortBy: { column: "name", order: "asc" },
        });

      if (error) throw error;

      for (const item of data) {
        const itemPath = `${prefix}/${item.name}`;
        if (item.id) {
          paths.push(itemPath);
        } else {
          pendingPrefixes.push(itemPath);
        }
      }

      if (data.length < STORAGE_PAGE_SIZE) break;
      offset += STORAGE_PAGE_SIZE;
    }
  }

  return paths;
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function isDeletionConfirmation(body: unknown) {
  return (
    typeof body === "object"
    && body !== null
    && (body as Record<string, unknown>).confirmation === "DELETE"
  );
}
