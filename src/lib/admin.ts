import "server-only";
import { redirect } from "next/navigation";
import { requireUser, type CurrentUser } from "./auth";
import { createAdminClient } from "./supabase/admin";
import type { UserAccount } from "./types";

export * from "./admin-core";
import { isAdminUser, isUserSuspended } from "./admin-core";

/**
 * Requires the current session to belong to an admin, or redirects away.
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (isUserSuspended(user.id)) {
    redirect("/login?error=account_suspended");
  }
  if (!isAdminUser(user)) {
    redirect("/dashboard");
  }
  return user;
}

/**
 * Fetches all platform user accounts and their aggregated statistics.
 */
export async function listPlatformUsers(): Promise<UserAccount[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  // Load auth users
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
    console.error("Could not fetch admin users:", usersError);
    return [];
  }

  // Load forms and responses to compute totals per user
  const { data: forms } = await supabase.from("forms").select("id, owner_id, responses(count)");

  const formsByUser = new Map<string, { formCount: number; responseCount: number }>();
  if (forms) {
    for (const f of forms) {
      const existing = formsByUser.get(f.owner_id) ?? { formCount: 0, responseCount: 0 };
      const resCount = (f.responses as unknown as { count: number }[])?.[0]?.count ?? 0;
      formsByUser.set(f.owner_id, {
        formCount: existing.formCount + 1,
        responseCount: existing.responseCount + resCount,
      });
    }
  }

  return usersData.users.map((u) => {
    const stats = formsByUser.get(u.id) ?? { formCount: 0, responseCount: 0 };
    const email = u.email ?? "no-email";
    const role = isAdminUser({ id: u.id, email }) ? "admin" : "user";

    return {
      id: u.id,
      email,
      created_at: u.created_at,
      form_count: stats.formCount,
      response_count: stats.responseCount,
      is_suspended: isUserSuspended(u.id),
      role,
    };
  });
}

/**
 * Fetches platform-wide stats.
 */
export async function getPlatformStatistics() {
  await requireAdmin();
  const supabase = createAdminClient();

  const [{ count: formsCount }, { count: responsesCount }, { data: usersData }] =
    await Promise.all([
      supabase.from("forms").select("id", { count: "exact", head: true }),
      supabase.from("responses").select("id", { count: "exact", head: true }),
      supabase.auth.admin.listUsers(),
    ]);

  const totalUsers = usersData?.users.length ?? 0;
  const { isUserSuspended } = await import("./admin-core");
  const allUsers = usersData?.users ?? [];
  const suspendedCount = allUsers.filter((u) => isUserSuspended(u.id)).length;

  return {
    totalUsers,
    activeUsers: Math.max(0, totalUsers - suspendedCount),
    suspendedUsers: suspendedCount,
    totalForms: formsCount ?? 0,
    totalResponses: responsesCount ?? 0,
  };
}
