/**
 * Deposit Confirmed Email Template
 */
export const DepositConfirmedEmail = (props: {
  userName: string;
  vaultName: string;
  amount: number;
  transactionHash: string;
  timestamp: string;
}) => {
  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2d5a2d; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .details { background-color: #f5f5f5; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
          .details-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; }
          .details-row:last-child { border-bottom: none; }
          .label { font-weight: bold; }
          .footer { text-align: center; color: #777; padding: 20px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Deposit Confirmed</h1>
          </div>
          <div class="content">
            <p>Hello ${props.userName},</p>
            <p>Your deposit to the vault has been successfully confirmed!</p>

            <div class="details">
              <div class="details-row">
                <span class="label">Vault:</span>
                <span>${props.vaultName}</span>
              </div>
              <div class="details-row">
                <span class="label">Amount:</span>
                <span>$${props.amount.toFixed(2)}</span>
              </div>
              <div class="details-row">
                <span class="label">Transaction:</span>
                <span>${props.transactionHash.substring(0, 20)}...</span>
              </div>
              <div class="details-row">
                <span class="label">Confirmed At:</span>
                <span>${props.timestamp}</span>
              </div>
            </div>

            <p>Your funds are now working for you. You can track your vault performance from your dashboard.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Harvest Finance. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

export const DepositConfirmedEmailText = (props: {
  userName: string;
  vaultName: string;
  amount: number;
  transactionHash: string;
  timestamp: string;
}) => {
  return `
Deposit Confirmed

Hello ${props.userName},

Your deposit to the vault has been successfully confirmed!

Vault: ${props.vaultName}
Amount: $${props.amount.toFixed(2)}
Transaction: ${props.transactionHash}
Confirmed At: ${props.timestamp}

Your funds are now working for you. You can track your vault performance from your dashboard.

© 2024 Harvest Finance. All rights reserved.
  `;
};
