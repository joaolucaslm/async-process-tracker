# PLANNING.md

## 1. Entendimento do problema

O objetivo é construir uma aplicação full stack que garanta o padrão de **processamento assíncrono com acompanhamento de progresso**: o usuário submete uma tarefa (soma de uma lista de números), a API responde imediatamente sem esperar o processamento terminar, o trabalho roda em background por etapas simuladas (com delays propositais), e o frontend acompanha esse progresso via polling até a conclusão.

Então, a aplicação deve garantir os seguintes tópicos:
- a API **nunca bloqueia** enquanto uma requisição está sendo processada em background;
- o estado da requisição (status, progresso, logs, resultado) é atualizado de forma confiável e consultável a qualquer momento;
- o frontend reflete esse estado em tempo real, sem intervenção manual do usuário além de abrir a tela de detalhe.

## 2. Stack e decisões técnicas

### Banco de dados
Não será utilizado. O próprio enunciado especifica armazenamento em memória ("a list or dictionary in the running process is enough"), e a aplicação não tem requisito de persistência entre reinicializações. As requisições e seus estados (status, progresso, logs, resultado) ficarão armazenadas em um dicionário mantido em memória durante a execução do processo.

### Backend — Python + FastAPI
FastAPI foi escolhido por ser nativamente assíncrono e por oferecer `BackgroundTasks`, que se encaixa diretamente na necessidade central do desafio: aceitar a requisição e devolver resposta imediata, enquanto o processamento roda de forma independente sem bloquear o event loop da API.

**Estrutura modular**, proporcional ao escopo do projeto (4 endpoints, sem persistência real):

```
app/
├── main.py              # instância do FastAPI, inclusão dos routers
├── routers/
│   └── requests.py      # os 4 endpoints (POST, GET lista, GET detalhe, POST cancel)
├── schemas/
│   └── request.py       # modelos Pydantic (RequestCreate, RequestOut, StatusEnum)
├── services/
│   └── processor.py     # rotina de background: validação, cálculo, atualização de estado
└── storage/
    └── memory_store.py  # abstração sobre o dicionário em memória (get/set/list)
```

Optei por não adotar uma arquitetura em camadas mais elaborada (ex: clean architecture com use cases, interfaces de repositório, etc.), pois o escopo do projeto não justifica essa complexidade: não há troca prevista de framework ou de mecanismo de armazenamento, e uma divisão mais pesada tornaria o código mais difícil de navegar sem ganho real de manutenibilidade. A divisão em `routers` / `schemas` / `services` / `storage` já separa claramente as responsabilidades (entrada HTTP, validação/tipagem, lógica de processamento, e acesso ao estado).

Validação e tipagem dos dados no backend serão feitas com **Pydantic**, incluindo o union type do campo `status` (`pending`, `processing`, `completed`, `error`).

### Testes
Serão escritos testes unitários tanto no backend quanto no frontend, priorizando os pontos mais sensíveis do desafio em vez de cobertura ampla:
- **Backend**: criação de requisição, transições de status, não-bloqueio da API durante o processamento (uma requisição em `processing` não deve impedir outras chamadas de responder), e o fluxo de cancelamento.
- **Frontend**: comportamento do polling (parar corretamente ao atingir `completed` ou `error`) e validação dos dados recebidos da API via Zod.

### Frontend — React + TypeScript
Frontend construído com **React + TypeScript**, sem uso de meta-frameworks (Next.js) — apenas React puro (via Vite), conforme especificado no enunciado ("Function components, useState, useEffect and basic typing are enough").

Estilização com **TailwindCSS**, incluindo responsividade para uso mobile como diferencial (não exigido pelo enunciado, mas adicionado como boa prática).

**Zod** será utilizado para:
- validar o formulário de criação de requisição antes do envio;
- validar e tipar (via `z.infer`) os dados retornados pela API, garantindo segurança em tempo de execução além da checagem estática do TypeScript.

Telas:
1. **Lista de requisições** — busca ao montar, com tratamento de loading, erro e vazio.
2. **Nova requisição** — formulário para a lista de números, com submissão criando a requisição e navegando para o detalhe.
3. **Detalhe da requisição** — status, progresso, logs e resultado, com polling em intervalo que para ao atingir `completed` ou `error`, e ação de cancelamento.

### Deploy
- **Backend**: hospedado em uma instância EC2 (AWS Free Tier), rodando via Uvicorn atrás de um proxy reverso Nginx.
- **Frontend**: hospedado na Vercel, apontando as chamadas de API para o endpoint da EC2.

O deploy é tratado como um diferencial adicional. O projeto continuará sendo executável localmente de ponta a ponta apenas seguindo o README, conforme exigido no enunciado.

## 3. Dificuldades esperadas

- **Garantir o não-bloqueio real da API**: `BackgroundTasks` do FastAPI roda no mesmo processo; é preciso confirmar que os `sleep`s do processamento não travam o event loop (uso de `asyncio.sleep` em vez de `time.sleep`, ou execução em thread separada se necessário).
- **Consistência de estado em memória sob concorrência**: como múltiplas requisições podem estar sendo processadas simultaneamente, é necessário cuidado ao atualizar o dicionário compartilhado para evitar condições de corrida.
- **Cancelamento de um processo em andamento**: interromper de forma limpa uma tarefa já disparada em background é mais delicado do que apenas mudar o status armazenado — é preciso garantir que a rotina de processamento verifique esse sinal de cancelamento durante sua execução.
- **Sincronização entre polling do frontend e mudanças rápidas de estado no backend**: escolher um intervalo de polling que equilibre responsividade e número de requisições.
- **CORS entre frontend (Vercel) e backend (EC2)** ao configurar o deploy.

## 4. Suposições assumidas

- O status de cancelamento será modelado como um valor próprio (`cancelled`) adicional aos quatro especificados no enunciado, para diferenciar claramente de um erro real de processamento. *(ajustar aqui se decidir reaproveitar `error`)*
- Não há necessidade de autenticação ou multiusuário; a aplicação assume um único usuário/sessão observando as requisições.
- O deploy na AWS/Vercel é tratado como valor agregado, não como requisito de avaliação — o funcionamento local via README é a referência principal.