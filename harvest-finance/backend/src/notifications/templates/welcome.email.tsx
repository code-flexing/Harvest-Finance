/**
 * Welcome Email Template
 * Uses React for type-safe, component-based email rendering
 */
export const WelcomeEmail = (props: { userName: string; verificationLink: string }) => {
  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2d5a2d; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .button { background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; color: #777; padding: 20px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Harvest Finance</h1>
          </div>
          <div class="content">
            <p>Hello ${props.userName},</p>
            <p>Welcome to Harvest Finance! We're excited to have you join our agricultural marketplace.</p>
            <p>Please verify your email address to get started:</p>
            <a href="${props.verificationLink}" class="button">Verify Email</a>
            <p>If you didn't create this account, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Harvest Finance. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

export const WelcomeEmailText = (props: { userName: string; verificationLink: string }) => {
  return `
Welcome to Harvest Finance

Hello ${props.userName},

Welcome to Harvest Finance! We're excited to have you join our agricultural marketplace.

Please verify your email address to get started:
${props.verificationLink}

If you didn't create this account, please ignore this email.

© 2024 Harvest Finance. All rights reserved.
  `;
};
