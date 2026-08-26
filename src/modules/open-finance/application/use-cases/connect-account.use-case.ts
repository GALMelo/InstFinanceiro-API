import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CryptoService } from '../../../../shared/crypto/crypto.service';
import {
  OPEN_FINANCE_PROVIDER,
  OpenFinanceProvider,
} from '../../domain/ports/open-finance-provider.port';
import { Result, ok, err } from '../../../../shared/result/result';
import { DomainError, toUnexpected } from '../../../../shared/errors/domain.errors';

@Injectable()
export class ConnectAccountUseCase {
  constructor(
    @Inject(OPEN_FINANCE_PROVIDER) private readonly provider: OpenFinanceProvider,
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async execute(
    userId: string,
    credentials: Record<string, unknown>,
  ): Promise<Result<{ connectionId: string; status: string }, DomainError>> {
    try {
      const result = await this.provider.connectAccount(userId, credentials);

      const credentialsEnc = this.crypto.encrypt(JSON.stringify(credentials));

      await this.prisma.connection.upsert({
        where: { connectionId: result.connectionId },
        update: { status: result.status, credentialsEnc },
        create: {
          userId,
          connectionId: result.connectionId,
          status: result.status,
          credentialsEnc,
        },
      });

      return ok({ connectionId: result.connectionId, status: result.status });
    } catch (e) {
      if (e instanceof DomainError) return err(e);
      return err(toUnexpected(e));
    }
  }
}
