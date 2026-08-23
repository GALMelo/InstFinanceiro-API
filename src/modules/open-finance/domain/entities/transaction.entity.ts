export enum TransactionDirection {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum ExpenseCategory {
  ALIMENTACAO = 'ALIMENTACAO',
  TRANSPORTE = 'TRANSPORTE',
  LAZER = 'LAZER',
  MORADIA = 'MORADIA',
  SAUDE = 'SAUDE',
  OUTROS = 'OUTROS',
}

export class TransactionEntity {
  constructor(
    public readonly externalId: string,
    public readonly accountExternalId: string,
    public readonly amount: number,
    public readonly direction: TransactionDirection,
    // fonte do ganho (ex: "Empresa X") ou descricao do gasto
    public readonly sourceLabel: string,
    public readonly date: Date,
    public readonly category?: ExpenseCategory,
  ) {}
}
