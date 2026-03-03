import { db } from "@/lib/db";
import { subcontractors, serviceRequests, homes, homeTradeAssignments } from "@/lib/db/schema";
import { eq, count, and } from "drizzle-orm";
import Link from "next/link";
import LinkSubcontractorButton from "./LinkSubcontractorButton";

export const dynamic = "force-dynamic";

export default async function SubcontractorsPage() {
  const TEST_BUILDER_ID = "75c73c79-029b-44a0-a9e3-4d6366ac141d";

  const allSubs = await db
    .select()
    .from(subcontractors)
    .where(eq(subcontractors.builderId, TEST_BUILDER_ID))
    .orderBy(subcontractors.companyName);

  const subMetrics = await Promise.all(
    allSubs.map(async (sub) => {
      const homesAssigned = await db
        .select({ count: count() })
        .from(homeTradeAssignments)
        .where(eq(homeTradeAssignments.subcontractorId, sub.id));

      const totalRequests = await db
        .select({ count: count() })
        .from(serviceRequests)
        .where(eq(serviceRequests.assignedSubcontractorId, sub.id));

      const acknowledgedRequests = await db
        .select({ count: count() })
        .from(serviceRequests)
        .where(
          and(
            eq(serviceRequests.assignedSubcontractorId, sub.id),
            eq(serviceRequests.status, "acknowledged")
          )
        );

      const completedRequests = await db
        .select({ count: count() })
        .from(serviceRequests)
        .where(
          and(
            eq(serviceRequests.assignedSubcontractorId, sub.id),
            eq(serviceRequests.status, "completed")
          )
        );

      const callbackRate =
        homesAssigned[0].count > 0
          ? ((totalRequests[0].count / homesAssigned[0].count) * 100).toFixed(1)
          : "0.0";

      return {
        sub,
        homesAssigned: homesAssigned[0].count,
        totalRequests: totalRequests[0].count,
        acknowledgedRequests: acknowledgedRequests[0].count,
        completedRequests: completedRequests[0].count,
        callbackRate: parseFloat(callbackRate),
      };
    })
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Subcontractors</h1>
              <p className="text-gray-600 mt-1">
                Manage your trade partners and view performance
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/dashboard/subcontractors/add"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                + Add Subcontractor
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Trade Categories
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Homes Assigned
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total Requests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Callback Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {subMetrics.map((metrics) => (
                <tr key={metrics.sub.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {metrics.sub.companyName}
                      </p>
                      <p className="text-sm text-gray-500">{metrics.sub.contactName}</p>
                      <p className="text-xs text-gray-400">{metrics.sub.email}</p>
                      <div className="mt-2">
                        <LinkSubcontractorButton
                          subcontractorId={metrics.sub.id}
                          subcontractorEmail={metrics.sub.email}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(metrics.sub.tradeCategories as string[]).map((cat) => (
                        <span
                          key={cat}
                          className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs capitalize"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {metrics.homesAssigned}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {metrics.totalRequests}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <CallbackRateBadge rate={metrics.callbackRate} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={metrics.sub.status ?? "active"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {allSubs.length === 0 && (
            <div className="p-12 text-center">
              <div className="text-4xl mb-4">👷</div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                No subcontractors yet
              </p>
              <p className="text-sm text-gray-600">
                Subcontractors will appear here after you add them
              </p>
            </div>
          )}
        </div>

        {subMetrics.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Performance Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600">Best Callback Rate</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {Math.min(...subMetrics.map((m) => m.callbackRate))}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Lower is better</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Average Callback Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {(
                    subMetrics.reduce((sum, m) => sum + m.callbackRate, 0) /
                    subMetrics.length
                  ).toFixed(1)}
                  %
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Requests Handled</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {subMetrics.reduce((sum, m) => sum + m.totalRequests, 0)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CallbackRateBadge({ rate }: { rate: number }) {
  let color = "bg-green-100 text-green-700";
  if (rate > 15) color = "bg-yellow-100 text-yellow-700";
  if (rate > 25) color = "bg-red-100 text-red-700";

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>
      {rate}%
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-700",
    blocked: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium ${
        styles[status as keyof typeof styles]
      }`}
    >
      {status}
    </span>
  );
}