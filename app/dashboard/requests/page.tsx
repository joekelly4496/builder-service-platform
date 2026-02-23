import { db } from "@/lib/db";
import { serviceRequests, homes, subcontractors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

export default async function RequestsPage() {
  const TEST_BUILDER_ID = "75c73c79-029b-44a0-a9e3-4d6366ac141d";

  const allRequests = await db
    .select({
      request: serviceRequests,
      home: homes,
      subcontractor: subcontractors,
    })
    .from(serviceRequests)
    .innerJoin(homes, eq(serviceRequests.homeId, homes.id))
    .innerJoin(subcontractors, eq(serviceRequests.assignedSubcontractorId, subcontractors.id))
    .where(eq(homes.builderId, TEST_BUILDER_ID))
    .orderBy(serviceRequests.createdAt);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Service Requests</h1>
              <p className="text-base font-medium text-slate-600 mt-1">All service requests across your homes</p>
            </div>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 border border-slate-300 rounded-xl hover:bg-slate-50 transition-all duration-200 font-semibold text-sm text-slate-700"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          {allRequests.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-xl font-bold text-slate-900 mb-2">No service requests yet</p>
              <p className="text-base font-medium text-slate-600">
                Submit a test request from the{" "}
                <Link href="/demo-request" className="text-blue-600 hover:underline">
                  homeowner form
                </Link>
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">
                      Request ID
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">
                      Home Address
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">
                      SLA Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60">
                  {allRequests.map(({ request, home, subcontractor }) => (
                    <tr key={request.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <Link 
                          href={`/dashboard/requests/${request.id}`}
                          className="text-sm font-mono text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          {request.id.slice(0, 8)}...
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-base">
                        <Link 
                          href={`/dashboard/requests/${request.id}`}
                          className="block hover:text-blue-600 transition-colors"
                        >
                          <div className="font-semibold text-slate-900">{home.address}</div>
                          <div className="text-slate-500 text-sm font-medium">{home.homeownerName}</div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link 
                          href={`/dashboard/requests/${request.id}`}
                          className="text-base font-medium text-slate-700 capitalize hover:text-blue-600 transition-colors"
                        >
                          {request.tradeCategory}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link 
                          href={`/dashboard/requests/${request.id}`}
                          className="block text-sm hover:text-blue-600 transition-colors"
                        >
                          <div className="font-semibold text-slate-900">{subcontractor.companyName}</div>
                          <div className="text-slate-500 text-xs font-medium">{subcontractor.contactName}</div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Link href={`/dashboard/requests/${request.id}`}>
                          <PriorityBadge priority={request.priority} />
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Link href={`/dashboard/requests/${request.id}`}>
                          <StatusBadge status={request.status} />
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link 
                          href={`/dashboard/requests/${request.id}`}
                          className="text-sm text-slate-600 font-medium hover:text-blue-600 transition-colors"
                        >
                          {new Date(request.createdAt).toLocaleDateString()}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Link href={`/dashboard/requests/${request.id}`}>
                          <SLAIndicator
                            deadline={new Date(request.slaAcknowledgeDeadline)}
                            status={request.status}
                          />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
    <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${styles[priority as keyof typeof styles]} ring-1 inline-block`}>
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
    <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${styles[status as keyof typeof styles]} ring-1 inline-block`}>
      {status.replace("_", " ")}
    </span>
  );
}

function SLAIndicator({ deadline, status }: { deadline: Date; status: string }) {
  const now = new Date();
  const isPast = deadline < now;
  const isActive = !["completed", "cancelled", "closed", "acknowledged", "scheduled"].includes(status);

  if (!isActive) {
    return <span className="text-slate-400 text-sm font-medium">N/A</span>;
  }

  if (isPast) {
    return (
      <span className="text-red-600 font-bold text-sm">
        ⚠️ OVERDUE
      </span>
    );
  }

  const hoursLeft = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));

  return (
    <span className="text-green-600 text-sm font-semibold">✓ {hoursLeft}h left</span>
  );
}