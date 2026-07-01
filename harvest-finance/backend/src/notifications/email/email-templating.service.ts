import { Injectable, BadRequestException } from '@nestjs/common';
import { WelcomeEmail, WelcomeEmailText } from '../templates/welcome.email';
import {
  DepositConfirmedEmail,
  DepositConfirmedEmailText,
} from '../templates/deposit-confirmed.email';
import {
  WithdrawalCompleteEmail,
  WithdrawalCompleteEmailText,
} from '../templates/withdrawal-complete.email';
import {
  SecurityAlertEmail,
  SecurityAlertEmailText,
} from '../templates/security-alert.email';

export type EmailTemplate =
  | 'welcome'
  | 'deposit-confirmed'
  | 'withdrawal-complete'
  | 'security-alert';

export interface EmailRenderResult {
  html: string;
  text: string;
  subject: string;
}

@Injectable()
export class EmailTemplatingService {
  private templates = {
    welcome: { html: WelcomeEmail, text: WelcomeEmailText, subject: 'Welcome to Harvest Finance' },
    'deposit-confirmed': {
      html: DepositConfirmedEmail,
      text: DepositConfirmedEmailText,
      subject: 'Deposit Confirmed',
    },
    'withdrawal-complete': {
      html: WithdrawalCompleteEmail,
      text: WithdrawalCompleteEmailText,
      subject: 'Withdrawal Complete',
    },
    'security-alert': {
      html: SecurityAlertEmail,
      text: SecurityAlertEmailText,
      subject: 'Security Alert',
    },
  };

  /**
   * Render an email template to HTML and text
   */
  renderTemplate(
    templateName: EmailTemplate,
    data: Record<string, any>,
  ): EmailRenderResult {
    const template = this.templates[templateName];

    if (!template) {
      throw new BadRequestException(`Template '${templateName}' not found`);
    }

    const html = template.html(data);
    const text = template.text(data);

    return {
      html,
      text,
      subject: template.subject,
    };
  }

  /**
   * Get available templates
   */
  getAvailableTemplates(): EmailTemplate[] {
    return Object.keys(this.templates) as EmailTemplate[];
  }

  /**
   * Render preview (for admin endpoint)
   */
  renderPreview(templateName: EmailTemplate): { html: string; subject: string } {
    const mockData = this.getMockDataForTemplate(templateName);
    const rendered = this.renderTemplate(templateName, mockData);

    return {
      html: rendered.html,
      subject: rendered.subject,
    };
  }

  private getMockDataForTemplate(templateName: EmailTemplate): Record<string, any> {
    switch (templateName) {
      case 'welcome':
        return {
          userName: 'John Doe',
          verificationLink: 'https://harvestfinance.io/verify?token=abc123',
        };
      case 'deposit-confirmed':
        return {
          userName: 'John Doe',
          vaultName: 'Summer Crop Fund',
          amount: 5000,
          transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
          timestamp: new Date().toISOString(),
        };
      case 'withdrawal-complete':
        return {
          userName: 'John Doe',
          vaultName: 'Summer Crop Fund',
          amount: 2500,
          transactionHash: '0xabcdef1234567890abcdef1234567890abcdef12',
          timestamp: new Date().toISOString(),
        };
      case 'security-alert':
        return {
          userName: 'John Doe',
          alertType: 'New Login',
          description: 'A new login was detected from a different location',
          timestamp: new Date().toISOString(),
          actionUrl: 'https://harvestfinance.io/security',
        };
      default:
        return {};
    }
  }
}
