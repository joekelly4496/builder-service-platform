import { db } from "@/lib/db";
import { homeownerAccounts, homes, serviceRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuthenticatedHomeowner } from "@/lib/utils/homeowner-auth";

export async function GET(request: Request) {
  try {
    const result = await getAuthenticatedHomeowner();
    if (!result) {
      return NextResponse.json(
        { success: false, error: "Your account is not linked to a home. Make sure you signed up with the same email your builder has on file." },
        { status: 401 }
      );
    }

    const { account, home } = result;

    // Get all service requests for this home
    const requests = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.homeId, account.homeId))
      .orderBy(serviceRequests.createdAt);

    return NextResponse.json({
      success: true,
      home: {
        id: home.id,
        address: home.address,
        city: home.city,
        state: home.state,
        zipCode: home.zipCode,
        homeownerName: home.homeownerName,
      },
      requests: requests.map((r) => ({
        id: r.id,
        tradeCategory: r.tradeCategory,
        priority: r.priority,
        status: r.status,
        homeownerDescription: r.homeownerDescription,
        createdAt: r.createdAt,
        scheduledFor: r.scheduledFor,
        completedAt: r.completedAt,
        slaAcknowledgeDeadline: r.slaAcknowledgeDeadline,
      })),
    });
  } catch (error: any) {
    console.error("Homeowner dashboard error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}