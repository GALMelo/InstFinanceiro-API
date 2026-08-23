export enum InvestmentType {
  POUPANCA = 'POUPANCA',
  CDB = 'CDB',
  ACOES = 'ACOES',
  FII = 'FII',
  TESOURO_DIRETO = 'TESOURO_DIRETO',
  OUTROS = 'OUTROS',
}

export class InvestmentEntity {
  constructor(
    public readonly externalId: string,
    public readonly accountExternalId: string,
    public readonly type: InvestmentType,
    public readonly institution: string,
    public readonly currentValue: number,
  ) {}
}
