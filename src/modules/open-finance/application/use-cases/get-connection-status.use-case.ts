import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  OPEN_FINANCE_PROVIDER,
  OpenFinanceProvider,
} from '../../domain/ports/open-finance-provider.port';

@Injectable()
export class GetConnectionStatusUseCase {
  constructor(
    @Inject(OPEN_FINANCE_PROVIDER) private readonly provider: OpenFinanceProvider,
    private readonly prisma: PrismaService,
  ) {}

  async execute(userId: string, connectionId: string) {
    const connection = await this.prisma.connection.findFirst({
      where: { connectionId, userId },
    });
    if (!connection) throw new NotFoundException('Conexão não encontrada');

    // Consulta o status atual direto no provider e atualiza o banco
    const result = await this.provider.getConnectionStatus(connectionId);
    await this.prisma.connection.update({
      where: { connectionId },
      data: { status: result.status },
    });

    return { connectionId, status: result.status };
  }
}
