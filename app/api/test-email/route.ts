import { Resend } from "resend";
import { NextResponse } from "next/server";

export async function GET() {
  console.log("Testing Resend connection...");
  console.log("API Key exists:", !!process.env.RESEND_API_KEY);
  console.log("API Key starts with 're_':", process.env.RESEND_API_KEY?.startsWith("re_"));
  
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || "HomeFront <notifications@thenaturalbeautymedspa.com>",
      to: "joekelly4496@gmail.com",
      subject: "Test Email from HomeFront",
      html: "<h1>Hello!</h1><p>This is a test email from HomeFront.</p>",
    });

    console.log("Email sent! Result:", result);
    
    return NextResponse.json({
      success: true,
      message: "Email sent successfully!",
      data: result,
    });
  } catch (error: any) {
    console.error("Email failed:", error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error,
    }, { status: 500 });
  }
}
