import { db } from "@/lib/db";
import { serviceRequestMessages, serviceRequests, homes, subcontractors, subcontractorMagicLinks, homeownerAccounts, builders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/emails/send";
import { getNewMessageEmail } from "@/lib/emails/templates";
import { createNotification } from "@/lib/notifications/create";
import { sendSMSToHomeowner } from "@/lib/sms/send";

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
    // Fetch request details first to get builderId
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
      return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
    }
    const requestData = requestDataResults[0];

    const [newMessage] = await db
      .insert(serviceRequestMessages)
      .values({
        builderId: requestData.request.builderId,
        serviceRequestId: id,
        senderType,
        senderName,
        senderEmail,
        message,
      })
      .returning();
    console.log("✅ Message created in database:", newMessage.id);
    console.log("Request found - Home:", requestData.home.address);
    console.log("Homeowner:", requestData.home.homeownerName, requestData.home.homeownerEmail);
    console.log("Subcontractor:", requestData.subcontractor.companyName, requestData.subcontractor.email);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Helper: create in-app notification for homeowner
    const notifyHomeowner = async (title: string, msg: string) => {
      try {
        const [account] = await db
          .select()
          .from(homeownerAccounts)
          .where(eq(homeownerAccounts.homeId, requestData.home.id))
          .limit(1);
        if (account) {
          await createNotification({
            homeownerId: account.id,
            type: "new_message",
            title,
            message: msg,
            linkUrl: `/homeowner/requests/${id}`,
          });
        }
      } catch (notifErr) {
        console.error("Failed to create in-app notification:", notifErr);
      }
    };

    // Helper: email the builder about a new message
    const notifyBuilder = async () => {
      try {
        const [builder] = await db
          .select()
          .from(builders)
          .where(eq(builders.id, requestData.home.builderId))
          .limit(1);
        if (builder) {
          const builderEmailContent = getNewMessageEmail({
            recipientName: builder.contactName,
            senderName,
            senderType,
            message,
            tradeCategory: requestData.request.tradeCategory,
            homeAddress: requestData.home.address,
          });
          const result = await sendEmail({
            to: builder.email,
            subject: builderEmailContent.subject,
            html: builderEmailContent.html,
            text: builderEmailContent.text,
          });
          console.log("Builder email result:", result);
        }
      } catch (err) {
        console.error("Failed to notify builder:", err);
      }
    };

    if (senderType === "builder") {
      console.log("Builder sent message - notifying homeowner and subcontractor");
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

      await notifyHomeowner(
        `New message from ${senderName}`,
        `${message.substring(0, 100)}${message.length > 100 ? "..." : ""}`
      );

      // SMS to homeowner for builder message
      try {
        await sendSMSToHomeowner({
          builderId: requestData.home.builderId,
          homeId: requestData.home.id,
          message: `New message from ${senderName} about your ${requestData.request.tradeCategory} request: ${message.substring(0, 120)}`,
        });
      } catch (smsErr) {
        console.error("Failed to send message SMS:", smsErr);
      }

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
        console.log("❌ Email failed:", (emailResult as any).error);
      }

      await notifyHomeowner(
        `New message from ${senderName}`,
        `${message.substring(0, 100)}${message.length > 100 ? "..." : ""}`
      );

      // SMS to homeowner for subcontractor message
      try {
        await sendSMSToHomeowner({
          builderId: requestData.home.builderId,
          homeId: requestData.home.id,
          message: `New message from ${senderName} about your ${requestData.request.tradeCategory} request: ${message.substring(0, 120)}`,
        });
      } catch (smsErr) {
        console.error("Failed to send message SMS:", smsErr);
      }

      // Notify builder about sub's message
      await notifyBuilder();

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
        console.log("✅ Subcontractor notification sent!");
      } else {
        console.log("❌ Email failed:", (emailResult as any).error);
      }

      // Notify builder about homeowner's message
      await notifyBuilder();
    }
    console.log("========== NEW MESSAGE API COMPLETED ==========");
    return NextResponse.json({ success: true, message: newMessage });
  } catch (error: any) {
    console.error("❌ ERROR IN MESSAGE API:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
