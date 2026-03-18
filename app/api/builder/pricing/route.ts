import { db } from "@/lib/db";
import { builderPricing } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedBuilder } from "@/lib/utils/builder-auth";

const DEFAULTS = {
  portalAccessMonthlyPrice: 1500, // $15.00
  smsAddonMonthlyPrice: 1000,     // $10.00
  perMessagePrice: 5,              // $0.05
};

export async function GET(request: NextRequest) {
  try {
    const builder = await getAuthenticatedBuilder();
    if (!builder) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const builderId = builder.id;

    const [pricing] = await db
      .select()
      .from(builderPricing)
      .where(eq(builderPricing.builderId, builderId))
      .limit(1);

    return NextResponse.json({
      success: true,
      pricing: pricing ?? { builderId, ...DEFAULTS },
    });
  } catch (error: any) {
    console.error("Get pricing error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const builder = await getAuthenticatedBuilder();
    if (!builder) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const builderId = builder.id;

    const body = await request.json();
    const { portalAccessMonthlyPrice, smsAddonMonthlyPrice, perMessagePrice } = body;

    const now = new Date();

    const [existing] = await db
      .select()
      .from(builderPricing)
      .where(eq(builderPricing.builderId, builderId))
      .limit(1);

    if (existing) {
      await db
        .update(builderPricing)
        .set({
          portalAccessMonthlyPrice: portalAccessMonthlyPrice ?? existing.portalAccessMonthlyPrice,
          smsAddonMonthlyPrice: smsAddonMonthlyPrice ?? existing.smsAddonMonthlyPrice,
          perMessagePrice: perMessagePrice ?? existing.perMessagePrice,
          updatedAt: now,
        })
        .where(eq(builderPricing.builderId, builderId));
    } else {
      await db.insert(builderPricing).values({
        builderId,
        portalAccessMonthlyPrice: portalAccessMonthlyPrice ?? DEFAULTS.portalAccessMonthlyPrice,
        smsAddonMonthlyPrice: smsAddonMonthlyPrice ?? DEFAULTS.smsAddonMonthlyPrice,
        perMessagePrice: perMessagePrice ?? DEFAULTS.perMessagePrice,
        updatedAt: now,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update pricing error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
