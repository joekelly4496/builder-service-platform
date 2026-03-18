import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { builders, builderAccounts, homes, subcontractors, builderPricing, builderSubcontractorRelationships } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getUser(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.split(" ")[1];
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

// POST /api/builder/onboarding — handle each onboarding step
export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { step } = body;

    switch (step) {
      case "company_info": {
        const { companyName, contactName, phone } = body;

        if (!companyName || !contactName) {
          return NextResponse.json(
            { error: "Company name and contact name are required" },
            { status: 400 }
          );
        }

        // Check if builder account already exists
        const [existing] = await db
          .select()
          .from(builderAccounts)
          .where(eq(builderAccounts.supabaseUserId, user.id))
          .limit(1);

        if (existing) {
          // Update existing builder
          await db
            .update(builders)
            .set({
              companyName,
              contactName,
              phone: phone || null,
              onboardingStatus: "add_homes",
              updatedAt: new Date(),
            })
            .where(eq(builders.id, existing.builderId));

          return NextResponse.json({ success: true, builderId: existing.builderId });
        }

        // Create new builder + account
        const [newBuilder] = await db
          .insert(builders)
          .values({
            companyName,
            contactName,
            email: user.email!,
            phone: phone || null,
            onboardingStatus: "add_homes",
          })
          .returning();

        await db.insert(builderAccounts).values({
          supabaseUserId: user.id,
          builderId: newBuilder.id,
          email: user.email!,
        });

        // Create default pricing
        await db.insert(builderPricing).values({
          builderId: newBuilder.id,
        });

        return NextResponse.json({ success: true, builderId: newBuilder.id });
      }

      case "add_homes": {
        const { builderId, homes: homesList } = body;

        if (!builderId) {
          return NextResponse.json({ error: "Builder ID required" }, { status: 400 });
        }

        // Add homes if provided
        if (homesList && homesList.length > 0) {
          for (const home of homesList) {
            await db.insert(homes).values({
              builderId,
              address: home.address,
              city: home.city,
              state: home.state,
              zipCode: home.zipCode,
              homeownerName: home.homeownerName,
              homeownerEmail: home.homeownerEmail,
              homeownerPhone: home.homeownerPhone || null,
            });
          }
        }

        await db
          .update(builders)
          .set({ onboardingStatus: "add_subcontractors", updatedAt: new Date() })
          .where(eq(builders.id, builderId));

        return NextResponse.json({ success: true });
      }

      case "add_subcontractors": {
        const { builderId, subcontractors: subsList } = body;

        if (!builderId) {
          return NextResponse.json({ error: "Builder ID required" }, { status: 400 });
        }

        // Add subcontractors if provided
        if (subsList && subsList.length > 0) {
          for (const sub of subsList) {
            // Check if sub with this email already exists (global profile)
            let subRecord;
            const [existing] = await db
              .select()
              .from(subcontractors)
              .where(eq(subcontractors.email, sub.email))
              .limit(1);

            if (existing) {
              subRecord = existing;
            } else {
              const [newSub] = await db.insert(subcontractors).values({
                companyName: sub.companyName,
                contactName: sub.contactName,
                email: sub.email,
                phone: sub.phone || null,
                tradeCategories: sub.tradeCategories || ["general"],
              }).returning();
              subRecord = newSub;
            }

            // Create relationship if not already linked
            const [existingRel] = await db
              .select()
              .from(builderSubcontractorRelationships)
              .where(eq(builderSubcontractorRelationships.subcontractorId, subRecord.id))
              .limit(1);

            if (!existingRel) {
              await db.insert(builderSubcontractorRelationships).values({
                builderId,
                subcontractorId: subRecord.id,
              });
            }
          }
        }

        await db
          .update(builders)
          .set({ onboardingStatus: "completed", updatedAt: new Date() })
          .where(eq(builders.id, builderId));

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid step" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Onboarding error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
