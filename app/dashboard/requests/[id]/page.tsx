import { db } from "@/lib/db";
import {
  serviceRequests,
  homes,
  subcontractors,
  serviceRequestAuditLog,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import MessagesSection from "./MessagesSection";

export const dynamic = "force-dynamic";

function cap(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function safeDate(value: any) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDate(value: any) {
  const d = safeDate(value);
  return d ? d.toLocaleString() : "—";
}

export default async function ServiceRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const rows = await db
    .select({
      request: serviceRequests,
      home: homes,
      subcontractor: subcontractors,
    })
    .from(serviceRequests)
    .innerJoin(homes, eq(serviceRequests.homeId, homes.id))
    .leftJoin(
      subcontractors,
      eq(serviceRequests.assignedSubcontractorId, subcontractors.id)
    )
    .where(eq(serviceRequests.id, id))
    .limit(1);

  const request = rows[0];

  if (!request) {
    notFound();
  }

  let auditLog: any[] = [];
  try {
    auditLog = await db
      .select()
      .from(serviceRequestAuditLog)
      .where(eq(serviceRequestAuditLog.serviceRequestId, id))
      .orderBy(serviceRequestAuditLog.timestamp);
  } catch {
    auditLog = [];
  }

  const now = new Date();

  const slaDeadline = safeDate(
    (request.request as any).slaAcknowledgeDeadline ??
      (request.request as any).sla_acknowledge_deadline
  );

  const status = (request.request as any).status ?? "submitted";
  const isSlaBreached =
    !!slaDeadline &&
    slaDeadline < now &&
    !["acknowledged", "scheduled", "completed", "closed"].includes(status);

  const hoursUntilSla =
    slaDeadline != null
      ? Math.round((slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60))
      : null;

  const tradeCategory =
    (request.request as any).tradeCategory ??
    (request.request as any).trade_category ??
    "general";

  const priority = (request.request as any).priority ?? "normal";

  const description =
    (request.request as any).description ??
    (request.request as any).homeownerDescription ??
    (request.request as any).homeowner_description ??
    "—";

  const subcontractorNotes =
    (request.request as any).subcontractorNotes ??
    (request.request as any).subcontractor_notes ??
    null;

  const completionNotes =
    (request.request as any).completionNotes ??
    (request.request as any).completion_notes ??
    null;

  const photoUrls =
    (request.request as any).photoUrls ??
    (request.request as any).photo_urls ??
    null;

  const createdAt =
    (request.request as any).createdAt ?? (request.request as any).created_at;

  const acknowledgedAt =
    (request.request as any).acknowledgedAt ??
    (request.request as any).acknowledged_at;

  const scheduledFor =
    (request.request as any).scheduledFor ??
    (request.request as any).scheduled_for ??
    (request.request as any).scheduledAt ??
    (request.request as any).scheduled_at;

  const completedAt =
    (request.request as any).completedAt ??
    (request.request as any).completed_at;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                Service Request Details
              </h1>
              <p className="text-base font-medium text-slate-600 mt-1">
                Request ID: {id.slice(0, 8)}...
              </p>
            </div>
            <Link
              href="/dashboard/requests"
              className="px-5 py-2.5 border border-slate-300 rounded-xl hover:bg-slate-50 transition-all duration-200 font-semibold text-sm text-slate-900"
            >
              ← Back to Requests
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    {cap(tradeCategory)} Service
                  </h2>
                  <div className="flex gap-3">
                    <PriorityBadge priority={priority} />
                    <StatusBadge status={status} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Description
                  </p>
                  <p className="text-base font-medium text-slate-900">
                    {description}
                  </p>
                </div>

                {subcontractorNotes && (
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Subcontractor Notes
                    </p>
                    <p className="text-base font-medium text-slate-900">
                      {String(subcontractorNotes)}
                    </p>
                  </div>
                )}

                {completionNotes && (
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Completion Notes
                    </p>
                    <p className="text-base font-medium text-slate-900">
                      {String(completionNotes)}
                    </p>
                  </div>
                )}

                {Array.isArray(photoUrls) && photoUrls.length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                      📷 Issue Photos / Videos
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {photoUrls.map((url: string, index: number) => {
                        const isVideo = /\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(url);
                        return (
                          <a
                            key={`${url}-${index}`}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative group overflow-hidden rounded-xl border-2 border-slate-200 hover:border-blue-500 transition-all shadow-sm hover:shadow-md"
                          >
                            {isVideo ? (
                              <video
                                src={url}
                                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
                                muted
                                playsInline
                                preload="metadata"
                              />
                            ) : (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={url}
                                alt={`Issue photo ${index + 1}`}
                                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            )}
                            {isVideo && (
                              <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded-md">
                                ▶ Video
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center">
                              <svg
                                className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                                />
                              </svg>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                Activity Timeline
              </h3>

              {auditLog.length === 0 ? (
                <div className="text-slate-700 font-medium">
                  No activity yet (or audit log not enabled).
                </div>
              ) : (
                <div className="space-y-4">
                  {auditLog.map((log: any, index: number) => {
                    const action = String(log.action ?? "activity").replace(
                      "_",
                      " "
                    );

                    const oldStatus =
                      log.oldStatus ?? log.old_status ?? undefined;
                    const newStatus =
                      log.newStatus ?? log.new_status ?? undefined;

                    const actorEmail =
                      log.actorEmail ?? log.actor_email ?? undefined;
                    const actorType =
                      log.actorType ?? log.actor_type ?? undefined;

                    const ts =
                      log.timestamp ?? log.createdAt ?? log.created_at ?? null;

                    return (
                      <div key={log.id ?? index} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              index === auditLog.length - 1
                                ? "bg-blue-600"
                                : "bg-slate-300"
                            }`}
                          />
                          {index < auditLog.length - 1 && (
                            <div className="w-0.5 h-full bg-slate-200 mt-1" />
                          )}
                        </div>

                        <div className="flex-1 pb-6">
                          <div className="flex items-start justify-between mb-1">
                            <p className="font-bold text-slate-900 capitalize">
                              {action}
                            </p>
                            <p className="text-sm text-slate-600 font-medium">
                              {fmtDate(ts)}
                            </p>
                          </div>

                          {oldStatus && newStatus && (
                            <p className="text-sm text-slate-700 font-medium">
                              Status changed from{" "}
                              <StatusBadge status={String(oldStatus)} /> to{" "}
                              <StatusBadge status={String(newStatus)} />
                            </p>
                          )}

                          <p className="text-sm text-slate-700 font-medium mt-1">
                            By: {actorEmail ?? actorType ?? "system"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <MessagesSection requestId={id} />
          </div>

          <div className="space-y-6">
            <div
              className={`rounded-2xl shadow-sm border p-6 ${
                isSlaBreached
                  ? "bg-red-50 border-red-200"
                  : "bg-white border-slate-200/60"
              }`}
            >
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                SLA Status
              </h3>

              {!slaDeadline ? (
                <div>
                  <p className="text-slate-900 font-bold text-lg mb-2">—</p>
                  <p className="text-sm font-medium text-slate-700">
                    No SLA deadline set
                  </p>
                </div>
              ) : isSlaBreached ? (
                <div>
                  <p className="text-red-700 font-bold text-2xl mb-2">
                    ⚠️ OVERDUE
                  </p>
                  <p className="text-sm font-medium text-red-700">
                    Deadline was {Math.abs(hoursUntilSla ?? 0)}h ago
                  </p>
                </div>
              ) : ["acknowledged", "scheduled", "completed", "closed"].includes(
                  status
                ) ? (
                <div>
                  <p className="text-green-700 font-bold text-lg mb-2">
                    ✓ On Track
                  </p>
                  <p className="text-sm font-medium text-slate-700">
                    Acknowledged within SLA
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-blue-700 font-bold text-2xl mb-2">
                    {hoursUntilSla ?? "—"}h
                  </p>
                  <p className="text-sm font-medium text-slate-700">
                    Time remaining to acknowledge
                  </p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Acknowledge Deadline
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {slaDeadline ? slaDeadline.toLocaleString() : "—"}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Property</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Address
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {request.home.address}
                  </p>
                  <p className="text-sm font-medium text-slate-700">
                    {request.home.city}, {request.home.state}{" "}
                    {request.home.zipCode ?? (request.home as any).zip_code}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Homeowner
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {request.home.homeownerName ??
                      (request.home as any).homeowner_name}
                  </p>
                  <p className="text-sm font-medium text-slate-700">
                    {request.home.homeownerEmail ??
                      (request.home as any).homeowner_email}
                  </p>
                  {(request.home.homeownerPhone ??
                    (request.home as any).homeowner_phone) && (
                    <p className="text-sm font-medium text-slate-700">
                      {request.home.homeownerPhone ??
                        (request.home as any).homeowner_phone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Assigned To
              </h3>

              {!request.subcontractor ? (
                <div className="text-slate-700 font-medium">
                  Not assigned yet
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Company
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {request.subcontractor.companyName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Contact
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {request.subcontractor.contactName}
                    </p>
                    <p className="text-sm font-medium text-slate-700">
                      {request.subcontractor.email}
                    </p>
                    {request.subcontractor.phone && (
                      <p className="text-sm font-medium text-slate-700">
                        {request.subcontractor.phone}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Timestamps
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Created
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {fmtDate(createdAt)}
                  </p>
                </div>

                {acknowledgedAt && (
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Acknowledged
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {fmtDate(acknowledgedAt)}
                    </p>
                  </div>
                )}

                {scheduledFor && (
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Scheduled For
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {fmtDate(scheduledFor)}
                    </p>
                  </div>
                )}

                {completedAt && (
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Completed
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {fmtDate(completedAt)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    urgent: "bg-red-100 text-red-700 ring-red-200",
    normal: "bg-amber-100 text-amber-700 ring-amber-200",
    low: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  };

  const cls = styles[priority] ?? "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${cls} ring-1`}>
      {priority}
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
    <span
      className={`inline-block px-3 py-1.5 rounded-lg text-sm font-bold ${cls} ring-1`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
