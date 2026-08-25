import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { HandleWebhookUseCase } from '../application/use-cases/handle-webhook.use-case';

interface PluggyWebhookPayload {
  event: string;
  eventId: string;
  itemId: string;
  clientUserId?: string;
  triggeredBy: 'USER' | 'CLIENT' | 'SYNC' | 'INTERNAL';
}

// Excluído do Swagger — endpoint para uso interno da Pluggy, não do usuário final
@ApiExcludeController()
@Controller('connections')
export class OpenFinanceWebhookController {
  private readonly logger = new Logger(OpenFinanceWebhookController.name);

  constructor(private readonly handleWebhook: HandleWebhookUseCase) {}

  @Post('webhook')
  @HttpCode(200)
  async receive(@Body() payload: PluggyWebhookPayload) {
    this.logger.log(`Webhook recebido: event=${payload.event} itemId=${payload.itemId} eventId=${payload.eventId}`);
    // Processa em background para responder 200 imediatamente à Pluggy
    this.handleWebhook.execute(payload.itemId, payload.event).catch((err) =>
      this.logger.error(`Erro ao processar webhook: ${err.message}`),
    );
    return { received: true };
  }
}
