import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { Result, ok, err } from '../../../../shared/result/result';
import { DomainError, toUnexpected } from '../../../../shared/errors/domain.errors';

@Injectable()
export class ListConnectionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string): Promise<Result<unknown[], DomainError>> {
    try {
      const connections = await this.prisma.connection.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          connectionId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return ok(connections);
    } catch (e) {
      return err(toUnexpected(e));
    }
  }
}
