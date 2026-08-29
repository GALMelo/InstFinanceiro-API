# Feature Specification: Pluggy Adapter Data Exploration Spike

**Feature Branch**: `002-pluggy-adapter-spike`

**Created**: 2026-08-28

**Status**: Draft

**Type**: Technical Spike — investigação exploratória, sem entrega de produto. O artefato final
é documentação de achados, não código de produção.

**Input**: User description: "Investigar o formato real dos dados retornados pela Pluggy SDK antes de confiar nas suposições atuais do PluggyAdapter — campos de receita/despesa, categoria e relação investimento-conta."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Executar exploração e obter output completo da API (Priority: P1)

Como desenvolvedor mantendo o `PluggyAdapter`, quero rodar um script isolado que consulte a
Pluggy com um `itemId` real e imprima o JSON completo de contas, transações e investimentos,
para poder inspecionar os dados sem interferir no banco de dados ou no fluxo de sincronização
da aplicação.

**Why this priority**: Sem dados reais para observar, qualquer conclusão sobre o formato do
adapter é especulação. Este é o bloqueador de tudo: sem o script rodando com sucesso, não há
achados para documentar.

**Independent Test**: O script pode ser executado de forma completamente isolada — basta ter
o `itemId` de uma conexão de teste e as credenciais no `.env`. Entrega valor imediato ao
permitir a inspeção dos dados.

**Acceptance Scenarios**:

1. **Given** um `itemId` válido de uma conexão de teste e credenciais Pluggy configuradas,
   **When** o script é executado, **Then** imprime no console o JSON completo de pelo menos
   uma conta do item sem erros.

2. **Given** que a conta foi obtida, **When** o script continua a execução, **Then** imprime
   o JSON completo das primeiras transações daquela conta — sem truncar campos, sem reformatar
   valores.

3. **Given** que o item possui investimentos, **When** o script consulta o endpoint de
   investimentos, **Then** imprime o JSON completo de pelo menos um investimento.

4. **Given** que o item não possui investimentos ou o endpoint não está disponível na versão
   do SDK instalada, **When** o script tenta a consulta, **Then** registra a situação de forma
   clara (ex: "investimentos não disponíveis") e encerra sem erro fatal.

5. **Given** credenciais inválidas ou `itemId` inexistente, **When** o script é executado,
   **Then** imprime uma mensagem de erro clara identificando o problema, sem lançar exceção
   não tratada.

6. **Given** a execução do script em qualquer cenário, **When** ela termina, **Then** nenhum
   dado foi gravado no banco de dados — confirmável verificando que nenhuma query INSERT/UPDATE
   foi disparada.

---

### User Story 2 - Documentar achados e validar suposições do adapter (Priority: P2)

Como desenvolvedor do projeto, quero um documento estruturado que registre o que foi observado
nos dados reais da Pluggy — especificamente os campos relevantes para a lógica do `PluggyAdapter`
— e que compare explicitamente com o que o adapter atualmente assume, para saber o que precisa
ser corrigido antes de evoluir a sincronização.

**Why this priority**: O script sozinho (P1) não produz valor duradouro — é o documento de
achados que transforma a investigação em conhecimento reutilizável e insumo para decisões de
arquitetura futuras.

**Independent Test**: O documento de achados pode ser avaliado independentemente do script —
basta verificar se responde às três perguntas-chave (receita/despesa, categoria, investimento-conta)
com dados reais e compara com a implementação atual.

**Acceptance Scenarios**:

1. **Given** que o script foi executado com sucesso, **When** o documento de achados é
   produzido, **Then** ele identifica especificamente qual campo e quais valores indicam se
   uma transação é receita ou despesa, com exemplos dos dados reais observados.

2. **Given** os dados reais observados, **When** o documento trata do campo de categoria,
   **Then** especifica o nome exato do campo, se os valores são texto livre, enum fixo ou
   identificador, e exemplos de valores encontrados.

3. **Given** os dados de investimentos observados, **When** o documento trata da relação
   investimento-conta, **Then** confirma se existe (ou não) um campo que associa investimento
   a uma conta específica dentro do item, com evidência dos dados.

4. **Given** as três perguntas anteriores respondidas, **When** o documento compara com a
   implementação atual do `PluggyAdapter`, **Then** marca explicitamente cada suposição como:
   CONFIRMADA (adapter está correto), INCORRETA (adapter diverge) ou INDEFINIDA (dados
   insuficientes para concluir).

5. **Given** que foram encontradas divergências, **When** o documento registra os achados,
   **Then** lista cada divergência com o comportamento atual do adapter e o comportamento
   correto baseado nos dados reais — sem propor código de correção (isso é escopo de spec futura).

---

### Edge Cases

- O que acontece se o `itemId` de teste não tiver transações? → O script deve indicar isso
  claramente ("nenhuma transação encontrada para esta conta") e continuar para investimentos.
- O que acontece se o item tiver múltiplas contas? → O script deve iterar sobre todas as
  contas, mas pode limitar o número de transações exibidas por conta (ex: primeiras 5) para
  evitar output excessivo.
- O que acontece se a Pluggy retornar campos adicionais não mapeados pelo SDK? → O script
  deve imprimir o objeto raw completo para capturar qualquer campo não esperado.
- O que acontece se o SDK instalado não expuser o método de investimentos? → Registrar a
  ausência e documentar a versão do SDK em uso nos achados.

## Requirements *(mandatory)*

### Functional Requirements

**Script de exploração:**
- **FR-001**: O script DEVE se autenticar no provedor de Open Finance usando as credenciais
  do ambiente sem nenhuma modificação manual adicional além de fornecer o `itemId`.
- **FR-002**: O script DEVE aceitar o `itemId` como argumento de linha de comando ou como
  constante configurável no próprio arquivo.
- **FR-003**: O script DEVE buscar todas as contas associadas ao `itemId` e exibir seus dados
  completos no console.
- **FR-004**: O script DEVE buscar transações de cada conta e exibir o JSON completo das
  primeiras transações — sem truncar campos ou valores, sem reformatar.
- **FR-005**: O script DEVE tentar buscar os investimentos do item e exibir o resultado
  completo de ao menos um investimento, se disponível.
- **FR-006**: O script DEVE tratar graciosamente a ausência de investimentos (endpoint
  indisponível ou item sem investimentos) sem encerrar com erro fatal.
- **FR-007**: O script NÃO DEVE em nenhuma hipótese gravar dados no banco de dados — nenhuma
  operação de escrita pode ocorrer como efeito colateral da execução.
- **FR-008**: O script DEVE ser executável de forma completamente isolada, sem inicializar
  a aplicação NestJS nem depender do servidor estar em execução.

**Documento de achados:**
- **FR-009**: O documento de achados DEVE responder às três perguntas-chave com base em dados
  reais: (a) como identificar receita vs. despesa, (b) formato exato do campo de categoria,
  (c) relação entre investimento e conta.
- **FR-010**: O documento DEVE comparar explicitamente cada achado com a suposição atual do
  `PluggyAdapter`, classificando cada uma como CONFIRMADA, INCORRETA ou INDEFINIDA.
- **FR-011**: O documento DEVE incluir exemplos literais dos dados observados (trechos de JSON
  ou valores de campos) para fundamentar cada conclusão.
- **FR-012**: O documento DEVE registrar a versão do SDK utilizada no momento da investigação.
- **FR-013**: O documento DEVE ser armazenado no diretório desta spec
  (`specs/002-pluggy-adapter-spike/`) para rastreabilidade futura.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O script executa do início ao fim sem erros fatais contra um `itemId` de teste
  real, produzindo output visível de contas e transações.
- **SC-002**: O documento de achados responde objetivamente às 3 perguntas-chave com base em
  dados reais — nenhuma das respostas é "não foi possível verificar" por falta de execução.
- **SC-003**: 100% das suposições identificadas no `PluggyAdapter` relacionadas a transações
  e investimentos têm um status explícito (CONFIRMADA / INCORRETA / INDEFINIDA) no documento.
- **SC-004**: O documento permite que um desenvolvedor que nunca viu os dados da Pluggy
  entenda o contrato real da API sem precisar rodar o script novamente.
- **SC-005**: Nenhuma gravação em banco de dados ocorreu durante a execução do script —
  verificável via logs ou inspeção do banco antes/depois.

## Assumptions

- Existe ao menos uma conexão de teste ativa (item Pluggy com `itemId` conhecido) com dados
  de transações disponíveis para consulta em sandbox.
- As credenciais da Pluggy sandbox já estão configuradas no `.env` local e são válidas no
  momento da execução.
- O SDK da Pluggy já está instalado como dependência do projeto — o script reutiliza o SDK
  existente, sem instalar versões adicionais.
- "Primeiras transações" é definido como as primeiras 5 transações por conta — suficiente
  para identificar o formato sem gerar output excessivo.
- O documento de achados é produzido manualmente pelo desenvolvedor após inspecionar o output
  do script — não é gerado automaticamente pelo script.
- O script é uma ferramenta descartável de investigação: não precisa de testes automatizados,
  tratamento de erro production-grade, nem logging estruturado.

## Out of Scope

- Implementar correções no `PluggyAdapter` com base nos achados
- Qualquer gravação no banco de dados
- Testes automatizados para o script de exploração
- Alterações em endpoints existentes ou no comportamento de sincronização em produção
- Exploração de outros aspectos da API Pluggy além dos três campos de investigação definidos
  (receita/despesa, categoria, relação investimento-conta)
