export class ConnectorEntity {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly type: string,
    public readonly country: string,
  ) {}
}
