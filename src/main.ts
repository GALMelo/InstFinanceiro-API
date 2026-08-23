import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  const description = `
API de gestão financeira pessoal com integração Open Finance via **Pluggy** (ou mock para desenvolvimento).

---

## Como usar esta documentação

### 1. Autenticar
Use **POST /auth/register** para criar uma conta ou **POST /auth/login** para entrar.
Copie o \`accessToken\` retornado, clique em **Authorize** (cadeado no topo) e cole o valor.
Todos os endpoints de dados exigem esse token.

### 2. Popular o banco

**Com mock (sem credenciais):**
\`\`\`
POST /connections
{ "credentials": { "bankId": "qualquer-valor" } }

POST /connections/{connectionId}/sync
\`\`\`

**Com Pluggy sandbox:**
\`\`\`
POST /connections
{
  "credentials": {
    "connectorId": 2,
    "parameters": { "user": "user-ok", "password": "password-ok" }
  }
}

POST /connections/{connectionId}/sync
\`\`\`
> Para usar a Pluggy, configure \`OPEN_FINANCE_PROVIDER=pluggy\` no \`.env\` e reinicie.
> Credenciais são salvas criptografadas (AES-256-GCM) — o banco nunca armazena plaintext.

### 3. Consultar dados
Use os endpoints de leitura com o mês atual no formato \`YYYY-MM\` (ex: \`2026-08\`).
Formatos inválidos ou meses fora do intervalo 01–12 retornam \`400\`.

---

## Provedores Open Finance

| Variável | Valor | Comportamento |
|---|---|---|
| \`OPEN_FINANCE_PROVIDER\` | \`mock\` | Dados sintéticos, sem credenciais |
| \`OPEN_FINANCE_PROVIDER\` | \`pluggy\` | API real da Pluggy (requer \`PLUGGY_CLIENT_ID\` e \`PLUGGY_CLIENT_SECRET\`) |
`;

  const config = new DocumentBuilder()
    .setTitle('Finance API')
    .setDescription(description)
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Finance API rodando em http://localhost:${port}`);
  console.log(`Swagger disponível em http://localhost:${port}/docs`);
}
bootstrap();
