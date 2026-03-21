import { db } from "@/lib/db";
import {
  subcontractorMagicLinks,
  serviceRequests,
  homes,
  subcontractors,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import SubActions from "./SubActions";
import SubMessagesSection from "./MessagesSection";

export const dynamic = "force-dynamic";

export default async function SubPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  try {
    const { token } = await params;

    const reservedRoutes = ["login", "dashboard", "requests"];
    if (reservedRoutes.includes(token)) notFound();

    const magicLinkResults = await db
      .select()
      .from(subcontractorMagicLinks)
      .where(eq(subcontractorMagicLinks.token, token))
      .limit(1);

    if (magicLinkResults.length === 0) {
      notFound();
    }

    const magicLink = magicLinkResults[0];
    const now = new Date();

    if (new Date(magicLink.expiresAt) < now) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center px-4">
          <div className="bg-white p-10 rounded-2xl shadow-xl max-w-lg border border-red-200 text-center">
            <div className="text-6xl mb-4">⏰</div>
            <h1 className="text-3xl font-bold text-red-600 mb-4">Link Expired</h1>
            <p className="text-base font-semibold text-slate-700 mb-4">
              This magic link has expired. Please contact your builder for a new link.
            </p>
          </div>
        </div>
      );
    }

    const requestResults = await db
      .select({
        request: serviceRequests,
        home: homes,
        subcontractor: subcontractors,
      })
      .from(serviceRequests)
      .innerJoin(homes, eq(serviceRequests.homeId, homes.id))
      .innerJoin(
        subcontractors,
        eq(serviceRequests.assignedSubcontractorId, subcontractors.id)
      )
      .where(eq(serviceRequests.id, magicLink.serviceRequestId))
      .limit(1);

    if (requestResults.length === 0) {
      notFound();
    }

    const { request, home, subcontractor } = requestResults[0];

    if (magicLink.usedAt === null) {
      await db
        .update(subcontractorMagicLinks)
        .set({ usedAt: new Date() })
        .where(eq(subcontractorMagicLinks.id, magicLink.id));
    }

    const allRequestsResults = await db
      .select({
        request: serviceRequests,
        home: homes,
      })
      .from(serviceRequests)
      .innerJoin(homes, eq(serviceRequests.homeId, homes.id))
      .where(eq(serviceRequests.assignedSubcontractorId, magicLink.subcontractorId));

    const slaDeadline = new Date(request.slaAcknowledgeDeadline);
    const hoursRemaining = Math.round(
      (slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60)
    );
    const isSlaBreached = slaDeadline < now && request.status === "submitted";

    // In your schema these are jsonb columns. Depending on drizzle config
    // they might come back as `string[]`, `unknown`, or `null`.
    const photoUrls = (request as any).photoUrls as string[] | null;
    const completionPhotos = (request as any).completionPhotos as string[] | null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-8 rounded-2xl mb-6">
            <h1 className="text-3xl font-bold">Welcome, {subcontractor.contactName}!</h1>
            <p className="text-lg font-medium mt-2 opacity-90">{subcontractor.companyName}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-4 capitalize">
                  {request.tradeCategory} Service Request
                </h2>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase mb-1">Location</p>
                    <p className="text-lg font-semibold text-slate-900">{home.address}</p>
                    <p className="text-base text-slate-700">
                      {home.city}, {home.state} {home.zipCode}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase mb-1">Homeowner</p>
                    <p className="text-lg font-semibold text-slate-900">{home.homeownerName}</p>
                    <p className="text-base text-slate-700">{home.homeownerEmail}</p>
                    {home.homeownerPhone && (
                      <p className="text-base text-slate-700">{home.homeownerPhone}</p>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase mb-1">Description</p>
                    <p className="text-base text-slate-900 font-medium">
                      {request.homeownerDescription}
                    </p>
                  </div>

                  {photoUrls && photoUrls.length > 0 && (
                    <div>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                        📸 Homeowner Photos
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {photoUrls.map((url, index) => (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative group overflow-hidden rounded-xl border-2 border-slate-200 hover:border-purple-500 transition-all shadow-sm hover:shadow-md"
                          >
                            <img
                              src={url}
                              alt={`Homeowner photo ${index + 1}`}
                              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <div>
                      <p className="text-sm font-bold text-slate-500 uppercase mb-1">Status</p>
                      <StatusBadge status={request.status} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-500 uppercase mb-1">Priority</p>
                      <PriorityBadge priority={request.priority} />
                    </div>
                  </div>

                  {request.scheduledFor && (
                    <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl">
                      <p className="text-sm font-bold text-indigo-900 uppercase mb-2">
                        📅 Scheduled For
                      </p>
                      <p className="text-2xl font-bold text-indigo-700">
                        {new Date(request.scheduledFor).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
                        {(() => {
                          const hour = new Date(request.scheduledFor).getHours();
                          if (hour === 8) return " — Morning (8 AM – 12 PM)";
                          if (hour === 12) return " — Afternoon (12 PM – 4 PM)";
                          return " — All Day (8 AM – 4 PM)";
                        })()}
                      </p>
                    </div>
                  )}

                  {(request as any).subcontractorNotes && (
                    <div>
                      <p className="text-sm font-bold text-slate-500 uppercase mb-1">Your Notes</p>
                      <p className="text-base text-slate-900 font-medium">
                        {(request as any).subcontractorNotes}
                      </p>
                    </div>
                  )}

                  {completionPhotos && completionPhotos.length > 0 && (
                    <div>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                        ✅ Completion Photos
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {completionPhotos.map((url, index) => (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative group overflow-hidden rounded-xl border-2 border-emerald-200 hover:border-emerald-500 transition-all shadow-sm hover:shadow-md"
                          >
                            <img
                              src={url}
                              alt={`Completion photo ${index + 1}`}
                              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {request.status === "submitted" && (
                <div
                  className={`rounded-2xl shadow-sm border p-6 ${
                    isSlaBreached
                      ? "bg-red-50 border-red-200"
                      : hoursRemaining <= 4
                      ? "bg-yellow-50 border-yellow-200"
                      : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {isSlaBreached ? "⚠️ SLA BREACHED" : "⏰ Response Required"}
                  </h3>
                  {isSlaBreached ? (
                    <p className="text-red-700 font-semibold">
                      This request is overdue by {Math.abs(hoursRemaining)} hours. Please respond
                      immediately!
                    </p>
                  ) : (
                    <p className="text-slate-700 font-semibold">
                      Please acknowledge this request within {hoursRemaining} hours
                    </p>
                  )}
                </div>
              )}

              <SubMessagesSection
                requestId={request.id}
                subName={subcontractor.contactName}
                subEmail={subcontractor.email}
              />
            </div>

            <div className="lg:col-span-1">
              <SubActions requestId={request.id} currentStatus={request.status} />

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 mt-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">All Your Requests</h3>
                <p className="text-3xl font-bold text-purple-600 mb-2">
                  {allRequestsResults.length}
                </p>
                <p className="text-sm text-slate-600 font-medium">Total requests assigned to you</p>

                <div className="mt-4 space-y-2">
                  {allRequestsResults.slice(0, 5).map(({ request: req, home: h }) => (
                    <div key={req.id} className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm font-bold text-slate-900 capitalize">
                        {req.tradeCategory}
                      </p>
                      <p className="text-xs text-slate-600">{h.address}</p>
                      <div className="mt-1">
                        <StatusBadge status={req.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error: any) {
    console.error("Sub portal error:", error);
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <pre className="text-sm bg-slate-100 p-4 rounded overflow-auto">{error.message}</pre>
        </div>
      </div>
    );
  }
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    urgent: "bg-red-100 text-red-700 ring-red-200",
    normal: "bg-amber-100 text-amber-700 ring-amber-200",
    low: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  };

  const cls = styles[priority] ?? "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-bold ${cls} ring-1`}>
      {String(priority).toUpperCase()}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    submitted: "bg-blue-100 text-blue-700 ring-blue-200",
    acknowledged: "bg-purple-100 text-purple-700 ring-purple-200",
    scheduled: "bg-indigo-100 text-indigo-700 ring-indigo-200",
    in_progress: "bg-amber-100 text-amber-700 ring-amber-200",
    completed: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    escalated: "bg-red-100 text-red-700 ring-red-200",
    cancelled: "bg-slate-100 text-slate-700 ring-slate-200",
    closed: "bg-slate-100 text-slate-700 ring-slate-200",
  };

  const cls = styles[status] ?? "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-bold ${cls} ring-1`}>
      {String(status).replace("_", " ").toUpperCase()}
    </span>
  );
}