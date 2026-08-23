import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/shared/prisma/prisma.service';

// O MockOpenFinanceAdapter usa new Date() nas transações — sempre o mês corrente.
const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const previousMonth = (() => {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
})();

describe('Finance API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let connectionId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleRef.get(PrismaService);

    // limpa na ordem correta (respeita FKs)
    await prisma.transaction.deleteMany();
    await prisma.investment.deleteMany();
    await prisma.account.deleteMany();
    await prisma.connection.deleteMany();
    await prisma.user.deleteMany();

    // seed: register → connect → sync
    const { body: auth } = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'e2e@finance.test', password: 'senha123' })
      .expect(201);
    token = auth.accessToken;

    const { body: conn } = await request(app.getHttpServer())
      .post('/connections')
      .set('Authorization', `Bearer ${token}`)
      .send({ credentials: { bankId: 'mock-bank' } })
      .expect(201);
    connectionId = conn.connectionId;

    await request(app.getHttpServer())
      .post(`/connections/${connectionId}/sync`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany();
    await prisma.investment.deleteMany();
    await prisma.account.deleteMany();
    await prisma.connection.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // GET /income
  // ---------------------------------------------------------------------------
  describe('GET /income', () => {
    it('retorna 401 sem token', () => {
      return request(app.getHttpServer())
        .get(`/income?month=${currentMonth}`)
        .expect(401);
    });

    it('retorna 400 com formato de mês inválido', () => {
      return request(app.getHttpServer())
        .get('/income?month=08-2026')
        .set('Authorization', `Bearer ${token}`)
        .expect(400)
        .expect(({ body }) => {
          expect(body.message).toContain('month deve estar no formato YYYY-MM (ex: 2026-08)');
        });
    });

    it('retorna 400 com mês inexistente (13)', () => {
      return request(app.getHttpServer())
        .get('/income?month=2026-13')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('retorna as receitas do mês corrente', () => {
      return request(app.getHttpServer())
        .get(`/income?month=${currentMonth}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect(({ body }) => {
          expect(Array.isArray(body)).toBe(true);
          expect(body.length).toBeGreaterThan(0);
          // MockAdapter semeia 1 INCOME: salário de 5200
          const salario = body.find((t: any) => t.sourceLabel === 'Empresa X - Salario');
          expect(salario).toBeDefined();
          expect(Number(salario.amount)).toBe(5200);
        });
    });

    it('retorna lista vazia para mês sem transações', () => {
      return request(app.getHttpServer())
        .get(`/income?month=${previousMonth}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual([]);
        });
    });
  });

  // ---------------------------------------------------------------------------
  // GET /expenses/grouped
  // ---------------------------------------------------------------------------
  describe('GET /expenses/grouped', () => {
    it('retorna 401 sem token', () => {
      return request(app.getHttpServer())
        .get(`/expenses/grouped?month=${currentMonth}`)
        .expect(401);
    });

    it('retorna 400 com formato de mês inválido', () => {
      return request(app.getHttpServer())
        .get('/expenses/grouped?month=2026/08')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('retorna gastos agrupados por categoria no mês corrente', () => {
      return request(app.getHttpServer())
        .get(`/expenses/grouped?month=${currentMonth}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect(({ body }) => {
          expect(Array.isArray(body)).toBe(true);
          // MockAdapter semeia ALIMENTACAO (89.90) e TRANSPORTE (42.50)
          const categorias = body.map((g: any) => g.category);
          expect(categorias).toContain('ALIMENTACAO');
          expect(categorias).toContain('TRANSPORTE');

          const alimentacao = body.find((g: any) => g.category === 'ALIMENTACAO');
          expect(Number(alimentacao.total)).toBeCloseTo(89.9, 1);
          expect(alimentacao.count).toBe(1);
        });
    });

    it('retorna lista vazia para mês sem gastos', () => {
      return request(app.getHttpServer())
        .get(`/expenses/grouped?month=${previousMonth}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual([]);
        });
    });
  });

  // ---------------------------------------------------------------------------
  // GET /investments
  // ---------------------------------------------------------------------------
  describe('GET /investments', () => {
    it('retorna 401 sem token', () => {
      return request(app.getHttpServer()).get('/investments').expect(401);
    });

    it('retorna carteira consolidada com total e byType', () => {
      return request(app.getHttpServer())
        .get('/investments')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect(({ body }) => {
          // MockAdapter semeia CDB (3000) + ACOES (1500)
          expect(body.total).toBeCloseTo(4500, 1);
          expect(body.byType).toMatchObject({ CDB: 3000, ACOES: 1500 });
          expect(Array.isArray(body.items)).toBe(true);
          expect(body.items.length).toBe(2);
        });
    });
  });

  // ---------------------------------------------------------------------------
  // GET /statements/:yearMonth
  // ---------------------------------------------------------------------------
  describe('GET /statements/:yearMonth', () => {
    it('retorna 401 sem token', () => {
      return request(app.getHttpServer())
        .get(`/statements/${currentMonth}`)
        .expect(401);
    });

    it('retorna 400 com formato de mês inválido', () => {
      return request(app.getHttpServer())
        .get('/statements/agosto-2026')
        .set('Authorization', `Bearer ${token}`)
        .expect(400)
        .expect(({ body }) => {
          expect(body.message).toContain('YYYY-MM');
        });
    });

    it('retorna extrato completo do mês corrente', () => {
      return request(app.getHttpServer())
        .get(`/statements/${currentMonth}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body.month).toBe(currentMonth);
          // 1 INCOME (5200) - 2 EXPENSE (89.90 + 42.50 = 132.40)
          expect(Number(body.totalIncome)).toBeCloseTo(5200, 1);
          expect(Number(body.totalExpense)).toBeCloseTo(132.4, 1);
          expect(Number(body.balance)).toBeCloseTo(5067.6, 1);
          expect(body.timeline).toHaveLength(3);
        });
    });

    it('retorna extrato vazio para mês sem dados', () => {
      return request(app.getHttpServer())
        .get(`/statements/${previousMonth}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body.totalIncome).toBe(0);
          expect(body.totalExpense).toBe(0);
          expect(body.balance).toBe(0);
          expect(body.timeline).toHaveLength(0);
        });
    });

    it('a timeline está em ordem cronológica', () => {
      return request(app.getHttpServer())
        .get(`/statements/${currentMonth}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect(({ body }) => {
          const dates = body.timeline.map((t: any) => new Date(t.date).getTime());
          const sorted = [...dates].sort((a, b) => a - b);
          expect(dates).toEqual(sorted);
        });
    });
  });
});
