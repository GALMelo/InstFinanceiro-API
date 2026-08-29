# Feature Specification: Security & Session Hardening

**Feature Branch**: `001-security-session-hardening`

**Created**: 2026-08-28

**Status**: Draft

**Input**: User description: "Hardening de segurança e sessão para o finance-api, cobrindo autenticação com refresh token e revogação, rate limiting em rotas sensíveis, exclusão de conta (LGPD), política de senha mais forte e persistência do campo nome no cadastro."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sessão com refresh token e logout seguro (Priority: P1)

Como usuário autenticado, quero que minha sessão seja composta por um access token de vida curta
e um refresh token de vida mais longa, para que um token comprometido não comprometa minha conta
por dias inteiros. Quero também poder fazer logout que realmente invalide minha sessão.

**Why this priority**: É o bloqueador central da feature. Sem revogação de token, todos os
outros controles de segurança são insuficientes para uso com dados financeiros reais.

**Independent Test**: Pode ser testado de forma isolada: fazer login, receber ambos os tokens,
usar o refresh token para obter um novo access token, fazer logout, tentar usar o refresh token
novamente — deve ser rejeitado. Entrega valor imediato como fundação de sessão segura.

**Acceptance Scenarios**:

1. **Given** um usuário com credenciais válidas, **When** ele faz login, **Then** recebe um
   access token de curta duração (≤15 minutos) e um refresh token de longa duração (≤7 dias).

2. **Given** um access token expirado, **When** o usuário envia o refresh token válido para a
   rota de renovação, **Then** recebe um novo access token e um novo refresh token (rotação),
   e o refresh token anterior é invalidado.

3. **Given** um usuário logado, **When** ele faz logout, **Then** o refresh token atual é
   marcado como revogado e não pode mais ser usado para emitir novos tokens.

4. **Given** um refresh token revogado (pós-logout ou por comprometimento), **When** alguém
   tenta usá-lo na rota de renovação, **Then** a requisição é rejeitada com erro de token
   inválido, sem gerar novo access token.

5. **Given** um access token ainda válido de um usuário que fez logout, **When** esse token é
   usado em um endpoint protegido, **Then** ele continua válido até expirar — comportamento
   aceitável dado o tempo de vida curto do access token.

---

### User Story 2 - Exclusão de conta e dados pessoais (LGPD) (Priority: P2)

Como usuário, quero poder excluir permanentemente minha conta e todos os meus dados financeiros
associados, para exercer meu direito à exclusão conforme a LGPD e para saber que não restam
rastros de minhas informações na plataforma.

**Why this priority**: Requisito legal (LGPD) e bloqueador para uso com dados financeiros
reais. Sem esse endpoint não é possível oferecer a aplicação a usuários reais.

**Independent Test**: Pode ser testado isoladamente: criar conta, fazer login, chamar o
endpoint de exclusão, tentar fazer login novamente — deve falhar. Verificar que os dados
associados foram removidos.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado, **When** ele chama o endpoint de exclusão de conta,
   **Then** sua conta e todos os dados associados (conexões bancárias, contas, transações,
   investimentos, snapshots) são removidos permanentemente do sistema.

2. **Given** que a conta foi excluída, **When** qualquer token (access ou refresh) emitido
   para aquele usuário é usado, **Then** todos os endpoints protegidos rejeitam o token com
   erro de autenticação.

3. **Given** que a conta foi excluída, **When** alguém tenta fazer login com as mesmas
   credenciais, **Then** recebe erro de credenciais inválidas (o usuário não existe mais).

4. **Given** um usuário autenticado, **When** tenta excluir a conta de outro usuário (mesmo
   conhecendo o ID), **Then** a requisição é rejeitada — a exclusão só pode ser feita pelo
   próprio titular autenticado.

5. **Given** dados que não podem ser excluídos fisicamente por restrição técnica, **When** a
   exclusão é solicitada, **Then** o dado é anonimizado de forma que não seja possível
   identificar o usuário original.

---

### User Story 3 - Rate limiting em rotas sensíveis (Priority: P3)

Como operador da API, quero que rotas de autenticação e de sincronização com provedores
externos tenham limites de uso por período, para proteger a aplicação contra ataques de força
bruta, criação em massa de contas e consumo abusivo de cotas de API externas.

**Why this priority**: Mitigação de abuso e proteção de custo operacional. Importante antes
de uso em produção, mas não bloqueia o desenvolvimento das funcionalidades P1 e P2.

**Independent Test**: Pode ser testado isoladamente disparando requisições acima do limite
para `/auth/login` e verificando que a resposta muda para erro específico com retry-after.

**Acceptance Scenarios**:

1. **Given** um IP fazendo múltiplas tentativas de login com credenciais inválidas, **When**
   ultrapassa o limite configurado na janela de tempo, **Then** recebe resposta de erro
   `RATE_LIMIT_EXCEEDED` com indicação de quando pode tentar novamente (header ou campo no body).

2. **Given** um IP fazendo múltiplas tentativas de cadastro, **When** ultrapassa o limite,
   **Then** recebe o mesmo padrão de erro `RATE_LIMIT_EXCEEDED`.

3. **Given** um usuário autenticado fazendo múltiplas sincronizações manuais, **When**
   ultrapassa o limite por usuário na janela de tempo, **Then** recebe erro `RATE_LIMIT_EXCEEDED`
   específico para sync, sem afetar outros usuários.

4. **Given** que um usuário atingiu o limite de rate limiting, **When** outros usuários fazem
   as mesmas requisições, **Then** eles não são afetados — o limite é por IP/usuário, não global.

5. **Given** uma resposta de rate limit, **When** o período de espera passa, **Then** o usuário
   pode fazer novas requisições normalmente.

---

### User Story 4 - Política de senha forte com mensagens específicas (Priority: P4)

Como novo usuário, quero que o sistema me informe claramente qual critério de senha não atendi,
para que eu possa corrigir meu cadastro sem ter que adivinhar o que está errado.

**Why this priority**: Melhoria de qualidade e conformidade com a constituição do projeto.
Pode ser implementado independentemente, mas está agrupado nesta feature de hardening.

**Independent Test**: Testável de forma isolada enviando senhas que violam cada critério
individualmente e verificando a mensagem retornada.

**Acceptance Scenarios**:

1. **Given** um payload de cadastro com senha de menos de 8 caracteres, **When** enviado para
   a API, **Then** a resposta de erro identifica especificamente que a senha deve ter pelo
   menos 8 caracteres.

2. **Given** uma senha sem letra maiúscula, **When** enviada no cadastro, **Then** o erro
   aponta especificamente a ausência de letra maiúscula.

3. **Given** uma senha sem letra minúscula, **When** enviada no cadastro, **Then** o erro
   aponta especificamente a ausência de letra minúscula.

4. **Given** uma senha sem número, **When** enviada no cadastro, **Then** o erro aponta
   especificamente a ausência de número.

5. **Given** uma senha que atende todos os critérios (≥8 chars, maiúscula, minúscula, número),
   **When** enviada no cadastro, **Then** a validação passa sem erro de senha.

---

### User Story 5 - Persistência do nome no cadastro (Priority: P5)

Como novo usuário, quero que meu nome seja salvo no momento do cadastro, para que a aplicação
possa me identificar de forma personalizada no futuro.

**Why this priority**: Correção de inconsistência entre frontend e API (campo coletado mas
descartado). Menor impacto de segurança, mas parte da conformidade de contrato da API.

**Independent Test**: Testável isoladamente: fazer cadastro com `name`, buscar o usuário
criado, verificar que o campo `name` foi persistido.

**Acceptance Scenarios**:

1. **Given** um payload de cadastro com o campo `name` preenchido, **When** o cadastro é
   concluído com sucesso, **Then** o nome é persistido no registro do usuário.

2. **Given** um payload de cadastro sem o campo `name`, **When** enviado para a API, **Then**
   a requisição é rejeitada com erro de validação indicando que `name` é obrigatório.

3. **Given** um usuário criado antes desta mudança (sem nome no banco), **When** faz login,
   **Then** o login funciona normalmente — a ausência do campo `name` não quebra a autenticação
   de contas existentes.

---

### Edge Cases

- O que acontece quando o refresh token expira naturalmente (sem logout)? → Deve ser rejeitado
  com erro de token expirado, distinto do erro de token revogado.
- O que acontece se o usuário tentar usar um refresh token de uma sessão anterior após uma
  rotação? → Deve ser invalidado (indicativo de comprometimento); idealmente, toda a família
  de tokens é revogada (token family invalidation).
- O que acontece se a exclusão de conta falha parcialmente (ex: erro ao remover transações)?
  → A operação deve ser atômica ou ter mecanismo de rollback; dados parcialmente excluídos não
  são aceitáveis.
- Rate limiting: e se o IP do usuário for um proxy compartilhado? → Assumido como limitação
  aceitável nesta versão; limit por usuário autenticado se aplica onde o usuário é identificável.
- Usuário tenta fazer refresh de token logo antes do access token expirar: comportamento normal
  esperado, deve funcionar.

## Requirements *(mandatory)*

### Functional Requirements

**Sessão e tokens:**
- **FR-001**: O sistema DEVE emitir um access token (vida curta, ≤15min) e um refresh token
  (vida longa, ≤7 dias) tanto no login quanto no registro bem-sucedido.
- **FR-002**: O sistema DEVE disponibilizar uma rota de renovação que aceite um refresh token
  válido e não revogado e emita novos access token e refresh token (rotação), invalidando o
  refresh token anterior.
- **FR-003**: O sistema DEVE disponibilizar uma rota de logout que marque o refresh token
  atual como revogado, impedindo qualquer uso futuro.
- **FR-004**: O sistema DEVE rejeitar qualquer refresh token que esteja marcado como revogado,
  independentemente de sua validade criptográfica.
- **FR-005**: O sistema DEVE rejeitar qualquer refresh token que esteja vencido por tempo.
- **FR-006**: O sistema DEVE continuar validando access tokens da mesma forma que hoje
  (stateless, via `JwtAuthGuard`), sem alteração de comportamento para endpoints existentes.

**Rate limiting:**
- **FR-007**: O sistema DEVE limitar tentativas de `/auth/login` por IP a no máximo 10
  tentativas em uma janela de 15 minutos.
- **FR-008**: O sistema DEVE limitar tentativas de `/auth/register` por IP a no máximo 5
  requisições em uma janela de 60 minutos.
- **FR-009**: O sistema DEVE limitar execuções de `/connections/:id/sync` por usuário
  autenticado a no máximo 10 requisições em uma janela de 60 minutos.
- **FR-010**: Ao exceder qualquer limite, o sistema DEVE responder com código de erro
  `RATE_LIMIT_EXCEEDED` e informar quando a próxima tentativa é permitida.
- **FR-011**: Limites de rate limiting DEVEM ser isolados por IP ou usuário — um usuário que
  atingiu o limite não afeta outros.

**Exclusão de conta (LGPD):**
- **FR-012**: O sistema DEVE disponibilizar uma rota autenticada para exclusão permanente de
  conta, acessível apenas pelo próprio titular.
- **FR-013**: A exclusão DEVE remover ou anonimizar todos os dados do usuário: registro de
  usuário, conexões bancárias, contas, transações, investimentos e snapshots.
- **FR-014**: Após a exclusão, o sistema DEVE rejeitar qualquer access token ou refresh token
  previamente emitido para aquele usuário.
- **FR-015**: A operação de exclusão DEVE ser atômica — ou todos os dados são removidos, ou
  nenhum (sem estado parcialmente excluído).

**Política de senha:**
- **FR-016**: O sistema DEVE rejeitar senhas com menos de 8 caracteres no cadastro.
- **FR-017**: O sistema DEVE rejeitar senhas sem ao menos uma letra maiúscula.
- **FR-018**: O sistema DEVE rejeitar senhas sem ao menos uma letra minúscula.
- **FR-019**: O sistema DEVE rejeitar senhas sem ao menos um número.
- **FR-020**: As mensagens de erro de validação de senha DEVEM identificar especificamente
  qual critério não foi atendido (não apenas "senha inválida").

**Campo nome:**
- **FR-021**: O campo `name` DEVE ser obrigatório no payload de registro.
- **FR-022**: O sistema DEVE persistir o valor de `name` fornecido no registro.
- **FR-023**: Usuários existentes sem o campo `name` no banco DEVEM continuar sendo capazes
  de fazer login sem erro.

### Key Entities

- **RefreshToken**: Representa uma sessão ativa. Atributos: identificador único, referência
  ao usuário, hash do token, data de expiração, flag de revogação, data de criação.
  Relacionamento: pertence a um usuário (N:1).
- **Usuário**: Entidade já existente. Recebe o campo `name` (texto, opcional para registros
  antigos, obrigatório em novos registros via validação de DTO).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um refresh token usado após logout é rejeitado em 100% das tentativas, sem
  emitir novo access token.
- **SC-002**: Após exclusão de conta, 100% das requisições com tokens antigos do usuário
  são rejeitadas com erro de autenticação.
- **SC-003**: Requisições acima do limite de rate limiting são bloqueadas em 100% dos casos
  com resposta de erro clara contendo tempo de espera.
- **SC-004**: Senhas que violam qualquer critério individual são rejeitadas com mensagem que
  identifica o critério específico não atendido, sem revelar outros critérios não violados.
- **SC-005**: 100% dos novos registros com `name` fornecido persistem o campo corretamente.
- **SC-006**: Usuários existentes (sem `name` no banco) conseguem autenticar sem nenhum erro.
- **SC-007**: O tempo de resposta dos endpoints de auth não aumenta mais de 50ms em relação
  ao estado atual devido à checagem de revogação de token.

## Assumptions

- O armazenamento de refresh tokens será persistido no banco de dados relacional já existente
  (Prisma/PostgreSQL), sem necessidade de Redis nesta versão.
- Access tokens continuam stateless (JWT); a revogação de sessão é obtida exclusivamente via
  invalidação do refresh token + vida curta do access token (≤15min).
- O campo `name` para usuários existentes pode ser nulo no banco — a migration deve permitir
  NULL para registros antigos.
- Rate limiting será implementado em memória (in-process) nesta versão, o que significa que
  os contadores se resetam ao reiniciar o servidor — comportamento aceitável para esta fase.
- A exclusão física de dados é preferida à anonimização; anonimização é o fallback apenas
  quando restrições de integridade referencial impeçam a exclusão direta.
- Não há verificação de e-mail no fluxo de registro nesta versão.
- Alterações no frontend (formulário de registro refletindo nova política de senha e campo
  `name` obrigatório) estão fora do escopo desta spec.

## Out of Scope

- Autenticação social / OAuth com terceiros
- Verificação de e-mail no cadastro
- Painel administrativo para gestão de usuários
- Alterações no repositório finance-front
- Recuperação de senha / troca de senha (feature separada futura)
