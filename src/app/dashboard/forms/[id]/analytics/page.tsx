import {
  CheckCircle2,
  Download,
  Eye,
  Percent,
  PlayCircle,
  Star,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { buttonClass } from "@/components/ui/button";
import { calculateFormAnalytics } from "@/lib/analytics";
import { getOwnedForm } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import type { FormResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function AnalyticsContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const form = await getOwnedForm(id);
  if (!form) notFound();

  const daysFilter = query.days === "7" ? 7 : query.days === "all" ? 0 : 30;

  // Fetch responses to compute analytics
  const supabase = await createClient();
  const { data } = await supabase
    .from("responses")
    .select("id, form_id, answers, source, submitted_at")
    .eq("form_id", form.id)
    .order("submitted_at", { ascending: false })
    .returns<FormResponse[]>();

  const responses = data ?? [];
  const stats = calculateFormAnalytics({
    formId: form.id,
    questions: form.questions,
    responses,
    daysFilter,
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Form Analytics &amp; Performance</h2>
          <p className="text-xs text-umber-500">
            Insights on conversation drop-offs, question engagement, and submission trends.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time range selector */}
          <div className="inline-flex rounded-lg border border-umber-200 bg-white p-0.5 text-xs font-medium dark:border-umber-800 dark:bg-umber-900">
            {[
              { label: "7 days", value: "7" },
              { label: "30 days", value: "30" },
              { label: "All time", value: "all" },
            ].map((option) => {
              const active =
                (query.days === option.value) ||
                (option.value === "30" && !query.days);
              return (
                <Link
                  key={option.value}
                  href={`/dashboard/forms/${form.id}/analytics?days=${option.value}`}
                  className={cn(
                    "rounded px-2.5 py-1 transition",
                    active
                      ? "bg-bronze-600 text-white dark:bg-bronze-500"
                      : "text-umber-600 hover:text-umber-900 dark:text-umber-400 dark:hover:text-umber-200",
                  )}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>

          <a
            href={`/dashboard/forms/${form.id}/responses/export`}
            className={buttonClass("secondary", "sm")}
          >
            <Download className="size-3.5" /> Export CSV
          </a>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          title="Total Form Views"
          value={stats.views}
          icon={Eye}
          hint="Widget and public impressions"
        />
        <MetricCard
          title="Conversation Starts"
          value={stats.starts}
          icon={PlayCircle}
          hint="Began answering question 1"
        />
        <MetricCard
          title="Completed Responses"
          value={stats.completions}
          icon={CheckCircle2}
          hint="Fully submitted forms"
        />
        <MetricCard
          title="Completion Rate"
          value={`${stats.completionRate}%`}
          icon={Percent}
          hint={`Abandonment: ${stats.abandonmentRate}%`}
          highlight={stats.completionRate >= 50 ? "good" : "warning"}
        />
      </div>

      {/* Conversion Funnel */}
      <section className="rounded-xl border border-umber-200 bg-white p-5 shadow-xs dark:border-umber-800 dark:bg-umber-900">
        <h3 className="mb-4 text-sm font-semibold text-umber-900 dark:text-umber-100">
          Conversion Funnel
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <FunnelStep
            label="1. Viewed Form"
            count={stats.views}
            percentage={100}
            color="bg-amber-500"
          />
          <FunnelStep
            label="2. Started Answering"
            count={stats.starts}
            percentage={stats.views > 0 ? Math.round((stats.starts / stats.views) * 100) : 0}
            color="bg-bronze-500"
          />
          <FunnelStep
            label="3. Completed Submission"
            count={stats.completions}
            percentage={stats.views > 0 ? Math.round((stats.completions / stats.views) * 100) : 0}
            color="bg-emerald-500"
          />
        </div>
      </section>

      {/* Daily Submission Activity Chart */}
      <section className="rounded-xl border border-umber-200 bg-white p-5 shadow-xs dark:border-umber-800 dark:bg-umber-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-umber-900 dark:text-umber-100">
              Daily Activity Trend
            </h3>
            <p className="text-xs text-umber-400">Completions over selected timeframe</p>
          </div>
          <span className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-umber-600 dark:text-umber-300">
              <span className="size-2.5 rounded-full bg-bronze-600 inline-block" /> Submissions
            </span>
            <span className="flex items-center gap-1 text-umber-400">
              <span className="size-2.5 rounded-full bg-amber-300 inline-block" /> Views
            </span>
          </span>
        </div>

        {/* Visual Bar Chart */}
        <div className="h-44 flex items-end gap-1.5 pt-6 pb-2 border-b border-umber-100 dark:border-umber-800">
          {stats.dailyStats.map((day) => {
            const maxVal = Math.max(
              1,
              ...stats.dailyStats.map((d) => Math.max(d.views, d.completions)),
            );
            const viewHeight = Math.max(4, Math.round((day.views / maxVal) * 120));
            const compHeight = Math.max(4, Math.round((day.completions / maxVal) * 120));

            return (
              <div
                key={day.date}
                className="group relative flex-1 flex flex-col items-center justify-end h-full"
              >
                {/* Tooltip on hover */}
                <div className="pointer-events-none absolute -top-10 z-10 hidden rounded bg-umber-950 px-2 py-1 text-[10px] text-white shadow group-hover:block whitespace-nowrap">
                  {day.date}: {day.completions} responses, {day.views} views
                </div>
                <div className="w-full flex items-end justify-center gap-0.5">
                  <div
                    style={{ height: `${viewHeight}px` }}
                    className="w-1/2 max-w-[12px] rounded-t bg-amber-200 dark:bg-amber-900/60"
                  />
                  <div
                    style={{ height: `${compHeight}px` }}
                    className="w-1/2 max-w-[12px] rounded-t bg-bronze-600 transition group-hover:bg-bronze-500"
                  />
                </div>
                <span className="mt-1 text-[9px] text-umber-400 truncate max-w-full">
                  {day.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Question-Level Response Breakdown */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-umber-900 dark:text-umber-100">
            Question-Level Response Breakdown
          </h3>
          <p className="text-xs text-umber-500">
            Detailed distribution and interaction rates for each question.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {form.questions.map((q, index) => {
            const stat = stats.questionStats[q.id];
            return (
              <div
                key={q.id}
                className="rounded-xl border border-umber-200 bg-white p-4 shadow-xs dark:border-umber-800 dark:bg-umber-900"
              >
                <div className="flex items-start justify-between gap-2 border-b border-umber-100 pb-2.5 dark:border-umber-800">
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold text-umber-400">Q{index + 1} · {q.type}</span>
                    <h4 className="truncate text-xs font-semibold text-umber-900 dark:text-umber-100">
                      {q.label}
                    </h4>
                  </div>
                  <span className="rounded-full bg-umber-100 px-2 py-0.5 text-[10px] font-medium text-umber-600 dark:bg-umber-800 dark:text-umber-300">
                    {stat ? `${stat.responseRate}% answered` : "0%"}
                  </span>
                </div>

                <div className="pt-3">
                  {/* Rating Breakdown */}
                  {q.type === "rating" && stat?.ratingCounts && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold font-display text-bronze-600 dark:text-bronze-400">
                          {stat.averageRating ?? 0}
                        </span>
                        <div className="flex items-center text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "size-4",
                                i < Math.round(stat.averageRating ?? 0)
                                  ? "fill-current"
                                  : "text-umber-300 dark:text-umber-700",
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-umber-400">({stat.totalAnswers} ratings)</span>
                      </div>

                      <div className="space-y-1 pt-1">
                        {[5, 4, 3, 2, 1].map((stars) => {
                          const count = stat.ratingCounts?.[stars] ?? 0;
                          const pct =
                            stat.totalAnswers > 0 ? Math.round((count / stat.totalAnswers) * 100) : 0;
                          return (
                            <div key={stars} className="flex items-center gap-2 text-xs">
                              <span className="w-6 text-umber-400">{stars}★</span>
                              <div className="h-2 flex-1 rounded-full bg-umber-100 overflow-hidden dark:bg-umber-800">
                                <div
                                  className="h-full bg-amber-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="w-8 text-right text-umber-400">{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Multiple Choice, Dropdown, Yes/No Breakdown */}
                  {(q.type === "multiple_choice" || q.type === "dropdown" || q.type === "yes_no") &&
                    stat?.breakdown && (
                      <div className="space-y-2">
                        {Object.entries(stat.breakdown).map(([choice, count]) => {
                          const pct =
                            stat.totalAnswers > 0 ? Math.round((count / stat.totalAnswers) * 100) : 0;
                          return (
                            <div key={choice} className="space-y-1 text-xs">
                              <div className="flex justify-between text-umber-700 dark:text-umber-300">
                                <span className="truncate">{choice}</span>
                                <span className="font-semibold">{count} ({pct}%)</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-umber-100 overflow-hidden dark:bg-umber-800">
                                <div
                                  className="h-full bg-bronze-600 dark:bg-bronze-400"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                  {/* Text, Email, Date, File - Sample entries */}
                  {(q.type === "text" || q.type === "email" || q.type === "date" || q.type === "file") && (
                    <div>
                      <p className="mb-2 text-[11px] font-medium text-umber-500">
                        {stat?.totalAnswers ?? 0} total responses collected
                      </p>
                      {stat?.recentAnswers && stat.recentAnswers.length > 0 ? (
                        <ul className="space-y-1.5 text-xs text-umber-700 dark:text-umber-300">
                          {stat.recentAnswers.slice(0, 3).map((ans, i) => (
                            <li
                              key={i}
                              className="truncate rounded bg-umber-50 px-2 py-1 dark:bg-umber-950"
                            >
                              “{ans}”
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-umber-400 italic">No text answers yet</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  hint,
  highlight,
}: {
  title: string;
  value: string | number;
  icon: typeof Eye;
  hint: string;
  highlight?: "good" | "warning";
}) {
  return (
    <div className="rounded-xl border border-umber-200 bg-white p-4 shadow-xs dark:border-umber-800 dark:bg-umber-900">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-umber-500">{title}</span>
        <Icon className="size-4 text-umber-400" />
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-bold font-display text-umber-900 dark:text-umber-100",
          highlight === "good" && "text-emerald-600 dark:text-emerald-400",
          highlight === "warning" && "text-amber-600 dark:text-amber-400",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-umber-400">{hint}</p>
    </div>
  );
}

function FunnelStep({
  label,
  count,
  percentage,
  color,
}: {
  label: string;
  count: number;
  percentage: number;
  color: string;
}) {
  return (
    <div className="space-y-2 rounded-lg bg-umber-50 p-3 dark:bg-umber-950/60">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-umber-800 dark:text-umber-200">{label}</span>
        <span className="font-bold">{count}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-umber-200 overflow-hidden dark:bg-umber-800">
        <div className={cn("h-full", color)} style={{ width: `${percentage}%` }} />
      </div>
      <p className="text-[10px] text-umber-500">{percentage}% relative conversion</p>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-umber-200/60 dark:bg-umber-800" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-xl bg-umber-200/60 dark:bg-umber-800" />
    </div>
  );
}
