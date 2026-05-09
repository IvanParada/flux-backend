export class PaymentWebhookDto {
  action: string;
  type: string;
  data: {
    id: string;
  };
}
