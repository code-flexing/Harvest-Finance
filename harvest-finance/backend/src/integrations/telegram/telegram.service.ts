import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Telegraf, Context } from 'telegraf';
import { User } from '../../database/entities/user.entity';
import { Deposit } from '../../database/entities/deposit.entity';
import { Withdrawal } from '../../database/entities/withdrawal.entity';
import { PortfolioService } from '../../portfolio/portfolio.service';
import * as crypto from 'crypto';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf;
  private readonly rateLimits = new Map<number, number[]>();

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Deposit) private readonly depositRepository: Repository<Deposit>,
    @InjectRepository(Withdrawal) private readonly withdrawalRepository: Repository<Withdrawal>,
    private readonly portfolioService: PortfolioService,
  ) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (token) {
      this.bot = new Telegraf(token);
    }
  }

  async onModuleInit() {
    if (!this.bot) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not provided. Bot not initialized.');
      return;
    }

    this.bot.use(async (ctx, next) => {
      if (!ctx.from) return next();
      const userId = ctx.from.id;
      const now = Date.now();
      const limits = this.rateLimits.get(userId) || [];
      const windowStart = now - 60000;
      
      const requestsInWindow = limits.filter((t) => t > windowStart);
      
      if (requestsInWindow.length >= 10) {
        return ctx.reply('Rate limit exceeded. Please try again later.');
      }
      
      requestsInWindow.push(now);
      this.rateLimits.set(userId, requestsInWindow);
      
      return next();
    });

    this.bot.start((ctx) => ctx.reply('Welcome! Use /connect {token} to link your account.'));

    this.bot.command('connect', async (ctx) => {
      const token = ctx.message.text.split(' ')[1];
      if (!token) return ctx.reply('Please provide your link token: /connect {token}');
      
      const user = await this.userRepository.findOne({
        where: { telegramLinkToken: token },
        select: ['id', 'telegramChatId', 'telegramLinkToken', 'telegramLinkTokenExpires']
      });

      if (!user || !user.telegramLinkTokenExpires || user.telegramLinkTokenExpires < new Date()) {
        return ctx.reply('Invalid or expired token.');
      }

      user.telegramChatId = ctx.from.id.toString();
      user.telegramLinkToken = null;
      user.telegramLinkTokenExpires = null;
      await this.userRepository.save(user);

      return ctx.reply('Account successfully connected!');
    });

    this.bot.command('disconnect', async (ctx) => {
      const user = await this.getUserByChatId(ctx.from.id.toString());
      if (!user) return ctx.reply('No account linked to this chat.');

      user.telegramChatId = null;
      await this.userRepository.save(user);
      return ctx.reply('Account successfully disconnected!');
    });

    this.bot.command('balance', async (ctx) => {
      const user = await this.getUserByChatId(ctx.from.id.toString());
      if (!user) return ctx.reply('Please /connect your account first.');
      
      try {
        const portfolio = await this.portfolioService.buildPortfolio(user.id, []);
        let message = 'Your Balances:\n';
        portfolio.aggregatedStellarBalances.forEach(b => {
          message += `- ${b.balance} ${b.assetCode}\n`;
        });
        message += `\nTotal Vault Balance: ${portfolio.totalVaultBalance}`;
        return ctx.reply(message);
      } catch (e) {
        this.logger.error(e);
        return ctx.reply('Failed to fetch balance.');
      }
    });

    this.bot.command('vaults', async (ctx) => {
      const user = await this.getUserByChatId(ctx.from.id.toString());
      if (!user) return ctx.reply('Please /connect your account first.');
      
      try {
        const portfolio = await this.portfolioService.buildPortfolio(user.id, []);
        if (portfolio.vaults.length === 0) return ctx.reply('You have no active vaults.');
        
        let message = 'Your Vaults:\n';
        portfolio.vaults.forEach(v => {
          message += `- ${v.vaultName} (${v.vaultType}): ${v.balance}\n`;
        });
        return ctx.reply(message);
      } catch (e) {
        this.logger.error(e);
        return ctx.reply('Failed to fetch vaults.');
      }
    });

    this.bot.command('history', async (ctx) => {
      const user = await this.getUserByChatId(ctx.from.id.toString());
      if (!user) return ctx.reply('Please /connect your account first.');
      
      try {
        const deposits = await this.depositRepository.find({
          where: { userId: user.id },
          order: { createdAt: 'DESC' },
          take: 5
        });
        const withdrawals = await this.withdrawalRepository.find({
          where: { userId: user.id },
          order: { createdAt: 'DESC' },
          take: 5
        });

        const combined = [
          ...deposits.map(d => ({ type: 'Deposit', amount: d.amount, date: d.createdAt, status: d.status })),
          ...withdrawals.map(w => ({ type: 'Withdrawal', amount: w.amount, date: w.createdAt, status: w.status }))
        ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

        if (combined.length === 0) return ctx.reply('No transaction history found.');
        
        let message = 'Last 5 Transactions:\n';
        combined.forEach(t => {
          message += `- ${t.type} of ${t.amount} (${t.status}) on ${t.date.toISOString().split('T')[0]}\n`;
        });
        return ctx.reply(message);
      } catch (e) {
        this.logger.error(e);
        return ctx.reply('Failed to fetch history.');
      }
    });

    this.bot.launch();
    this.logger.log('Telegram bot started.');
  }

  async onModuleDestroy() {
    if (this.bot) {
      this.bot.stop('SIGINT');
    }
  }

  private async getUserByChatId(chatId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { telegramChatId: chatId } });
  }

  async generateLinkToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(16).toString('hex');
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15);

    const user = await this.userRepository.findOne({ where: { id: userId }, select: ['id', 'telegramChatId', 'telegramLinkToken', 'telegramLinkTokenExpires']});
    if (user) {
      user.telegramLinkToken = token;
      user.telegramLinkTokenExpires = expires;
      await this.userRepository.save(user);
    }
    return token;
  }

  async sendDepositConfirmation(userId: string, amount: number, vaultName: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user?.telegramChatId && this.bot) {
      this.bot.telegram.sendMessage(user.telegramChatId, `✅ Deposit Confirmed: ${amount} into ${vaultName}`);
    }
  }

  async sendWithdrawalCompletion(userId: string, amount: number, vaultName: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user?.telegramChatId && this.bot) {
      this.bot.telegram.sendMessage(user.telegramChatId, `💸 Withdrawal Completed: ${amount} from ${vaultName}`);
    }
  }

  async sendSecurityAlert(userId: string, message: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user?.telegramChatId && this.bot) {
      this.bot.telegram.sendMessage(user.telegramChatId, `⚠️ SECURITY ALERT:\n${message}`);
    }
  }
}
