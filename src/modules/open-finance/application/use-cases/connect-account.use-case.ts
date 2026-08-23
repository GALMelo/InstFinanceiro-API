import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CryptoService } from '../../../../shared/crypto/crypto.service';
import {
  OPEN_FINANCE_PROVIDER,
  OpenFinanceProvider,
} from '../../domain/ports/open-finance-provider.port';

@Injectable()
export class ConnectAccountUseCase {
  constructor(
    @Inject(OPEN_FINANCE_PROVIDER) private readonly provider: OpenFinanceProvider,
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async execute(userId: string, credentials: Record<string, unknown>) {
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

    return { connectionId: result.connectionId, status: result.status };
  }
}
