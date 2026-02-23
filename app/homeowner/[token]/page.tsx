import { db } from "@/lib/db";
import { homeownerMagicLinks, serviceRequests, homes, subcontractors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import HomeownerPortalClient from "./HomeownerPortalClient";

export const dynamic = "force-dynamic";

export default async function HomeownerPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  try {
    const { token } = await params;

    const magicLinkResults = await db
      .select()
      .from(homeownerMagicLinks)
      .where(eq(homeownerMagicLinks.token, token))
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
              This tracking link has expired. Please submit a new service request if needed.
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
      .innerJoin(subcontractors, eq(serviceRequests.assignedSubcontractorId, subcontractors.id))
      .where(eq(serviceRequests.id, magicLink.serviceRequestId))
      .limit(1);

    if (requestResults.length === 0) {
      notFound();
    }

    const { request, home, subcontractor } = requestResults[0];

    if (magicLink.usedAt === null) {
      await db
        .update(homeownerMagicLinks)
        .set({ usedAt: new Date() })
        .where(eq(homeownerMagicLinks.id, magicLink.id));
    }

    return (
      <HomeownerPortalClient
        request={request}
        home={home}
        subcontractor={subcontractor}
      />
    );
  } catch (error: any) {
    console.error("Homeowner portal error:", error);
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
