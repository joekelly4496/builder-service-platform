import { db } from "@/lib/db";
import { serviceRequests, homes, subcontractors, builders, smsLogs, homeownerAccounts } from "@/lib/db/schema";
import { eq, count, and, gte, countDistinct, sql } from "drizzle-orm";
import Link from "next/link";
import CalendarFeedButton from "./CalendarFeedButton";
import { getAuthenticatedBuilder } from "@/lib/utils/builder-auth";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  try {
    // Try authenticated builder first, fall back to demo
    let builder = await getAuthenticatedBuilder();

    if (builder && builder.onboardingStatus !== "completed") {
      redirect("/builder/onboarding");
    }

    if (!builder) {
      // Fallback to demo builder for backwards compatibility
      const { getBuilderId } = await import("@/lib/utils/get-builder-id");
      const builderId = await getBuilderId();
      const builderResults = await db
        .select()
        .from(builders)
        .where(eq(builders.id, builderId));

      builder = builderResults[0] || null;
    }

    const totalHomes = await db
      .select({ count: count() })
      .from(homes)
      .where(eq(homes.builderId, builder.id));

    const totalSubs = await db
      .select({ count: count() })
      .from(subcontractors)
      .where(eq(subcontractors.builderId, builder.id));

    const allRequests = await db
      .select()
      .from(serviceRequests)
      .innerJoin(homes, eq(serviceRequests.homeId, homes.id))
      .where(eq(homes.builderId, builder.id));

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* Premium Header */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  {builder?.companyName || "Builder"} Dashboard
                </h1>
                <p className="text-base font-medium text-slate-600 mt-1">Manage your service requests and team</p>
              </div>
              <Link
                href="/"
                className="px-5 py-2.5 border border-slate-300 rounded-xl hover:bg-slate-50 transition-all duration-200 font-semibold text-sm text-slate-700 hover:border-slate-400"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Premium Stats Cards */}
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

          {/* Calendar Feed Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-2">📅 Calendar Integration</h2>
            <p className="text-base font-medium text-slate-600 mb-4">
              Subscribe to your service requests calendar in Google Calendar or Apple Calendar
            </p>
            <CalendarFeedButton builderId={builder.id} entityType="builder" />
          </div>

          {/* SMS Usage Summary */}
          <SMSUsageSection builderId={builder.id} />

          {/* Premium Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link
              href="/dashboard/requests"
              className="group bg-white p-7 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200/60 hover:border-blue-300 hover:-translate-y-1"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">📋</div>
              <h3 className="font-bold text-xl mb-2 text-slate-900">Service Requests</h3>
              <p className="text-slate-600 text-base font-medium">View and manage all requests</p>
            </Link>

            <Link
              href="/dashboard/homes"
              className="group bg-white p-7 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200/60 hover:border-green-300 hover:-translate-y-1"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">🏠</div>
              <h3 className="font-bold text-xl mb-2 text-slate-900">Homes</h3>
              <p className="text-slate-600 text-base font-medium">Manage homes and homeowners</p>
            </Link>

            <Link
              href="/dashboard/subcontractors"
              className="group bg-white p-7 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200/60 hover:border-purple-300 hover:-translate-y-1"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">👷</div>
              <h3 className="font-bold text-xl mb-2 text-slate-900">Subcontractors</h3>
              <p className="text-slate-600 text-base font-medium">Manage your trade partners</p>
            </Link>

            <Link
              href="/dashboard/billing"
              className="group bg-white p-7 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200/60 hover:border-amber-300 hover:-translate-y-1"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">💰</div>
              <h3 className="font-bold text-xl mb-2 text-slate-900">Billing &amp; Revenue</h3>
              <p className="text-slate-600 text-base font-medium">Manage billing and track revenue</p>
            </Link>
          </div>

          {/* Premium Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="px-7 py-6 border-b border-slate-200/60">
              <h2 className="text-2xl font-bold text-slate-900">Recent Service Requests</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">
                      Home
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">
                      SLA Deadline
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60">
                  {allRequests.slice(0, 5).map((req) => (
                    <tr key={req.service_requests.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                      <td className="px-6 py-4 text-base font-semibold text-slate-900">
                        {req.homes.address}
                      </td>
                      <td className="px-6 py-4 text-base font-medium text-slate-700 capitalize">
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
              <div className="px-6 py-5 border-t border-slate-200/60 text-center bg-slate-50/30">
                <Link
                  href="/dashboard/requests"
                  className="text-blue-600 hover:text-blue-700 font-bold text-base transition-colors duration-200"
                >
                  View all {totalRequests} requests →
                </Link>
              </div>
            )}
            {allRequests.length === 0 && (
              <div className="px-6 py-16 text-center">
                <p className="text-lg font-semibold text-slate-500">No service requests yet. Submit a test request to see it here!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } catch (error: any) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center px-4">
        <div className="bg-white p-10 rounded-2xl shadow-xl max-w-2xl border border-red-200">
          <h1 className="text-3xl font-bold text-red-600 mb-4">Database Connection Error</h1>
          <p className="text-base font-semibold text-slate-700 mb-4">
            Failed to connect to the database. Please check your .env.local file.
          </p>
          <pre className="bg-slate-100 p-5 rounded-xl text-sm overflow-auto font-mono text-slate-800 border border-slate-200">
            {error.message}
          </pre>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-base transition-colors duration-200"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

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
    blue: "from-blue-50 to-blue-100/50 text-blue-700 border-blue-200/60",
    green: "from-emerald-50 to-emerald-100/50 text-emerald-700 border-emerald-200/60",
    red: "from-red-50 to-red-100/50 text-red-700 border-red-200/60",
    purple: "from-purple-50 to-purple-100/50 text-purple-700 border-purple-200/60",
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color as keyof typeof colors]} p-6 rounded-2xl shadow-sm border backdrop-blur-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider mb-2 opacity-90">{title}</p>
          <p className="text-4xl font-bold">{value}</p>
        </div>
        <div className="text-5xl opacity-90">{icon}</div>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles = {
    urgent: "bg-red-100 text-red-700 ring-red-200",
    normal: "bg-amber-100 text-amber-700 ring-amber-200",
    low: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  };

  return (
    <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${styles[priority as keyof typeof styles]} ring-1`}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    submitted: "bg-blue-100 text-blue-700 ring-blue-200",
    acknowledged: "bg-purple-100 text-purple-700 ring-purple-200",
    scheduled: "bg-indigo-100 text-indigo-700 ring-indigo-200",
    in_progress: "bg-amber-100 text-amber-700 ring-amber-200",
    completed: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    escalated: "bg-red-100 text-red-700 ring-red-200",
    cancelled: "bg-slate-100 text-slate-700 ring-slate-200",
    closed: "bg-slate-100 text-slate-700 ring-slate-200",
  };

  return (
    <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${styles[status as keyof typeof styles]} ring-1`}>
      {status.replace("_", " ")}
    </span>
  );
}

function SLAIndicator({ deadline, status }: { deadline: Date; status: string }) {
  const now = new Date();
  const isPast = deadline < now;
  const isActive = !["completed", "cancelled", "closed", "acknowledged", "scheduled"].includes(status);

  if (!isActive) {
    return <span className="text-slate-400 text-sm font-medium">-</span>;
  }

  if (isPast) {
    return <span className="text-red-600 font-bold text-sm">⚠️ OVERDUE</span>;
  }

  const hoursLeft = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));

  return (
    <span className="text-slate-700 text-sm font-semibold">
      {hoursLeft}h remaining
    </span>
  );
}

async function SMSUsageSection({ builderId }: { builderId: string }) {
  try {
    const [builder] = await db
      .select({
        smsEnabled: builders.smsEnabled,
        twilioPhoneNumber: builders.twilioPhoneNumber,
      })
      .from(builders)
      .where(eq(builders.id, builderId))
      .limit(1);

    if (!builder) return null;

    // Get current month stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [messageCount] = await db
      .select({ count: count() })
      .from(smsLogs)
      .where(
        and(
          eq(smsLogs.builderId, builderId),
          gte(smsLogs.createdAt, monthStart),
          eq(smsLogs.status, "sent")
        )
      );

    const homesWithSms = await db
      .select({ count: countDistinct(homeownerAccounts.homeId) })
      .from(homeownerAccounts)
      .innerJoin(homes, eq(homeownerAccounts.homeId, homes.id))
      .where(
        and(
          eq(homes.builderId, builderId),
          eq(homeownerAccounts.smsOptIn, true)
        )
      );

    const activeHomes = homesWithSms[0]?.count ?? 0;
    const messagesSent = messageCount?.count ?? 0;

    // Calculate estimated wholesale cost: $5/home/month + $0.02/message
    let estimatedCostCents = 0;
    if (builder.smsEnabled) {
      estimatedCostCents = (activeHomes * 500) + (messagesSent * 2); // $5/home + $0.02/msg
    }

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">SMS Notifications</h2>
            <p className="text-sm font-medium text-slate-600 mt-0.5">
              {builder.smsEnabled
                ? `Sending from ${builder.twilioPhoneNumber}`
                : "Enable SMS to send text notifications to homeowners"}
            </p>
          </div>
          <Link
            href="/dashboard/sms-settings"
            className="px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 border border-slate-300 hover:bg-slate-50 text-slate-700"
          >
            {builder.smsEnabled ? "Manage SMS" : "Enable SMS"}
          </Link>
        </div>

        {builder.smsEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 rounded-xl border border-blue-200/60">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">Messages This Month</p>
              <p className="text-2xl font-bold text-blue-700">{messagesSent}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-4 rounded-xl border border-green-200/60">
              <p className="text-xs font-bold uppercase tracking-wider text-green-600 mb-1">Homes on SMS</p>
              <p className="text-2xl font-bold text-green-700">{activeHomes}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 rounded-xl border border-amber-200/60">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">Est. Monthly Cost</p>
              <p className="text-2xl font-bold text-amber-700">${(estimatedCostCents / 100).toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error("SMS usage section error:", error);
    return null;
  }
}

