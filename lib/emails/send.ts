import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: {
    filename: string;
    content: string;
    contentType?: string;
  }[];
}

export function sendEmail(params: EmailParams) {
  const emailData: any = {
    from: process.env.EMAIL_FROM || "HomeFront <notifications@thenaturalbeautymedspa.com>",
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  };

  if (params.attachments && params.attachments.length > 0) {
    emailData.attachments = params.attachments;
  }

  return resend.emails.send(emailData).then((result) => {
    console.log("Email sent successfully:", result);
    return { success: true, id: result.data?.id };
  }).catch((error: any) => {
    console.error("Email send error:", error);
    return { success: false, error: error.message };
  });
}