import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MatchGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('joinEvent')
  handleJoinEvent(
    @MessageBody() data: { eventId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`event_${data.eventId}`);
    return { status: 'ok', joined: `event_${data.eventId}` };
  }

  @SubscribeMessage('leaveEvent')
  handleLeaveEvent(
    @MessageBody() data: { eventId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`event_${data.eventId}`);
    return { status: 'ok', left: `event_${data.eventId}` };
  }

  @SubscribeMessage('timerUpdate')
  handleTimerUpdate(
    @MessageBody() data: { eventId: string; elapsedSeconds: number; isPaused: boolean },
  ) {
    this.server.to(`event_${data.eventId}`).emit('timerTicked', {
      elapsedSeconds: data.elapsedSeconds,
      isPaused: data.isPaused,
    });
  }

  sendStateUpdate(eventId: string, eventState: any) {
    this.server.to(`event_${eventId}`).emit('stateUpdated', eventState);
  }
}
