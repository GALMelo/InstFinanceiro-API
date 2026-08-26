import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  OPEN_FINANCE_PROVIDER,
  OpenFinanceProvider,
} from '../../domain/ports/open-finance-provider.port';
import { Result, ok, err } from '../../../../shared/result/result';
import {
  DomainError,
  ConnectionNotFoundError,
  toUnexpected,
} from '../../../../shared/errors/domain.errors';

@Injectable()
export class GetConnectionStatusUseCase {
  constructor(
    @Inject(OPEN_FINANCE_PROVIDER) private readonly provider: OpenFinanceProvider,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    userId: string,
    connectionId: string,
  ): Promise<Result<{ connectionId: string; status: string }, DomainError>> {
    try {
      const connection = await this.prisma.connection.findFirst({
        where: { connectionId, userId },
      });
      if (!connection) return err(new ConnectionNotFoundError('Conexão não encontrada'));

      const result = await this.provider.getConnectionStatus(connectionId);
      await this.prisma.connection.update({
        where: { connectionId },
        data: { status: result.status },
      });

      return ok({ connectionId, status: result.status });
    } catch (e) {
      if (e instanceof DomainError) return err(e);
      return err(toUnexpected(e));
    }
  }
}
