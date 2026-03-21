export function getNewRequestEmail({
  subName,
  companyName,
  tradeCategory,
  homeAddress,
  description,
  priority,
  magicLink,
}: {
  subName: string;
  companyName: string;
  tradeCategory: string;
  homeAddress: string;
  description: string;
  priority: string;
  magicLink: string;
}) {
  const priorityEmoji = priority === "urgent" ? "🔴" : priority === "normal" ? "🟡" : "🟢";
  
  return {
    subject: `${priorityEmoji} New ${tradeCategory} Service Request - ${homeAddress}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🔔 New Service Request</h1>
  </div>
  
  <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 20px;">
      Hi ${subName},
    </p>
    
    <p style="font-size: 16px; color: #475569; margin-bottom: 25px;">
      You have a new service request from <strong>${companyName}</strong>:
    </p>
    
    <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600;">📍 LOCATION</td>
          <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${homeAddress}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600;">🔧 SERVICE</td>
          <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500; text-transform: capitalize;">${tradeCategory}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600;">⚡ PRIORITY</td>
          <td style="padding: 8px 0;">
            <span style="display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; ${
              priority === "urgent"
                ? "background: #fee2e2; color: #991b1b;"
                : priority === "normal"
                ? "background: #fef3c7; color: #92400e;"
                : "background: #dcfce7; color: #166534;"
            }">
              ${priority.toUpperCase()}
            </span>
          </td>
        </tr>
      </table>
    </div>
    
    <div style="background: #fffbeb; border: 1px solid #fcd34d; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
      <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">📝 Homeowner Description:</p>
      <p style="margin: 10px 0 0 0; color: #78350f; font-size: 14px;">${description}</p>
    </div>
    
    ${
      priority === "urgent"
        ? `
    <div style="background: #fee2e2; border: 2px solid #dc2626; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
      <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 700;">⚠️ URGENT: Please acknowledge within 2 hours</p>
    </div>
    `
        : ""
    }
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${magicLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        View Request & Respond
      </a>
    </div>
    
    <p style="font-size: 13px; color: #64748b; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
      This link is unique to you and will expire in 7 days.<br>
      Need help? Contact your builder directly.
    </p>
  </div>
  
</body>
</html>
    `,
    text: `
Hi ${subName},

You have a new service request from ${companyName}:

LOCATION: ${homeAddress}
SERVICE: ${tradeCategory}
PRIORITY: ${priority.toUpperCase()}

DESCRIPTION:
${description}

${priority === "urgent" ? "⚠️ URGENT: Please acknowledge within 2 hours\n\n" : ""}

View and respond to this request:
${magicLink}

This link is unique to you and will expire in 7 days.
    `,
  };
}

export function getBuilderNewRequestEmail({
  builderName,
  homeownerName,
  tradeCategory,
  homeAddress,
  description,
  priority,
  subcontractorName,
}: {
  builderName: string;
  homeownerName: string;
  tradeCategory: string;
  homeAddress: string;
  description: string;
  priority: string;
  subcontractorName: string;
}) {
  const priorityEmoji = priority === "urgent" ? "🔴" : priority === "normal" ? "🟡" : "🟢";

  return {
    subject: `${priorityEmoji} New ${tradeCategory} Request - ${homeAddress}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">📋 New Service Request</h1>
  </div>

  <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 20px;">
      Hi ${builderName},
    </p>

    <p style="font-size: 16px; color: #475569; margin-bottom: 25px;">
      A new service request has been submitted by <strong>${homeownerName}</strong>:
    </p>

    <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600;">📍 LOCATION</td>
          <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${homeAddress}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600;">🔧 SERVICE</td>
          <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500; text-transform: capitalize;">${tradeCategory}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600;">⚡ PRIORITY</td>
          <td style="padding: 8px 0;">
            <span style="display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; ${
              priority === "urgent"
                ? "background: #fee2e2; color: #991b1b;"
                : priority === "normal"
                ? "background: #fef3c7; color: #92400e;"
                : "background: #dcfce7; color: #166534;"
            }">
              ${priority.toUpperCase()}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600;">👷 ASSIGNED TO</td>
          <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${subcontractorName}</td>
        </tr>
      </table>
    </div>

    <div style="background: #fffbeb; border: 1px solid #fcd34d; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
      <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">📝 Homeowner Description:</p>
      <p style="margin: 10px 0 0 0; color: #78350f; font-size: 14px;">${description}</p>
    </div>

    <p style="font-size: 14px; color: #475569; margin-bottom: 10px;">
      The assigned subcontractor has been notified and the SLA clock is running.
    </p>

    <p style="font-size: 13px; color: #64748b; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
      Log in to your builder dashboard to track this request.
    </p>
  </div>

</body>
</html>
    `,
    text: `
Hi ${builderName},

A new service request has been submitted by ${homeownerName}:

LOCATION: ${homeAddress}
SERVICE: ${tradeCategory}
PRIORITY: ${priority.toUpperCase()}
ASSIGNED TO: ${subcontractorName}

DESCRIPTION:
${description}

The assigned subcontractor has been notified and the SLA clock is running.
Log in to your builder dashboard to track this request.
    `,
  };
}

export function getSLAReminderEmail({
  subName,
  tradeCategory,
  homeAddress,
  hoursRemaining,
  magicLink,
}: {
  subName: string;
  tradeCategory: string;
  homeAddress: string;
  hoursRemaining: number;
  magicLink: string;
}) {
  return {
    subject: `⚠️ Reminder: Service Request Needs Response - ${homeAddress}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ SLA Reminder</h1>
  </div>
  
  <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 20px;">
      Hi ${subName},
    </p>
    
    <p style="font-size: 16px; color: #475569; margin-bottom: 25px;">
      You have an unacknowledged service request that needs attention:
    </p>
    
    <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px; font-weight: 600;">📍 ${homeAddress}</p>
      <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px; font-weight: 600;">🔧 ${tradeCategory}</p>
      <p style="margin: 0; color: #7f1d1d; font-size: 18px; font-weight: 700;">⏰ ${hoursRemaining} hours remaining</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${magicLink}" style="display: inline-block; background: #dc2626; color: white; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        Acknowledge Now
      </a>
    </div>
    
    <p style="font-size: 13px; color: #64748b; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
      Please respond as soon as possible to meet your SLA commitment.
    </p>
  </div>
  
</body>
</html>
    `,
    text: `
Hi ${subName},

⚠️ REMINDER: You have an unacknowledged service request that needs attention.

LOCATION: ${homeAddress}
SERVICE: ${tradeCategory}
TIME REMAINING: ${hoursRemaining} hours

Please acknowledge this request as soon as possible:
${magicLink}
    `,
  };
}

export function getScheduleConfirmationEmail({
  homeownerName,
  subCompanyName,
  subContactName,
  subPhone,
  tradeCategory,
  homeAddress,
  scheduledFor,
  notes,
}: {
  homeownerName: string;
  subCompanyName: string;
  subContactName: string;
  subPhone: string;
  tradeCategory: string;
  homeAddress: string;
  scheduledFor: Date;
  notes?: string;
}) {
  const formattedDate = scheduledFor.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = scheduledFor.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return {
    subject: `✅ Appointment Scheduled - ${tradeCategory} Service on ${formattedDate}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">✅ Appointment Confirmed</h1>
  </div>
  
  <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 20px;">
      Hi ${homeownerName},
    </p>
    
    <p style="font-size: 16px; color: #475569; margin-bottom: 25px;">
      Great news! Your <strong>${tradeCategory}</strong> service appointment has been scheduled.
    </p>
    
    <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #064e3b; font-size: 14px; font-weight: 600;">📅 DATE & TIME</td>
          <td style="padding: 8px 0; color: #065f46; font-size: 16px; font-weight: 700;">${formattedDate} at ${formattedTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #064e3b; font-size: 14px; font-weight: 600;">📍 LOCATION</td>
          <td style="padding: 8px 0; color: #065f46; font-size: 14px; font-weight: 500;">${homeAddress}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #064e3b; font-size: 14px; font-weight: 600;">👷 CONTRACTOR</td>
          <td style="padding: 8px 0; color: #065f46; font-size: 14px; font-weight: 500;">${subCompanyName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #064e3b; font-size: 14px; font-weight: 600;">📞 CONTACT</td>
          <td style="padding: 8px 0; color: #065f46; font-size: 14px; font-weight: 500;">${subContactName} - ${subPhone}</td>
        </tr>
      </table>
    </div>
    
    ${notes ? `
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
      <p style="margin: 0; color: #1e40af; font-size: 14px; font-weight: 600;">📝 Special Instructions:</p>
      <p style="margin: 10px 0 0 0; color: #1e3a8a; font-size: 14px;">${notes}</p>
    </div>
    ` : ""}
    
    <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
      <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">⏰ Reminder:</p>
      <p style="margin: 10px 0 0 0; color: #78350f; font-size: 14px;">Please ensure someone is home at the scheduled time. If you need to reschedule, contact your builder immediately.</p>
    </div>
    
    <p style="font-size: 13px; color: #64748b; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
      Download the attached calendar file or use the "Add to Calendar" buttons in your portal to add this appointment.<br>
      Questions? Contact your builder for assistance.
    </p>
  </div>
  
</body>
</html>
    `,
    text: `
✅ APPOINTMENT CONFIRMED

Hi ${homeownerName},

Your ${tradeCategory} service appointment has been scheduled!

📅 DATE & TIME: ${formattedDate} at ${formattedTime}
📍 LOCATION: ${homeAddress}
👷 CONTRACTOR: ${subCompanyName}
📞 CONTACT: ${subContactName} - ${subPhone}

${notes ? `📝 SPECIAL INSTRUCTIONS:\n${notes}\n\n` : ""}

⏰ REMINDER:
Please ensure someone is home at the scheduled time. If you need to reschedule, contact your builder immediately.

Download the attached calendar file to add this appointment to your calendar.
    `,
  };
}

export function getNewMessageEmail({
  recipientName,
  senderName,
  senderType,
  message,
  tradeCategory,
  homeAddress,
  magicLink,
}: {
  recipientName: string;
  senderName: string;
  senderType: string;
  message: string;
  tradeCategory: string;
  homeAddress: string;
  magicLink?: string;
}) {
  const senderLabel = senderType === "builder" ? "Builder" : senderType === "subcontractor" ? "Contractor" : "Homeowner";

  return {
    subject: `💬 New Message: ${tradeCategory} Service - ${homeAddress}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">💬 New Message</h1>
  </div>
  
  <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 20px;">
      Hi ${recipientName},
    </p>
    
    <p style="font-size: 16px; color: #475569; margin-bottom: 25px;">
      You have a new message from <strong>${senderName}</strong> (${senderLabel}) regarding your ${tradeCategory} service request:
    </p>
    
    <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <p style="margin: 0; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Message:</p>
      <p style="margin: 0; color: #1e293b; font-size: 16px; font-weight: 500; line-height: 1.6;">${message}</p>
    </div>
    
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
      <p style="margin: 0; color: #1e40af; font-size: 14px; font-weight: 600;">📍 Service Request:</p>
      <p style="margin: 5px 0 0 0; color: #1e3a8a; font-size: 14px;">${tradeCategory} - ${homeAddress}</p>
    </div>
    
    ${magicLink ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${magicLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        View & Reply
      </a>
    </div>
    ` : ""}
    
    <p style="font-size: 13px; color: #64748b; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
      Reply to keep the conversation going!
    </p>
  </div>
  
</body>
</html>
    `,
    text: `
Hi ${recipientName},

You have a new message from ${senderName} (${senderLabel}) regarding your ${tradeCategory} service request:

MESSAGE:
${message}

SERVICE REQUEST: ${tradeCategory} - ${homeAddress}

${magicLink ? `View and reply: ${magicLink}` : ""}
    `,
  };
}

export function getHomeownerConfirmationEmail({
  homeownerName,
  tradeCategory,
  priority,
  description,
  magicLink,
}: {
  homeownerName: string;
  tradeCategory: string;
  priority: string;
  description: string;
  magicLink: string;
}) {
  const priorityEmoji = priority === "urgent" ? "🔴" : priority === "normal" ? "🟡" : "🟢";

  return {
    subject: `✅ Service Request Submitted - ${tradeCategory} Service`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">✅ Request Received</h1>
  </div>
  
  <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 20px;">
      Hi ${homeownerName},
    </p>
    
    <p style="font-size: 16px; color: #475569; margin-bottom: 25px;">
      We've received your <strong>${tradeCategory}</strong> service request and have notified the contractor. They will reach out to you shortly!
    </p>
    
    <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <p style="margin: 0; color: #064e3b; font-size: 14px; font-weight: 600;">📝 Your Request:</p>
      <p style="margin: 10px 0 0 0; color: #065f46; font-size: 14px;">${description}</p>
    </div>
    
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
      <p style="margin: 0; color: #1e40af; font-size: 14px; font-weight: 600;">⚡ Priority: ${priorityEmoji} ${priority.toUpperCase()}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${magicLink}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        Track Your Request
      </a>
    </div>
    
    <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
      <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">⏰ What's Next:</p>
      <p style="margin: 10px 0 0 0; color: #78350f; font-size: 14px;">The contractor will acknowledge your request ${priority === "urgent" ? "within 2 hours" : "within 48 hours"} and schedule an appointment with you.</p>
    </div>
    
    <p style="font-size: 13px; color: #64748b; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
      Use the link above to track progress and communicate with your contractor.<br>
      This link will remain active for 30 days.
    </p>
  </div>
  
</body>
</html>
    `,
    text: `
Hi ${homeownerName},

We've received your ${tradeCategory} service request and have notified the contractor!

YOUR REQUEST:
${description}

PRIORITY: ${priority.toUpperCase()}

WHAT'S NEXT:
The contractor will acknowledge your request ${priority === "urgent" ? "within 2 hours" : "within 48 hours"} and schedule an appointment with you.

Track your request:
${magicLink}

This link will remain active for 30 days.
    `,
  };
}