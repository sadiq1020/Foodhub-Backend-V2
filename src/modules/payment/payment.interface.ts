export interface IStripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}
