import { db } from "@/lib/db";
import { homes, homeTradeAssignments, subcontractors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

export default async function HomesPage() {
  const TEST_BUILDER_ID = "75c73c79-029b-44a0-a9e3-4d6366ac141d";

  const allHomes = await db
    .select()
    .from(homes)
    .where(eq(homes.builderId, TEST_BUILDER_ID));

  // Get trade assignments for each home
  const homeAssignments = await Promise.all(
    allHomes.map(async (home) => {
      const assignments = await db
        .select({
          assignment: homeTradeAssignments,
          subcontractor: subcontractors,
        })
        .from(homeTradeAssignments)
        .innerJoin(
          subcontractors,
          eq(homeTradeAssignments.subcontractorId, subcontractors.id)
        )
        .where(eq(homeTradeAssignments.homeId, home.id));

      return {
        home,
        assignments,
      };
    })
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Homes</h1>
              <p className="text-gray-600 mt-1">Manage homes and trade assignments</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/dashboard/homes/add"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                + Add Home
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
        <div className="space-y-6">
          {homeAssignments.map(({ home, assignments }) => (
            <div key={home.id} className="bg-white rounded-lg shadow">
              {/* Home Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{home.address}</h3>
                    <p className="text-gray-600 mt-1">
                      {home.city}, {home.state} {home.zipCode}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Active
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Homeowner</p>
                    <p className="font-medium text-gray-900">{home.homeownerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{home.homeownerEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium text-gray-900">
                      {home.homeownerPhone || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Trade Assignments */}
              <div className="p-6">
                <h4 className="font-semibold text-gray-900 mb-3">Trade Assignments</h4>
                {assignments.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No subcontractors assigned yet
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {assignments.map(({ assignment, subcontractor }) => (
                      <div
                        key={assignment.id}
                        className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900 capitalize">
                              {assignment.tradeCategory}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {subcontractor.companyName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {subcontractor.contactName}
                            </p>
                          </div>
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                            Assigned
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {allHomes.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-4xl mb-4">🏠</div>
              <p className="text-lg font-medium text-gray-900 mb-2">No homes yet</p>
              <p className="text-sm text-gray-600">
                Homes will appear here after you add them to the system
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
