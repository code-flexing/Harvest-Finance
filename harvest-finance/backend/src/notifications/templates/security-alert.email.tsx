/**
 * Security Alert Email Template
 */
export const SecurityAlertEmail = (props: {
  userName: string;
  alertType: string;
  description: string;
  timestamp: string;
  actionUrl?: string;
}) => {
  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #d32f2f; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .alert-box { background-color: #ffebee; padding: 15px; border-left: 4px solid #d32f2f; margin: 20px 0; }
          .button { background-color: #d32f2f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; color: #777; padding: 20px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Security Alert</h1>
          </div>
          <div class="content">
            <p>Hello ${props.userName},</p>
            <p>We detected suspicious activity on your account:</p>

            <div class="alert-box">
              <p><strong>Alert Type:</strong> ${props.alertType}</p>
              <p><strong>Description:</strong> ${props.description}</p>
              <p><strong>Time:</strong> ${props.timestamp}</p>
            </div>

            <p>If you recognize this activity, no action is required. If you did not authorize this, please secure your account immediately.</p>
            ${props.actionUrl ? `<a href="${props.actionUrl}" class="button">Review Account Security</a>` : ''}
            <p>If you have any questions, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Harvest Finance. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

export const SecurityAlertEmailText = (props: {
  userName: string;
  alertType: string;
  description: string;
  timestamp: string;
  actionUrl?: string;
}) => {
  return `
Security Alert

Hello ${props.userName},

We detected suspicious activity on your account:

Alert Type: ${props.alertType}
Description: ${props.description}
Time: ${props.timestamp}

If you recognize this activity, no action is required. If you did not authorize this, please secure your account immediately.

${props.actionUrl ? `Review Account Security: ${props.actionUrl}` : ''}

If you have any questions, please contact our support team.

© 2024 Harvest Finance. All rights reserved.
  `;
};
