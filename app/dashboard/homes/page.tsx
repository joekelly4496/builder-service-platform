import { db } from "@/lib/db";
import { homes, homeTradeAssignments, subcontractors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import LinkHomeownerButton from "./LinkHomeownerButton";

export default async function HomesPage() {
  const TEST_BUILDER_ID = "75c73c79-029b-44a0-a9e3-4d6366ac141d";

  const allHomes = await db
    .select()
    .from(homes)
    .where(eq(homes.builderId, TEST_BUILDER_ID));

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Homes</h1>
              <p className="text-base font-medium text-slate-600 mt-1">Manage homes and trade assignments</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/dashboard/homes/add"
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold text-sm shadow-sm"
              >
                + Add Home
              </Link>
              <Link
                href="/dashboard"
                className="px-5 py-2.5 border border-slate-300 rounded-xl hover:bg-slate-50 transition-all duration-200 font-semibold text-sm text-slate-700"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {homeAssignments.map(({ home, assignments }) => (
            <div key={home.id} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="p-6 border-b border-slate-200/60">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{home.address}</h3>
                    <p className="text-base font-medium text-slate-600 mt-1">
                      {home.city}, {home.state} {home.zipCode}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      href={`/dashboard/homes/${home.id}/assign`}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all duration-200 font-semibold text-sm"
                    >
                      Manage Assignments
                    </Link>
                    <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold">
                      Active
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Homeowner</p>
                    <p className="font-semibold text-slate-900 mt-1">{home.homeownerName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Email</p>
                    <p className="font-semibold text-slate-900 mt-1">{home.homeownerEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Phone</p>
                    <p className="font-semibold text-slate-900 mt-1">
                      {home.homeownerPhone || "Not provided"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <LinkHomeownerButton homeId={home.id} homeownerEmail={home.homeownerEmail} />
                </div>
              </div>

              <div className="p-6">
                <h4 className="font-bold text-slate-900 mb-4 text-base">Trade Assignments</h4>
                {assignments.length === 0 ? (
                  <p className="text-slate-500 text-base font-medium">
                    No subcontractors assigned yet
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {assignments.map(({ assignment, subcontractor }) => (
                      <div
                        key={assignment.id}
                        className="p-4 border border-slate-200 rounded-xl hover:border-blue-300 transition-all duration-200 bg-slate-50/50"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-bold text-slate-900 capitalize mb-1">
                              {assignment.tradeCategory}
                            </p>
                            <p className="text-sm text-slate-600 font-semibold">
                              {subcontractor.companyName}
                            </p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              {subcontractor.contactName}
                            </p>
                          </div>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">
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
            <div className="bg-white rounded-2xl shadow-sm p-16 text-center border border-slate-200/60">
              <div className="text-5xl mb-4">🏠</div>
              <p className="text-xl font-bold text-slate-900 mb-2">No homes yet</p>
              <p className="text-base font-medium text-slate-600">
                Homes will appear here after you add them to the system
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}