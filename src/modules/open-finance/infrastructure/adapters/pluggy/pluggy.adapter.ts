import { Injectable, Logger } from '@nestjs/common';
import { BankProviderError } from '../../../../../shared/errors/domain.errors';
import { ConfigService } from '@nestjs/config';
import {
  ConnectionResult,
  OpenFinanceProvider,
} from '../../../domain/ports/open-finance-provider.port';
import { AccountEntity } from '../../../domain/entities/account.entity';
import { ConnectorEntity } from '../../../domain/entities/connector.entity';
import {
  ExpenseCategory,
  TransactionDirection,
  TransactionEntity,
} from '../../../domain/entities/transaction.entity';
import { InvestmentEntity, InvestmentType } from '../../../domain/entities/investment.entity';

// ---------------------------------------------------------------------------
// Tipos internos — só este arquivo conhece o formato de resposta da Pluggy
// ---------------------------------------------------------------------------

interface PluggyApiKey {
  apiKey: string;
  expiresAt: Date;
}

interface PluggyItem {
  id: string;
  status: 'CONNECTED' | 'PENDING' | 'FAILED' | 'OUTDATED' | 'UPDATING' | string;
  connector: { id: number; name: string };
}

interface PluggyConnector {
  id: number;
  name: string;
  type: string;
  country: string;
}

interface PluggyAccount {
  id: string;
  name: string;
  itemId: string;
}

interface PluggyTransaction {
  id: string;
  accountId: string;
  date: string;           // ISO 8601
  description: string;
  amount: number;         // signed: negativo para DEBIT
  type: 'CREDIT' | 'DEBIT';
  category?: string;
}

interface PluggyInvestment {
  id: string;
  type: string;           // 'EQUITY' | 'FIXED_INCOME' | 'ETF' | 'MUTUAL_FUND' | 'COE' | 'SECURITY' | 'OTHER'
  name: string;
  balance: number;
}

interface PagedResponse<T> {
  results: T[];
  page?: number;
  totalPages?: number;
  next?: string;          // cursor para transações
}

// ---------------------------------------------------------------------------
// Mapeamentos de enum Pluggy → domínio
// ---------------------------------------------------------------------------

function toDirection(pluggyType: 'CREDIT' | 'DEBIT'): TransactionDirection {
  return pluggyType === 'CREDIT' ? TransactionDirection.INCOME : TransactionDirection.EXPENSE;
}

function toCategory(pluggyCategory?: string): ExpenseCategory | undefined {
  if (!pluggyCategory) return undefined;
  const c = pluggyCategory.toUpperCase();
  if (/ALIMENT|FOOD|RESTAUR|SUPERMERCADO|GROCERY/.test(c)) return ExpenseCategory.ALIMENTACAO;
  if (/TRANSPORT|TAXI|UBER|COMBUSTIVEL|FUEL|BUS|METRO/.test(c)) return ExpenseCategory.TRANSPORTE;
  if (/LAZER|ENTRET|ENTERTAIN|CINEMA|SPORT|HOBBY/.test(c)) return ExpenseCategory.LAZER;
  if (/MORADIA|ALUGUEL|HOUSING|CONDOMIN|IPTU/.test(c)) return ExpenseCategory.MORADIA;
  if (/SAUDE|HEALTH|MEDIC|FARMAC|HOSPITAL/.test(c)) return ExpenseCategory.SAUDE;
  return ExpenseCategory.OUTROS;
}

function toInvestmentType(pluggyType: string): InvestmentType {
  switch (pluggyType) {
    case 'EQUITY':       return InvestmentType.ACOES;
    case 'FIXED_INCOME': return InvestmentType.CDB;
    case 'ETF':          return InvestmentType.OUTROS;
    case 'MUTUAL_FUND':  return InvestmentType.OUTROS;
    case 'COE':          return InvestmentType.OUTROS;
    case 'SECURITY':     return InvestmentType.OUTROS;
    default:             return InvestmentType.OUTROS;
  }
}

function toConnectionStatus(pluggyStatus: string): ConnectionResult['status'] {
  if (pluggyStatus === 'UPDATED') return 'CONNECTED';
  if (pluggyStatus === 'LOGIN_ERROR' || pluggyStatus === 'OUTDATED') return 'FAILED';
  return 'PENDING'; // UPDATING, WAITING_USER_INPUT
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

const BASE_URL = 'https://api.pluggy.ai';
const TOKEN_TTL_MS = 110 * 60 * 1000; // 1h50m (token válido por 2h)

@Injectable()
export class PluggyAdapter implements OpenFinanceProvider {
  private readonly logger = new Logger(PluggyAdapter.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly webhookBase: string | undefined;
  private cachedKey: PluggyApiKey | null = null;

  constructor(config: ConfigService) {
    this.clientId = config.getOrThrow<string>('PLUGGY_CLIENT_ID');
    this.clientSecret = config.getOrThrow<string>('PLUGGY_CLIENT_SECRET');
    this.webhookBase = config.get<string>('WEBHOOK_BASE_URL') || undefined;
  }

  // --- helpers HTTP --------------------------------------------------------

  private async resolveApiKey(): Promise<string> {
    if (this.cachedKey && this.cachedKey.expiresAt > new Date()) {
      return this.cachedKey.apiKey;
    }

    const res = await fetch(`${BASE_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: this.clientId, clientSecret: this.clientSecret }),
    });

    if (!res.ok) {
      throw new BankProviderError(`Pluggy auth falhou: HTTP ${res.status}`);
    }

    const { apiKey } = await res.json() as { apiKey: string };
    this.cachedKey = { apiKey, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) };
    this.logger.log('Token Pluggy renovado');
    return apiKey;
  }

  private async get<T>(path: string): Promise<T> {
    const key = await this.resolveApiKey();
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'X-API-KEY': key },
    });
    if (!res.ok) {
      throw new BankProviderError(`Pluggy GET ${path} falhou: HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const key = await this.resolveApiKey();
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': key },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      this.logger.error(`Pluggy POST ${path} falhou: HTTP ${res.status} — ${errorBody}`);
      throw new BankProviderError(`Pluggy POST ${path} falhou: HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  // --- porta OpenFinanceProvider -------------------------------------------

  async connectAccount(userId: string, credentials: unknown): Promise<ConnectionResult> {
    const { connectorId, parameters } = credentials as {
      connectorId: number;
      parameters: Record<string, string>;
    };

    const body: Record<string, unknown> = { connectorId, parameters, clientUserId: userId };
    if (this.webhookBase) {
      body.webhookUrl = `${this.webhookBase}/connections/webhook`;
    }

    const item = await this.post<PluggyItem>('/items', body);
    this.logger.log(`Item Pluggy criado: ${item.id} status=${item.status}`);
    return { connectionId: item.id, status: toConnectionStatus(item.status) };
  }

  async getConnectionStatus(connectionId: string): Promise<ConnectionResult> {
    const item = await this.get<PluggyItem>(`/items/${connectionId}`);
    return { connectionId: item.id, status: toConnectionStatus(item.status) };
  }

  async listConnectors(search?: string): Promise<ConnectorEntity[]> {
    const params = search ? `?name=${encodeURIComponent(search)}` : '';
    const data = await this.get<PagedResponse<PluggyConnector>>(`/connectors${params}`);
    return data.results.map((c) => new ConnectorEntity(c.id, c.name, c.type, c.country));
  }

  async fetchAccounts(connectionId: string): Promise<AccountEntity[]> {
    const data = await this.get<PagedResponse<PluggyAccount>>(
      `/accounts?itemId=${connectionId}`,
    );

    // Nome da instituição vem do item (conector), não da conta
    const item = await this.get<PluggyItem>(`/items/${connectionId}`);

    return data.results.map(
      (a) => new AccountEntity(a.id, item.connector.name, a.name),
    );
  }

  async fetchTransactions(connectionId: string, since: Date): Promise<TransactionEntity[]> {
    const all: TransactionEntity[] = [];
    const dateFrom = since.toISOString().split('T')[0]; // YYYY-MM-DD

    const accountsData = await this.get<PagedResponse<PluggyAccount>>(
      `/accounts?itemId=${connectionId}`,
    );

    for (const account of accountsData.results) {
      let nextCursor: string | undefined;

      do {
        const params = new URLSearchParams({ accountId: account.id, dateFrom });
        if (nextCursor) params.set('after', nextCursor);

        const data = await this.get<PagedResponse<PluggyTransaction>>(
          `/v2/transactions?${params.toString()}`,
        );

        for (const tx of data.results) {
          all.push(
            new TransactionEntity(
              tx.id,
              tx.accountId,
              Math.abs(tx.amount),
              toDirection(tx.type),
              tx.description,
              new Date(tx.date),
              toCategory(tx.category),
            ),
          );
        }

        if (data.next) {
          const nextUrl = new URL(`https://api.pluggy.ai${data.next}`);
          nextCursor = nextUrl.searchParams.get('after') ?? undefined;
        } else {
          nextCursor = undefined;
        }
      } while (nextCursor);
    }

    this.logger.log(`fetchTransactions: ${all.length} transações desde ${dateFrom}`);
    return all;
  }

  async fetchInvestments(connectionId: string): Promise<InvestmentEntity[]> {
    // Investimentos não têm accountId na API da Pluggy — associamos à primeira
    // conta do item para satisfazer a FK Investment.accountId → Account.id
    const accountsData = await this.get<PagedResponse<PluggyAccount>>(
      `/accounts?itemId=${connectionId}`,
    );
    const accountExternalId = accountsData.results[0]?.id ?? connectionId;

    const data = await this.get<PagedResponse<PluggyInvestment>>(
      `/investments?itemId=${connectionId}&pageSize=500`,
    );

    return data.results.map(
      (inv) =>
        new InvestmentEntity(
          inv.id,
          accountExternalId,
          toInvestmentType(inv.type),
          inv.name,
          inv.balance,
        ),
    );
  }
}
