import { Injectable } from '@nestjs/common';
import {
  ConnectionResult,
  OpenFinanceProvider,
} from '../../../domain/ports/open-finance-provider.port';
import { AccountEntity } from '../../../domain/entities/account.entity';
import {
  ExpenseCategory,
  TransactionDirection,
  TransactionEntity,
} from '../../../domain/entities/transaction.entity';
import { InvestmentEntity, InvestmentType } from '../../../domain/entities/investment.entity';

/**
 * Implementacao fake da porta OpenFinanceProvider.
 * Usada em desenvolvimento/testes para nao depender de credenciais
 * reais de nenhum provedor. Troque OPEN_FINANCE_PROVIDER=mock por
 * "pluggy" no .env quando quiser usar dados reais — nada no dominio muda.
 */
@Injectable()
export class MockOpenFinanceAdapter implements OpenFinanceProvider {
  async connectAccount(userId: string): Promise<ConnectionResult> {
    return { connectionId: `mock-conn-${userId}`, status: 'CONNECTED' };
  }

  async fetchAccounts(connectionId: string): Promise<AccountEntity[]> {
    return [new AccountEntity(`${connectionId}-acc-1`, 'Banco Fake S.A.', 'Conta Corrente')];
  }

  async fetchTransactions(connectionId: string): Promise<TransactionEntity[]> {
    const accountExternalId = `${connectionId}-acc-1`;
    return [
      new TransactionEntity(
        `${connectionId}-tx-1`,
        accountExternalId,
        5200,
        TransactionDirection.INCOME,
        'Empresa X - Salario',
        new Date(),
      ),
      new TransactionEntity(
        `${connectionId}-tx-2`,
        accountExternalId,
        89.9,
        TransactionDirection.EXPENSE,
        'Supermercado Extra',
        new Date(),
        ExpenseCategory.ALIMENTACAO,
      ),
      new TransactionEntity(
        `${connectionId}-tx-3`,
        accountExternalId,
        42.5,
        TransactionDirection.EXPENSE,
        '99 Taxi',
        new Date(),
        ExpenseCategory.TRANSPORTE,
      ),
    ];
  }

  async fetchInvestments(connectionId: string): Promise<InvestmentEntity[]> {
    const accountExternalId = `${connectionId}-acc-1`;
    return [
      new InvestmentEntity(
        `${connectionId}-inv-1`,
        accountExternalId,
        InvestmentType.CDB,
        'Banco Fake S.A.',
        3000,
      ),
      new InvestmentEntity(
        `${connectionId}-inv-2`,
        accountExternalId,
        InvestmentType.ACOES,
        'Corretora Fake',
        1500,
      ),
    ];
  }
}
