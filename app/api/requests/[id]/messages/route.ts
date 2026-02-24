import { db } from "@/lib/db";
import { serviceRequestMessages, serviceRequests, homes, subcontractors, subcontractorMagicLinks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/emails/send";
import { getNewMessageEmail } from "@/lib/emails/templates";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const messages = await db
      .select()
      .from(serviceRequestMessages)
      .where(eq(serviceRequestMessages.serviceRequestId, id))
      .orderBy(serviceRequestMessages.createdAt);

    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("========== NEW MESSAGE API STARTED ==========");
  
  try {
    const { id } = await params;
    const body = await request.json();
    const { senderType, senderName, senderEmail, message } = body;

    console.log("Request ID:", id);
    console.log("Sender:", senderName, senderType, senderEmail);
    console.log("Message:", message);

    const [newMessage] = await db
      .insert(serviceRequestMessages)
      .values({
        serviceRequestId: id,
        senderType,
        senderName,
        senderEmail,
        message,
      })
      .returning();

    console.log("✅ Message created in database:", newMessage.id);

    console.log("Fetching request details...");
    const requestDataResults = await db
      .select({
        request: serviceRequests,
        home: homes,
        subcontractor: subcontractors,
      })
      .from(serviceRequests)
      .innerJoin(homes, eq(serviceRequests.homeId, homes.id))
      .innerJoin(subcontractors, eq(serviceRequests.assignedSubcontractorId, subcontractors.id))
      .where(eq(serviceRequests.id, id))
      .limit(1);

    if (requestDataResults.length === 0) {
      console.log("❌ Request not found!");
      return NextResponse.json({ success: true, message: newMessage });
    }

    const requestData = requestDataResults[0];
    console.log("Request found - Home:", requestData.home.address);
    console.log("Homeowner:", requestData.home.homeownerName, requestData.home.homeownerEmail);
    console.log("Subcontractor:", requestData.subcontractor.companyName, requestData.subcontractor.email);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    if (senderType === "builder") {
      console.log("Builder sent message - notifying homeowner and subcontractor");

      console.log("Preparing homeowner email...");
      const homeownerEmailContent = getNewMessageEmail({
        recipientName: requestData.home.homeownerName,
        senderName,
        senderType,
        message,
        tradeCategory: requestData.request.tradeCategory,
        homeAddress: requestData.home.address,
      });

      console.log("Sending to homeowner:", requestData.home.homeownerEmail);
      const homeownerResult = await sendEmail({
        to: requestData.home.homeownerEmail,
        subject: homeownerEmailContent.subject,
        html: homeownerEmailContent.html,
        text: homeownerEmailContent.text,
      });

      console.log("Homeowner email result:", homeownerResult);

      const magicLinkResults = await db
        .select()
        .from(subcontractorMagicLinks)
        .where(eq(subcontractorMagicLinks.serviceRequestId, id))
        .limit(1);

      const subMagicLink = magicLinkResults.length > 0 ? `${baseUrl}/sub/${magicLinkResults[0].token}` : undefined;

      console.log("Preparing subcontractor email...");
      const subEmailContent = getNewMessageEmail({
        recipientName: requestData.subcontractor.contactName,
        senderName,
        senderType,
        message,
        tradeCategory: requestData.request.tradeCategory,
        homeAddress: requestData.home.address,
        magicLink: subMagicLink,
      });

      console.log("Sending to subcontractor:", requestData.subcontractor.email);
      const subResult = await sendEmail({
        to: requestData.subcontractor.email,
        subject: subEmailContent.subject,
        html: subEmailContent.html,
        text: subEmailContent.text,
      });

      console.log("Subcontractor email result:", subResult);

      if (homeownerResult.success && subResult.success) {
        console.log("✅ Both notifications sent successfully!");
      } else {
        console.log("⚠️ Some notifications failed");
      }

    } else if (senderType === "subcontractor") {
      console.log("Subcontractor sent message - notifying homeowner");

      const homeownerEmailContent = getNewMessageEmail({
        recipientName: requestData.home.homeownerName,
        senderName,
        senderType,
        message,
        tradeCategory: requestData.request.tradeCategory,
        homeAddress: requestData.home.address,
      });

      console.log("Sending to homeowner:", requestData.home.homeownerEmail);
      const emailResult = await sendEmail({
        to: requestData.home.homeownerEmail,
        subject: homeownerEmailContent.subject,
        html: homeownerEmailContent.html,
        text: homeownerEmailContent.text,
      });

      console.log("Email result:", emailResult);

      if (emailResult.success) {
        console.log("✅ Homeowner notification sent!");
      } else {
        console.log("❌ Email failed:", emailResult.error);
      }

    } else if (senderType === "homeowner") {
      console.log("Homeowner sent message - notifying subcontractor");

      const magicLinkResults = await db
        .select()
        .from(subcontractorMagicLinks)
        .where(eq(subcontractorMagicLinks.serviceRequestId, id))
        .limit(1);

      const subMagicLink = magicLinkResults.length > 0 ? `${baseUrl}/sub/${magicLinkResults[0].token}` : undefined;

      const subEmailContent = getNewMessageEmail({
        recipientName: requestData.subcontractor.contactName,
        senderName,
        senderType,
        message,
        tradeCategory: requestData.request.tradeCategory,
        homeAddress: requestData.home.address,
        magicLink: subMagicLink,
      });

      console.log("Sending to subcontractor:", requestData.subcontractor.email);
      const emailResult = await sendEmail({
        to: requestData.subcontractor.email,
        subject: subEmailContent.subject,
        html: subEmailContent.html,
        text: subEmailContent.text,
      });

      console.log("Email result:", emailResult);

      if (emailResult.success) {
        console.log("✅ Homeowner notification sent!");
      } else {
        console.log("❌ Email failed:", (emailResult as any).error);
      }

    console.log("========== NEW MESSAGE API COMPLETED ==========");

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error: any) {
    console.error("❌ ERROR IN MESSAGE API:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}