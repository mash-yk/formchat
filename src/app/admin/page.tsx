import {
  Activity,
  Ban,
  FileSpreadsheet,
  MessageSquare,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { getAuditLogs, getPlatformStatistics, listPlatformUsers, requireAdmin } from "@/lib/admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin Portal" };

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminContent />
    </Suspense>
  );
}

function AdminSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 w-64 rounded-lg bg-umber-200 dark:bg-umber-800" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-umber-100 dark:bg-umber-900" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-umber-100 dark:bg-umber-900" />
    </div>
  );
}

async function AdminContent() {
  await requireAdmin();

  const [stats, users] = await Promise.all([
    getPlatformStatistics(),
    listPlatformUsers(),
  ]);

  const auditLogs = getAuditLogs();

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-umber-900 dark:text-umber-100">
          Platform Administration
        </h1>
        <p className="mt-1 text-sm text-umber-600 dark:text-umber-400">
          Manage system users, monitor platform-wide metrics, review activity logs and control access.
        </p>
      </div>

      {/* Platform Stats */}
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Registered Users"
          value={stats.totalUsers}
          icon={Users}
          hint={`${stats.activeUsers} active · ${stats.suspendedUsers} suspended`}
        />
        <StatCard
          label="Total Forms Created"
          value={stats.totalForms}
          icon={FileSpreadsheet}
          hint="Across all accounts"
        />
        <StatCard
          label="Total Responses"
          value={stats.totalResponses}
          icon={MessageSquare}
          hint="All recorded submissions"
        />
        <StatCard
          label="Suspended Accounts"
          value={stats.suspendedUsers}
          icon={Ban}
          hint={stats.suspendedUsers > 0 ? "Blocked from submitting" : "Zero active suspensions"}
          highlight={stats.suspendedUsers > 0 ? "warning" : undefined}
        />
      </dl>

      {/* User Management Section */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-umber-900 dark:text-umber-100">
            User Accounts &amp; Permissions
          </h2>
          <p className="text-xs text-umber-500">
            Search registered users, view usage quotas, and suspend or reactivate access.
          </p>
        </div>
        <AdminUsersTable initialUsers={users} />
      </section>

      {/* Platform Audit & Activity Log */}
      <section className="rounded-xl border border-umber-200 bg-white p-5 shadow-xs dark:border-umber-800 dark:bg-umber-900">
        <div className="flex items-center gap-2 border-b border-umber-100 pb-3 dark:border-umber-800">
          <Activity className="size-4 text-bronze-600 dark:text-bronze-400" />
          <h2 className="text-sm font-semibold text-umber-900 dark:text-umber-100">
            Recent System Activity &amp; Error Feed
          </h2>
        </div>

        {auditLogs.length === 0 ? (
          <p className="mt-4 text-xs text-umber-400 italic">No recent system events logged.</p>
        ) : (
          <ul className="mt-3 divide-y divide-umber-100 text-xs dark:divide-umber-800">
            {auditLogs.slice(0, 15).map((log) => (
              <li key={log.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-semibold text-umber-800 dark:text-umber-200">
                    [{log.type.replace(/_/g, " ").toUpperCase()}]
                  </span>{" "}
                  <span className="text-umber-600 dark:text-umber-400">{log.description}</span>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-umber-400">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  highlight,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  hint: string;
  highlight?: "warning";
}) {
  return (
    <div className="rounded-xl border border-umber-200 bg-white p-4 shadow-xs dark:border-umber-800 dark:bg-umber-900">
      <div className="flex items-center justify-between">
        <dt className="text-xs font-medium text-umber-500">{label}</dt>
        <Icon className="size-4 text-umber-400" />
      </div>
      <dd
        className={cn(
          "mt-2 text-3xl font-bold font-display text-umber-900 dark:text-umber-100",
          highlight === "warning" && "text-amber-600 dark:text-amber-400",
        )}
      >
        {value}
      </dd>
      <p className="mt-1 text-[11px] text-umber-400">{hint}</p>
    </div>
  );
}
