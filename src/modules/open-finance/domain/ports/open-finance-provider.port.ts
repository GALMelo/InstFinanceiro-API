import { AccountEntity } from '../entities/account.entity';
import { TransactionEntity } from '../entities/transaction.entity';
import { InvestmentEntity } from '../entities/investment.entity';

export interface ConnectionResult {
  connectionId: string;
  status: 'CONNECTED' | 'PENDING' | 'FAILED';
}

/**
 * Porta (contrato) que qualquer provedor de Open Finance precisa implementar.
 * O dominio e os casos de uso dependem SOMENTE desta interface — nunca de
 * um SDK ou detalhe de um provedor especifico (Pluggy, Belvo, etc).
 * Isso e a Inversao de Dependencia (o "D" do SOLID) aplicada na pratica.
 */
export interface OpenFinanceProvider {
  connectAccount(userId: string, credentials: unknown): Promise<ConnectionResult>;
  fetchAccounts(connectionId: string): Promise<AccountEntity[]>;
  fetchTransactions(connectionId: string, since: Date): Promise<TransactionEntity[]>;
  fetchInvestments(connectionId: string): Promise<InvestmentEntity[]>;
}

// Token de injecao — o NestJS usa isso para saber qual implementacao entregar
// quando alguem pede um OpenFinanceProvider via @Inject(OPEN_FINANCE_PROVIDER)
export const OPEN_FINANCE_PROVIDER = Symbol('OPEN_FINANCE_PROVIDER');
