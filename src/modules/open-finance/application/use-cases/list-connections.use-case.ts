import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class ListConnectionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string) {
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

    return connections;
  }
}
