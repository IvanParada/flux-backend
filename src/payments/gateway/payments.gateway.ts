import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class PaymentsGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('subscribePayment')
  handleSubscription(client: Socket, reference: string) {
    client.join(reference);
  }

  notifyPaymentUpdate(reference: string, status: string) {
    this.server.to(reference).emit('payment_update', { status });
  }
}
