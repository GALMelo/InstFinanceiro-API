import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  OPEN_FINANCE_PROVIDER,
  OpenFinanceProvider,
} from '../../domain/ports/open-finance-provider.port';
import {
  ExpenseCategory as DomainExpenseCategory,
  TransactionDirection as DomainDirection,
} from '../../domain/entities/transaction.entity';
import {
  ExpenseCategory as PrismaExpenseCategory,
  TransactionDirection as PrismaDirection,
} from '@prisma/client';
import { Result, ok, err } from '../../../../shared/result/result';
import { DomainError, SyncError } from '../../../../shared/errors/domain.errors';

@Injectable()
export class SyncTransactionsUseCase {
  constructor(
    @Inject(OPEN_FINANCE_PROVIDER) private readonly provider: OpenFinanceProvider,
    private readonly prisma: PrismaService,
  ) {}

  async execute(connectionId: string, since: Date): Promise<Result<number, DomainError>> {
    try {
      const transactions = await this.provider.fetchTransactions(connectionId, since);

      for (const tx of transactions) {
        await this.prisma.transaction.upsert({
          where: { id: tx.externalId },
          update: {},
          create: {
            id: tx.externalId,
            accountId: tx.accountExternalId,
            amount: tx.amount,
            direction:
              tx.direction === DomainDirection.INCOME
                ? PrismaDirection.INCOME
                : PrismaDirection.EXPENSE,
            sourceLabel: tx.sourceLabel,
            category: tx.category
              ? (PrismaExpenseCategory[tx.category as unknown as keyof typeof PrismaExpenseCategory] ??
                null)
              : null,
            date: tx.date,
          },
        });
      }

      return ok(transactions.length);
    } catch (e) {
      if (e instanceof DomainError) return err(e);
      return err(new SyncError(`Falha ao sincronizar transações: ${e instanceof Error ? e.message : String(e)}`, e));
    }
  }
}
