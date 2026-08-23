export class AccountEntity {
  constructor(
    public readonly externalId: string,
    public readonly institution: string,
    public readonly name: string,
  ) {}
}
