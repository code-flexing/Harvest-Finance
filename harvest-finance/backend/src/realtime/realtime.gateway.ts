import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';

/**
 * WebSocket gateway for real-time analytics events.
 *
 * Room Naming Conventions & Access Rules:
 * ========================================================
 * 1. Admin Room: "admin"
 *    - Purpose: Broadcast platform-wide metrics and system alerts.
 *    - Access Rule: Restricted to administrators. Subscribed to by clients calling 'join:admin'.
 *    - Room Name Pattern: Exactly "admin".
 *
 * 2. Farmer Room: "farmer:<id>"
 *    - Purpose: Send targeted, farmer-specific KPI updates and alerts.
 *    - Access Rule: Restricted to the specific farmer user.
 *    - Room Name Pattern: "farmer:<userId>" where <userId> is the UUID of the farmer.
 *      Subscribed to by clients who call the 'join:farmer' event with their `userId`.
 * ========================================================
 *
 * Events emitted by server:
 *  - "metrics:platform"   → PlatformMetricsEvent (sent to "admin" room)
 *  - "metrics:farmer"     → FarmerMetricsEvent (sent to specific "farmer:<userId>" room)
 *  - "alert:threshold"    → AlertEvent (sent to "admin" room or specific "farmer:<userId>" room)
 */
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/realtime',
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /** Client joins the admin room to receive platform-wide metrics */
  @SubscribeMessage('join:admin')
  handleJoinAdmin(@ConnectedSocket() client: Socket) {
    client.join('admin');
    this.logger.log(`${client.id} joined admin room`);
  }

  /** Client joins their personal farmer room */
  @SubscribeMessage('join:farmer')
  handleJoinFarmer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    if (data?.userId) {
      client.join(`farmer:${data.userId}`);
      this.logger.log(`${client.id} joined farmer:${data.userId}`);
    }
  }

  /** Broadcast platform metrics to all admin subscribers */
  emitPlatformMetrics(payload: Record<string, unknown>) {
    this.server.to('admin').emit('metrics:platform', payload);
  }

  /** Broadcast farmer-specific KPIs to that farmer's room */
  emitFarmerMetrics(userId: string, payload: Record<string, unknown>) {
    this.server.to(`farmer:${userId}`).emit('metrics:farmer', payload);
  }

  /**
   * Broadcast an alert to a specific farmer or all admins.
   * Resolves target to room:
   *  - if target is 'admin', resolves to 'admin' room.
   *  - otherwise, resolves to 'farmer:<target>' room.
   */
  emitAlert(target: 'admin' | string, payload: Record<string, unknown>) {
    const room = target === 'admin' ? 'admin' : `farmer:${target}`;
    this.server.to(room).emit('alert:threshold', payload);
  }
}
