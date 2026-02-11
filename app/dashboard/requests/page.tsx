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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Service Requests</h1>
              <p className="text-gray-600 mt-1">All service requests across your homes</p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow">
          {allRequests.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="text-4xl mb-4">📋</div>
              <p className="text-lg font-medium mb-2">No service requests yet</p>
              <p className="text-sm">
                Submit a test request from the{" "}
                <Link href="/demo-request" className="text-blue-600 hover:underline">
                  homeowner form
                </Link>
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Request ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Home Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Assigned To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      SLA Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {allRequests.map(({ request, home, subcontractor }) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-mono text-gray-600">
                        {request.id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-gray-900">{home.address}</div>
                        <div className="text-gray-500 text-xs">{home.homeownerName}</div>
                      </td>
                      <td className="px-6 py-4 text-sm capitalize">
                        {request.tradeCategory}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-gray-900">{subcontractor.companyName}</div>
                        <div className="text-gray-500 text-xs">{subcontractor.contactName}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <PriorityBadge priority={request.priority} />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <StatusBadge status={request.status} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <SLAIndicator
                          deadline={new Date(request.slaAcknowledgeDeadline)}
                          status={request.status}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Request Details Section */}
        {allRequests.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Latest Request Details</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Description:</label>
                <p className="text-gray-900 mt-1">
                  {allRequests[allRequests.length - 1].request.homeownerDescription}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Homeowner Contact:</label>
                <p className="text-gray-900 mt-1">
                  {allRequests[allRequests.length - 1].request.homeownerContactPreference}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">SLA Acknowledge Deadline:</label>
                <p className="text-gray-900 mt-1">
                  {new Date(
                    allRequests[allRequests.length - 1].request.slaAcknowledgeDeadline
                  ).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
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
    <span
      className={`px-2 py-1 rounded text-xs font-medium ${
        styles[priority as keyof typeof styles]
      }`}
    >
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
    <span
      className={`px-2 py-1 rounded text-xs font-medium ${
        styles[status as keyof typeof styles]
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function SLAIndicator({ deadline, status }: { deadline: Date; status: string }) {
  const now = new Date();
  const isPast = deadline < now;
  const isActive = !["completed", "cancelled", "closed", "acknowledged", "scheduled"].includes(
    status
  );

  if (!isActive) {
    return <span className="text-gray-500 text-xs">N/A</span>;
  }

  if (isPast) {
    return (
      <span className="text-red-600 font-semibold text-xs flex items-center gap-1">
        ⚠️ OVERDUE
      </span>
    );
  }

  const hoursLeft = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));

  return (
    <span className="text-green-600 text-xs font-medium">✓ {hoursLeft}h left</span>
  );
}
