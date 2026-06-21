export interface WhatsAppProvider {
  sendMessage(to: string, message: string): Promise<void>;
  getStatus(): Promise<string>;
}
