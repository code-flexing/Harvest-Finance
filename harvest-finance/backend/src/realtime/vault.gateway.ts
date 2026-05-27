import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Vault } from '../database/entities/vault.entity';

export type VaultActivityType =
  | 'deposit'
  | 'withdrawal'
  | 'harvest'
  | 'milestone'
  | 'ai_insight';

export interface VaultActivityEvent {
  type: VaultActivityType;
  vaultId: string;
  vaultName: string;
  asset?: string;
  amount?: number;
  userId?: string;
  milestone?: string;
  insight?: string;
  newBalance?: number;
  timestamp: string;
}

interface AuthenticatedSocket extends Socket {
  userId?: string;
  isAuthenticated?: boolean;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'vault-activity',
  transports: ['websocket', 'polling'],
})
export class VaultGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VaultGateway.name);
  private readonly jwtSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(Vault)
    private readonly vaultRepository: Repository<Vault>,
  ) {
    this.jwtSecret =
      configService.get<string>('JWT_SECRET') || 'super_secret_jwt_key';
  }

  afterInit() {
    this.logger.log('VaultGateway WebSocket initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    const token = this.extractToken(client);

    if (!token) {
      this.logger.warn(`Unauthenticated connection attempt from ${client.id}`);
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.jwtSecret,
      });

      client.userId = payload.sub;
      client.isAuthenticated = true;
      this.logger.log(
        `Client authenticated: ${client.id} (user: ${client.userId})`,
      );
    } catch (error) {
      this.logger.warn(
        `Invalid JWT token from client ${client.id}: ${(error as Error).message}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.userId || 'anonymous';
    this.logger.log(`Client disconnected: ${client.id} (user: ${userId})`);
  }

  private extractToken(client: AuthenticatedSocket): string | undefined {
    if (client.handshake?.auth?.token) {
      return client.handshake.auth.token as string;
    }
    const query = client.handshake?.query;
    if (query?.token) {
      const token = Array.isArray(query.token) ? query.token[0] : query.token;
      return token;
    }
    const headers = client.handshake?.headers;
    if (headers) {
      const auth = headers['authorization'] || headers['Authorization'];
      if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) {
        return auth.substring(7);
      }
    }
    return undefined;
  }

  private async verifyVaultAccess(
    userId: string,
    vaultId: string,
  ): Promise<Vault | null> {
    try {
      const vault = await this.vaultRepository.findOne({
        where: { id: vaultId },
      });
      if (!vault) {
        return null;
      }
      if (vault.ownerId === userId || vault.isPublic) {
        return vault;
      }
      return null;
    } catch (error) {
      this.logger.warn(
        `Error verifying vault access for vault ${vaultId}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  @SubscribeMessage('subscribe:vault')
  async handleSubscribeVault(
    @MessageBody() vaultId: string,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.isAuthenticated || !client.userId) {
      this.logger.warn(
        `Unauthenticated client ${client.id} attempted to subscribe to vault ${vaultId}`,
      );
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    const vault = await this.verifyVaultAccess(client.userId, vaultId);

    if (!vault) {
      this.logger.warn(
        `Client ${client.id} (user:${client.userId}) denied access to vault ${vaultId}`,
      );
      client.emit('error', { message: 'Access denied to vault' });
      return;
    }

    client.join(`vault:${vaultId}`);
    this.logger.log(
      `Client ${client.id} (user:${client.userId}) subscribed to vault:${vaultId}`,
    );

    client.emit('subscribed:vault', { vaultId, vaultName: vault.vaultName });
  }

  @SubscribeMessage('unsubscribe:vault')
  handleUnsubscribeVault(
    @MessageBody() vaultId: string,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    client.leave(`vault:${vaultId}`);
    this.logger.log(
      `Client ${client.id} (user:${client.userId}) unsubscribed from vault:${vaultId}`,
    );
  }

  emitVaultActivity(event: VaultActivityEvent) {
    this.server.to(`vault:${event.vaultId}`).emit('vault:activity', event);
    this.server.emit('vault:activity:global', event);
    this.logger.debug(
      `Emitted ${event.type} event for vault ${event.vaultId}`,
      {
        vaultId: event.vaultId,
        type: event.type,
        userId: event.userId,
        amount: event.amount,
        timestamp: event.timestamp,
      },
    );
  }

  emitDeposit(data: {
    vaultId: string;
    vaultName: string;
    asset?: string;
    amount: number;
    userId: string;
    newBalance: number;
  }) {
    const event: VaultActivityEvent = {
      type: 'deposit',
      vaultId: data.vaultId,
      vaultName: data.vaultName,
      asset: data.asset,
      amount: data.amount,
      userId: data.userId,
      newBalance: data.newBalance,
      timestamp: new Date().toISOString(),
    };
    this.emitVaultActivity(event);
  }

  emitWithdrawal(data: {
    vaultId: string;
    vaultName: string;
    asset?: string;
    amount: number;
    userId: string;
    newBalance: number;
  }) {
    const event: VaultActivityEvent = {
      type: 'withdrawal',
      vaultId: data.vaultId,
      vaultName: data.vaultName,
      asset: data.asset,
      amount: data.amount,
      userId: data.userId,
      newBalance: data.newBalance,
      timestamp: new Date().toISOString(),
    };
    this.emitVaultActivity(event);
  }

  emitHarvest(data: {
    vaultId: string;
    vaultName: string;
    asset?: string;
    amount: number;
    userId: string;
  }) {
    const event: VaultActivityEvent = {
      type: 'harvest',
      vaultId: data.vaultId,
      vaultName: data.vaultName,
      asset: data.asset,
      amount: data.amount,
      userId: data.userId,
      timestamp: new Date().toISOString(),
    };
    this.emitVaultActivity(event);
  }

  emitMilestone(data: {
    vaultId: string;
    vaultName: string;
    milestone: string;
    userId: string;
  }) {
    const event: VaultActivityEvent = {
      type: 'milestone',
      vaultId: data.vaultId,
      vaultName: data.vaultName,
      milestone: data.milestone,
      userId: data.userId,
      timestamp: new Date().toISOString(),
    };
    this.emitVaultActivity(event);
  }

  emitAiInsight(data: { vaultId: string; vaultName: string; insight: string }) {
    const event: VaultActivityEvent = {
      type: 'ai_insight',
      vaultId: data.vaultId,
      vaultName: data.vaultName,
      insight: data.insight,
      timestamp: new Date().toISOString(),
    };
    this.emitVaultActivity(event);
  }
}
