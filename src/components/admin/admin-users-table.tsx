"use client";

import {
  Ban,
  CheckCircle,
  Loader2,
  Lock,
  Search,
  Shield,
  Unlock,
  X,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { adminReactivateUser, adminSuspendUser } from "@/app/dashboard/actions";
import type { UserAccount } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AdminUsersTable({ initialUsers }: { initialUsers: UserAccount[] }) {
  const [users, setUsers] = useState<UserAccount[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "suspended">("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.email.toLowerCase().includes(search.toLowerCase().trim()) ||
        u.id.toLowerCase().includes(search.toLowerCase().trim());
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "suspended"
            ? u.is_suspended
            : !u.is_suspended;
      return matchesSearch && matchesFilter;
    });
  }, [users, search, filter]);

  function handleToggleSuspend(user: UserAccount) {
    setPendingId(user.id);
    startTransition(async () => {
      if (user.is_suspended) {
        const res = await adminReactivateUser(user.id);
        if (res.ok) {
          toast.success(`Account for ${user.email} reactivated.`);
          setUsers((prev) =>
            prev.map((u) => (u.id === user.id ? { ...u, is_suspended: false } : u)),
          );
        } else {
          toast.error(res.error);
        }
      } else {
        const res = await adminSuspendUser(user.id);
        if (res.ok) {
          toast.warning(`Account for ${user.email} suspended.`);
          setUsers((prev) =>
            prev.map((u) => (u.id === user.id ? { ...u, is_suspended: true } : u)),
          );
        } else {
          toast.error(res.error);
        }
      }
      setPendingId(null);
    });
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative min-w-0 flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-umber-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by email or user ID…"
            className="w-full rounded-xl border border-umber-200 bg-white py-2 pl-9 pr-8 text-xs text-umber-900 outline-none transition placeholder:text-umber-400 focus:border-bronze-500 focus:ring-2 focus:ring-bronze-500/20 dark:border-umber-800 dark:bg-umber-900 dark:text-umber-100"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-umber-400 hover:text-umber-700"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="inline-flex rounded-lg border border-umber-200 bg-white p-0.5 text-xs font-medium dark:border-umber-800 dark:bg-umber-900">
          {(["all", "active", "suspended"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1 capitalize transition",
                filter === f
                  ? "bg-bronze-600 text-white dark:bg-bronze-500"
                  : "text-umber-600 hover:text-umber-900 dark:text-umber-400",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-umber-300 bg-white p-10 text-center dark:border-umber-800 dark:bg-umber-900">
          <p className="text-sm font-medium">No users found</p>
          <p className="mt-1 text-xs text-umber-400">Try adjusting your search query or status filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-umber-200 bg-white shadow-xs dark:border-umber-800 dark:bg-umber-900">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-umber-100 bg-umber-50/60 text-umber-500 dark:border-umber-800 dark:bg-umber-950/60">
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Forms</th>
                <th className="px-4 py-3 font-semibold">Responses</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-umber-100 dark:divide-umber-800">
              {filtered.map((user) => {
                const isItemPending = isPending && pendingId === user.id;
                return (
                  <tr
                    key={user.id}
                    className="hover:bg-umber-50/50 dark:hover:bg-umber-950/40 transition"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-umber-900 dark:text-umber-100">
                        {user.email}
                      </p>
                      <p className="font-mono text-[10px] text-umber-400">{user.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          user.role === "admin"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                            : "bg-umber-100 text-umber-700 dark:bg-umber-800 dark:text-umber-300",
                        )}
                      >
                        {user.role === "admin" ? <Shield className="size-3" /> : null}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          user.is_suspended
                            ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
                        )}
                      >
                        {user.is_suspended ? <Ban className="size-3" /> : <CheckCircle className="size-3" />}
                        {user.is_suspended ? "Suspended" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-umber-700 dark:text-umber-300">
                      {user.form_count}
                    </td>
                    <td className="px-4 py-3 font-medium text-umber-700 dark:text-umber-300">
                      {user.response_count}
                    </td>
                    <td className="px-4 py-3 text-umber-400 text-[11px] whitespace-nowrap">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleSuspend(user)}
                        disabled={isItemPending}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                          user.is_suspended
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900"
                            : "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-900",
                        )}
                      >
                        {isItemPending ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : user.is_suspended ? (
                          <Unlock className="size-3" />
                        ) : (
                          <Lock className="size-3" />
                        )}
                        {user.is_suspended ? "Reactivate" : "Suspend"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
