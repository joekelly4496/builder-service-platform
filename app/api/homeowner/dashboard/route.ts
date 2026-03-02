import { db } from "@/lib/db";
import { homeownerAccounts, homes, serviceRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    // Find homeowner account linked to this Supabase user
    const [account] = await db
      .select()
      .from(homeownerAccounts)
      .where(eq(homeownerAccounts.supabaseUserId, userId))
      .limit(1);

    if (!account) {
      return NextResponse.json(
        { success: false, error: "No home linked to this account. Please contact your builder." },
        { status: 404 }
      );
    }

    // Get home details
    const [home] = await db
      .select()
      .from(homes)
      .where(eq(homes.id, account.homeId))
      .limit(1);

    if (!home) {
      return NextResponse.json(
        { success: false, error: "Home not found" },
        { status: 404 }
      );
    }

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