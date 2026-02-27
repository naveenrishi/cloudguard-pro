// CloudGuard Pro - Email Service
// SendGrid integration for transactional emails

import sgMail from '@sendgrid/mail';

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@cloudguard.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email using SendGrid
 */
const sendEmail = async (options: EmailOptions): Promise<void> => {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured. Email would be sent to:', options.to);
    console.log('Subject:', options.subject);
    console.log('Email content:', options.text || options.html);
    return;
  }

  try {
    await sgMail.send({
      to: options.to,
      from: FROM_EMAIL,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    });
    console.log(`Email sent successfully to ${options.to}`);
  } catch (error: any) {
    console.error('Email send error:', error.response?.body || error.message);
    throw new Error('Failed to send email');
  }
};

/**
 * Send email verification email
 */
export const sendVerificationEmail = async (
  email: string,
  token: string
): Promise<void> => {
  const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2E75B6; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; }
          .button { display: inline-block; padding: 12px 30px; background: #2E75B6; color: white; 
                   text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CloudGuard Pro</h1>
          </div>
          <div class="content">
            <h2>Welcome to CloudGuard Pro!</h2>
            <p>Thank you for signing up. Please verify your email address to get started.</p>
            <p>
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} CloudGuard Pro. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'Verify your CloudGuard Pro account',
    html,
  });
};

/**
 * Send outage alert email
 */
export const sendOutageAlert = async (userEmail: string, event: any) => {
  const subject = `🚨 ${event.severity.toUpperCase()}: ${event.provider.toUpperCase()} Service Alert`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${event.severity === 'critical' ? '#dc2626' : '#f59e0b'}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .critical { background: #fee2e2; color: #991b1b; }
        .major { background: #fef3c7; color: #92400e; }
        .detail { margin: 10px 0; }
        .label { font-weight: bold; color: #374151; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🚨 Cloud Service Alert</h2>
        </div>
        <div class="content">
          <div class="detail">
            <span class="badge ${event.severity}">${event.severity.toUpperCase()}</span>
          </div>
          <div class="detail">
            <span class="label">Provider:</span> ${event.provider.toUpperCase()}
          </div>
          <div class="detail">
            <span class="label">Service:</span> ${event.service}
          </div>
          <div class="detail">
            <span class="label">Region:</span> ${event.region}
          </div>
          <div class="detail">
            <span class="label">Status:</span> ${event.status.toUpperCase()}
          </div>
          <div class="detail">
            <span class="label">Issue:</span> ${event.title}
          </div>
          ${event.description ? `
          <div class="detail">
            <span class="label">Description:</span><br>
            ${event.description}
          </div>
          ` : ''}
          <div class="detail">
            <span class="label">Started:</span> ${new Date(event.startTime).toLocaleString()}
          </div>
          ${event.url ? `
          <div class="detail" style="margin-top: 20px;">
            <a href="${event.url}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Status Page
            </a>
          </div>
          ` : ''}
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280;">
            This is an automated alert from CloudGuard Pro. Monitor your dashboard for real-time updates.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: userEmail,
    subject: subject,
    html: htmlContent,
  });
};

/**
 * Send nuke notification email
 */
export const sendNukeNotification = async (
  email: string,
  nukeDetails: {
    accountName: string;
    scheduledDate: Date;
    daysUntil: number;
    dashboardUrl: string;
  }
): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 30px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .resources { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🔥 Scheduled AWS Account Nuke - ${nukeDetails.daysUntil} Days Until Execution</h2>
        </div>
        <div class="content">
          <h3>Account: ${nukeDetails.accountName}</h3>
          <p><strong>Scheduled Date:</strong> ${nukeDetails.scheduledDate.toLocaleDateString()}</p>
          
          <div class="warning">
            <strong>⚠️ ACTION REQUIRED</strong><br>
            All AWS resources in this account will be deleted in ${nukeDetails.daysUntil} days unless you add retention policies.
          </div>

          <div class="resources">
            <h4>Resources that will be deleted:</h4>
            <ul>
              <li>✓ EC2 Instances</li>
              <li>✓ S3 Buckets</li>
              <li>✓ RDS Databases</li>
              <li>✓ Lambda Functions</li>
              <li>✓ EBS Volumes</li>
              <li>✓ Elastic IPs</li>
              <li>✓ Load Balancers</li>
              <li>✓ Auto Scaling Groups</li>
            </ul>
          </div>

          <h4>To protect resources:</h4>
          <ol>
            <li>Log in to CloudGuard Pro</li>
            <li>Go to the <strong>Nuke</strong> tab</li>
            <li>Select resources you want to keep</li>
            <li>Set retention period (permanent, until date, or number of days)</li>
            <li>Submit for admin approval</li>
          </ol>

          <p style="text-align: center; margin: 30px 0;">
            <a href="${nukeDetails.dashboardUrl}" class="button">Manage Retention Policies</a>
          </p>

          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="font-size: 12px; color: #6b7280;">
            This is an automated notification from CloudGuard Pro Nuke System.<br>
            If you have questions, contact your system administrator.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `🔥 AWS Nuke Scheduled - ${nukeDetails.accountName} - ${nukeDetails.daysUntil} days remaining`,
    html,
  });
};

export default {
  sendVerificationEmail,
  sendOutageAlert,
  sendNukeNotification,
};
