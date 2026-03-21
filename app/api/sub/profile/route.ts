import { db } from "@/lib/db";
import { subcontractorAccounts, subcontractors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getAuthenticatedSub(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const [account] = await db
    .select()
    .from(subcontractorAccounts)
    .where(eq(subcontractorAccounts.supabaseUserId, user.id))
    .limit(1);

  if (!account) return null;

  const [sub] = await db
    .select()
    .from(subcontractors)
    .where(eq(subcontractors.id, account.subcontractorId))
    .limit(1);

  return sub ?? null;
}

export async function GET(request: Request) {
  try {
    const sub = await getAuthenticatedSub(request);
    if (!sub) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    return NextResponse.json({ success: true, profile: sub });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const sub = await getAuthenticatedSub(request);
    if (!sub) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      companyName,
      contactName,
      phone,
      bio,
      serviceArea,
      licenseNumber,
      licenseUrl,
      insuranceUrl,
      insuranceExpiresAt,
      pricingRanges,
      slug,
    } = body;

    // Validate slug format if provided
    if (slug !== undefined) {
      if (slug && !/^[a-z0-9-]+$/.test(slug)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Slug must only contain lowercase letters, numbers, and hyphens",
          },
          { status: 400 }
        );
      }

      // Check slug uniqueness (exclude current sub)
      if (slug) {
        const [existing] = await db
          .select({ id: subcontractors.id })
          .from(subcontractors)
          .where(eq(subcontractors.slug, slug))
          .limit(1);
        if (existing && existing.id !== sub.id) {
          return NextResponse.json(
            { success: false, error: "This profile URL is already taken" },
            { status: 409 }
          );
        }
      }
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (companyName !== undefined) updateData.companyName = companyName;
    if (contactName !== undefined) updateData.contactName = contactName;
    if (phone !== undefined) updateData.phone = phone;
    if (bio !== undefined) updateData.bio = bio;
    if (serviceArea !== undefined) updateData.serviceArea = serviceArea;
    if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber;
    if (licenseUrl !== undefined) updateData.licenseUrl = licenseUrl;
    if (insuranceUrl !== undefined) updateData.insuranceUrl = insuranceUrl;
    if (insuranceExpiresAt !== undefined)
      updateData.insuranceExpiresAt = insuranceExpiresAt
        ? new Date(insuranceExpiresAt)
        : null;
    if (pricingRanges !== undefined) updateData.pricingRanges = pricingRanges;
    if (slug !== undefined) updateData.slug = slug || null;

    const [updated] = await db
      .update(subcontractors)
      .set(updateData)
      .where(eq(subcontractors.id, sub.id))
      .returning();

    return NextResponse.json({ success: true, profile: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
