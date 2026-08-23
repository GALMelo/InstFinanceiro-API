import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectionResult,
  OpenFinanceProvider,
} from '../../../domain/ports/open-finance-provider.port';
import { AccountEntity } from '../../../domain/entities/account.entity';
import { TransactionEntity } from '../../../domain/entities/transaction.entity';
import { InvestmentEntity } from '../../../domain/entities/investment.entity';

/**
 * Implementacao real usando a API da Pluggy.
 * Este e o unico lugar do projeto que deveria conhecer o formato de
 * resposta da Pluggy — tudo aqui e traduzido para as entidades de dominio
 * antes de sair deste arquivo.
 *
 * TODO: substituir os metodos abaixo pelas chamadas reais ao SDK/HTTP da
 * Pluggy usando PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET do .env.
 */
@Injectable()
export class PluggyAdapter implements OpenFinanceProvider {
  private readonly logger = new Logger(PluggyAdapter.name);

  constructor(private readonly config: ConfigService) {}

  async connectAccount(userId: string, credentials: unknown): Promise<ConnectionResult> {
    this.logger.warn('PluggyAdapter.connectAccount ainda nao implementado');
    throw new Error('Not implemented: integrar com a API real da Pluggy');
  }

  async fetchAccounts(connectionId: string): Promise<AccountEntity[]> {
    throw new Error('Not implemented: integrar com a API real da Pluggy');
  }

  async fetchTransactions(connectionId: string, since: Date): Promise<TransactionEntity[]> {
    throw new Error('Not implemented: integrar com a API real da Pluggy');
  }

  async fetchInvestments(connectionId: string): Promise<InvestmentEntity[]> {
    throw new Error('Not implemented: integrar com a API real da Pluggy');
  }
}
