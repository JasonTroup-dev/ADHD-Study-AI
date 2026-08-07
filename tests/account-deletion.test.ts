import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteUser: vi.fn(),
  list: vi.fn(),
  remove: vi.fn(),
  reportServerError: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/lib/api/requireUser", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/monitoring/server", () => ({
  reportServerError: mocks.reportServerError,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: { admin: { deleteUser: mocks.deleteUser } },
    storage: {
      from: () => ({ list: mocks.list, remove: mocks.remove }),
    },
  }),
}));

import { DELETE } from "@/app/api/account/route";

describe("account deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ user: { id: "user-123" } });
    mocks.list.mockImplementation((prefix: string) => {
      if (prefix === "user-123") {
        return Promise.resolve({
          data: [{ id: null, name: "assignment-456" }],
          error: null,
        });
      }

      return Promise.resolve({
        data: [{ id: "object-789", name: "notes.pdf" }],
        error: null,
      });
    });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.deleteUser.mockResolvedValue({ error: null });
  });

  it("removes private storage objects before deleting the auth user", async () => {
    const response = await DELETE(
      new Request("https://adhdstudyai.com/api/account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://adhdstudyai.com",
        },
        body: JSON.stringify({ confirmation: "DELETE" }),
      }),
    );

    expect(response.status).toBe(204);
    expect(mocks.remove).toHaveBeenCalledWith([
      "user-123/assignment-456/notes.pdf",
    ]);
    expect(mocks.deleteUser).toHaveBeenCalledWith("user-123");
    expect(mocks.remove.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.deleteUser.mock.invocationCallOrder[0],
    );
  });

  it("requires the exact confirmation phrase", async () => {
    const response = await DELETE(
      new Request("https://adhdstudyai.com/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "delete" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
});
