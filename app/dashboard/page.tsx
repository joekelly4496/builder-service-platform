import { db } from "@/lib/db";
import { serviceRequests, homes, subcontractors, builders } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import Link from "next/link";

export default async function DashboardPage() {
  // For now, we'll use the test builder ID
  // Later we'll add authentication
  const TEST_BUILDER_ID = "75c73c79-029b-44a0-a9e3-4d6366ac141d";

  // Get stats
  const [builder] = await db
    .select()
    .from(builders)
    .where(eq(builders.id, TEST_BUILDER_ID))
    .limit(1);

  const totalHomes = await db
    .select({ count: count() })
    .from(homes)
    .where(eq(homes.builderId, TEST_BUILDER_ID));

  const totalSubs = await db
    .select({ count: count() })
    .from(subcontractors)
    .where(eq(subcontractors.builderId, TEST_BUILDER_ID));

  const allRequests = await db
    .select()
    .from(serviceRequests)
    .innerJoin(homes, eq(serviceRequests.homeId, homes.id))
    .where(eq(homes.builderId, TEST_BUILDER_ID))
    .orderBy(serviceRequests.createdAt);

  const totalRequests = allRequests.length;
  const activeRequests = allRequests.filter(
    (r) => !["completed", "cancelled", "closed"].includes(r.service_requests.status)
  ).length;

  const now = new Date();
  const overdueRequests = allRequests.filter(
    (r) =>
      r.service_requests.status === "submitted" &&
      new Date(r.service_requests.slaAcknowledgeDeadline) < now
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {builder?.companyName || "Builder"} Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Manage your service requests and team</p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Requests"
            value={totalRequests}
            icon="📋"
            color="blue"
          />
          <StatCard
            title="Active Requests"
            value={activeRequests}
            icon="⚡"
            color="green"
          />
          <StatCard
            title="Overdue (SLA Breach)"
            value={overdueRequests}
            icon="🚨"
            color="red"
          />
          <StatCard
            title="Homes Managed"
            value={totalHomes[0].count}
            icon="🏠"
            color="purple"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/dashboard/requests"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow border-2 border-blue-100 hover:border-blue-300"
          >
            <div className="text-2xl mb-2">📋</div>
            <h3 className="font-semibold text-lg mb-1">Service Requests</h3>
            <p className="text-gray-600 text-sm">View and manage all requests</p>
          </Link>

          <Link
            href="/dashboard/homes"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow border-2 border-green-100 hover:border-green-300"
          >
            <div className="text-2xl mb-2">🏠</div>
            <h3 className="font-semibold text-lg mb-1">Homes</h3>
            <p className="text-gray-600 text-sm">Manage homes and homeowners</p>
          </Link>

          <Link
            href="/dashboard/subcontractors"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow border-2 border-purple-100 hover:border-purple-300"
          >
            <div className="text-2xl mb-2">👷</div>
            <h3 className="font-semibold text-lg mb-1">Subcontractors</h3>
            <p className="text-gray-600 text-sm">Manage your trade partners</p>
          </Link>
        </div>

        {/* Recent Requests Preview */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Recent Service Requests</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Home
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    SLA Deadline
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allRequests.slice(0, 5).map((req) => (
                  <tr key={req.service_requests.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      {req.homes.address}
                    </td>
                    <td className="px-6 py-4 text-sm capitalize">
                      {req.service_requests.tradeCategory}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <PriorityBadge priority={req.service_requests.priority} />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <StatusBadge status={req.service_requests.status} />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <SLAIndicator
                        deadline={new Date(req.service_requests.slaAcknowledgeDeadline)}
                        status={req.service_requests.status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {allRequests.length > 5 && (
            <div className="p-4 border-t border-gray-200 text-center">
              <Link
                href="/dashboard/requests"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                View all {totalRequests} requests →
              </Link>
            </div>
          )}
          {allRequests.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              No service requests yet. Submit a test request to see it here!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Component helpers
function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };

  return (
    <div className={`bg-white p-6 rounded-lg shadow border-2 ${colors[color as keyof typeof colors]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles = {
    urgent: "bg-red-100 text-red-700",
    normal: "bg-yellow-100 text-yellow-700",
    low: "bg-green-100 text-green-700",
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[priority as keyof typeof styles]}`}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    submitted: "bg-blue-100 text-blue-700",
    acknowledged: "bg-purple-100 text-purple-700",
    scheduled: "bg-indigo-100 text-indigo-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    completed: "bg-green-100 text-green-700",
    escalated: "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-700",
    closed: "bg-gray-100 text-gray-700",
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status as keyof typeof styles]}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function SLAIndicator({ deadline, status }: { deadline: Date; status: string }) {
  const now = new Date();
  const isPast = deadline < now;
  const isActive = !["completed", "cancelled", "closed", "acknowledged", "scheduled"].includes(status);

  if (!isActive) {
    return <span className="text-gray-500 text-xs">-</span>;
  }

  if (isPast) {
    return <span className="text-red-600 font-semibold text-xs">⚠️ OVERDUE</span>;
  }

  const hoursLeft = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));

  return (
    <span className="text-gray-700 text-xs">
      {hoursLeft}h remaining
    </span>
  );
}
