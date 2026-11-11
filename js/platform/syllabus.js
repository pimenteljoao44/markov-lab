// A trilha: de processo aleatório a agente de IA governado, em cinco fases.
// Cada módulo começa por um problema de trabalho e termina com a pessoa explicando o assunto com
// as próprias palavras. Os exemplos falam de uma indústria com ERP, sem citar empresa nenhuma.
//
// Tipos de item:
//   lab      laboratório interativo deste caderno (ver labs.js)
//   aula     vídeo ou curso para assistir
//   leitura  documento de referência
//   pratica  construir algo fora do caderno, no ambiente de verdade
//   entrega  documento ou artefato que fica pronto para uso no trabalho
//   explica  explicar o assunto por escrito, sem consultar
//
// Links conferidos em nov/2026. `id` nunca muda depois de publicado: é a chave do progresso salvo.

const lab = (lab) => ({ id: `lab-${lab}`, kind: 'lab', lab });
const aula = (id, title, href, note) => ({ id, kind: 'aula', title, href, note });
const leitura = (id, title, href, note) => ({ id, kind: 'leitura', title, href, note });
const pratica = (id, title, note) => ({ id, kind: 'pratica', title, note });
const entrega = (id, title, note) => ({ id, kind: 'entrega', title, note });
const explica = (id, title) => ({ id, kind: 'explica', title });

export const KINDS = {
  lab: 'Laboratório',
  aula: 'Aula',
  leitura: 'Leitura',
  pratica: 'Prática',
  entrega: 'Entrega',
  explica: 'Explique',
};

export const PHASES = [
  {
    id: 'fase0',
    num: 0,
    title: 'Matemática que sustenta decisão',
    goal: 'Intuição suficiente para decidir arquitetura, não para derivar na mão. Corre em paralelo com a fase 1.',
    deliverable: 'Conseguir desmontar um número de fornecedor: de onde veio, com que amostra, medido por quem.',
    modules: [
      {
        id: 'processos',
        title: 'Probabilidade e processos',
        problem: 'De cada 100 clientes que atrasaram este mês, quantos estarão inadimplentes daqui a três? E quanto tempo um pedido leva, em média, até ser faturado?',
        items: [
          lab('markov'),
          leitura('khan-estatistica', 'Khan Academy: estatística e probabilidade', 'https://pt.khanacademy.org/math/statistics-probability', 'Distribuições, correlação contra causalidade e intervalo de confiança. Em português.'),
          explica('explica-processos', 'Por que uma simulação com 20 sorteios e uma com 2.000 dão respostas tão diferentes, e qual delas você levaria para uma reunião?'),
        ],
      },
      {
        id: 'vetores',
        title: 'Vetores e similaridade',
        problem: 'Como um sistema decide que "nota fiscal rejeitada" e "NF-e com erro de validação" falam da mesma coisa, sem ter nenhuma palavra em comum?',
        items: [
          aula('3b1b-algebra', '3Blue1Brown: a essência da álgebra linear', 'https://www.3blue1brown.com/topics/linear-algebra', 'Os três primeiros capítulos bastam para começar: vetores, combinações lineares e transformações.'),
          lab('vetores'),
          explica('explica-vetores', 'O que o produto escalar de dois vetores mede, e por que isso serve para comparar dois textos?'),
        ],
      },
      {
        id: 'gradiente',
        title: 'Cálculo: o que é treinar',
        problem: 'Quando um fornecedor diz que "o modelo aprende com os seus dados", o que exatamente está sendo ajustado, e com base em quê?',
        items: [
          aula('3b1b-calculo', '3Blue1Brown: a essência do cálculo', 'https://www.3blue1brown.com/topics/calculus', 'Derivada como taxa de variação. O objetivo é entender o gradiente como direção de ajuste.'),
          lab('gradiente'),
          explica('explica-gradiente', 'Treinar um modelo é descer uma ladeira. Ladeira de quê, e quem decide o tamanho do passo?'),
        ],
      },
    ],
  },
  {
    id: 'fase1',
    num: 1,
    title: 'Como um LLM funciona',
    goal: 'Literacia técnica operacional: tokens, contexto, sorteio e por que o modelo inventa.',
    deliverable: 'Glossário aplicado: cada termo com um exemplo do seu próprio trabalho.',
    modules: [
      {
        id: 'mecanica',
        title: 'A mecânica: prever o próximo token',
        problem: 'Por que o mesmo prompt dá respostas diferentes a cada vez? Quando isso é aceitável (rascunho de e-mail) e quando é inadmissível (classificação fiscal)?',
        items: [
          aula('3b1b-llm', '3Blue1Brown: LLMs explicados em poucos minutos', 'https://www.3blue1brown.com/lessons/mini-llm', 'Oito minutos. Assista antes do laboratório.'),
          lab('llm'),
          aula('karpathy-makemore', 'Andrej Karpathy: construindo o makemore', 'https://www.youtube.com/watch?v=PaCmpygFfXo', 'Quase duas horas, em inglês, com código. É o laboratório acima feito em Python, do bigrama à rede neural.'),
          leitura('hf-llm', 'Hugging Face: LLM Course', 'https://huggingface.co/learn/llm-course', 'Para aprofundar em transformers e tokenização. Os dois primeiros capítulos cobrem esta fase.'),
          explica('explica-mecanica', 'Explique para um colega do financeiro por que o assistente de IA às vezes afirma com segurança algo que não existe.'),
        ],
      },
      {
        id: 'prompt',
        title: 'Prompt como engenharia',
        problem: 'Você precisa que o modelo devolva sempre o mesmo formato, para outro sistema consumir. Como escrever o pedido para isso acontecer em 100 de 100 chamadas?',
        items: [
          leitura('anthropic-prompt', 'Anthropic: guia de engenharia de prompt', 'https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview', 'Clareza, exemplos, papel do sistema e saída estruturada.'),
          aula('dlai-prompt', 'DeepLearning.AI: Prompt Engineering for Developers', 'https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/', 'Curso curto, de cerca de uma hora e meia, com exercícios em Python.'),
          entrega('entrega-prompts', 'Cinco prompts estruturados para um processo real', 'Escolha um processo do seu setor. Cada prompt com entrada, saída esperada em formato fixo e três casos de teste, um deles feito para quebrar.'),
          explica('explica-prompt', 'Qual é a diferença entre um prompt que funciona no seu teste e um prompt que você colocaria em produção?'),
        ],
      },
      {
        id: 'promessas',
        title: 'Ler promessa de fornecedor',
        problem: 'Um fornecedor anuncia "redução de 77% no tempo de análise". O que você pergunta antes de repetir esse número para a diretoria?',
        items: [
          entrega('entrega-ficha', 'Ficha de avaliação de uma métrica anunciada', 'Para um número real que você recebeu: quem mediu, em quantos casos, contra qual linha de base, em cliente identificável ou não, e o que acontece quando o modelo erra.'),
          explica('explica-promessas', 'O que separa um resultado medido de uma estimativa do próprio fornecedor, e por que essa diferença muda a decisão de compra?'),
        ],
      },
    ],
  },
  {
    id: 'fase2',
    num: 2,
    title: 'Construir: RAG, agentes e MCP',
    goal: 'Sair da leitura. O código desta fase é escrito em Python, no ambiente de verdade, fora deste caderno.',
    deliverable: 'Agente piloto, somente leitura, sobre dados de teste de um ERP.',
    modules: [
      {
        id: 'rag',
        title: 'Recuperação: dar ao modelo o que ele não viu',
        problem: 'O modelo não conhece os procedimentos internos da empresa. Como fazer ele responder com base no manual, e como saber que ele não inventou?',
        items: [
          lab('recuperacao'),
          pratica('pratica-rag', 'Um RAG mínimo em Python', 'Um manual em texto, cortado em trechos, com embeddings em um banco vetorial (pgvector serve) e dez perguntas com resposta conhecida para medir o acerto da busca.'),
          explica('explica-rag', 'Seu RAG respondeu errado. Como você descobre se o erro foi da busca ou do modelo?'),
        ],
      },
      {
        id: 'agentes',
        title: 'Agentes: quando o modelo age',
        problem: 'Qual é a diferença, em risco, entre um assistente que responde uma pergunta sobre o estoque e um agente que pode alterar um pedido?',
        items: [
          aula('hf-agents', 'Hugging Face: Agents Course', 'https://huggingface.co/learn/agents-course', 'Unidade 1 para o conceito; a unidade de LangGraph para orquestração.'),
          lab('agente'),
          pratica('pratica-agente', 'Um agente com duas ferramentas', 'Uma ferramenta de consulta e uma de cálculo. Registre cada chamada: o que o modelo pediu, o que a ferramenta devolveu e o que ele fez com isso.'),
          explica('explica-agentes', 'Por que "o agente herda as permissões do usuário" não é um controle de segurança?'),
        ],
      },
      {
        id: 'mcp',
        title: 'MCP: conectar o agente a um sistema',
        problem: 'Você quer que o assistente consulte o dicionário de dados do ERP. Qual é o menor acesso que resolve, e o que fica de fora de propósito?',
        items: [
          leitura('mcp-docs', 'Model Context Protocol: documentação', 'https://modelcontextprotocol.io', 'Arquitetura de host, cliente e servidor, e o guia de início rápido.'),
          aula('hf-mcp', 'Hugging Face: MCP Course', 'https://huggingface.co/learn/mcp-course', 'Curso gratuito para quem prefere seguir um roteiro.'),
          pratica('pratica-mcp', 'Um servidor MCP mínimo, somente leitura', 'Uma única ferramenta que consulta a estrutura de uma tabela em ambiente de teste. Sem escrita, sem credencial em texto puro, com registro de cada chamada.'),
          entrega('entrega-piloto', 'Agente piloto somente leitura', 'Escopo estreito, dados de teste, e uma página dizendo o que ele faz, o que não faz e como desligar.'),
          explica('explica-mcp', 'O que um servidor MCP de terceiros poderia fazer de errado sem que você percebesse, e como você reduziria isso?'),
        ],
      },
    ],
  },
  {
    id: 'fase3',
    num: 3,
    title: 'Governar: segurança e conformidade',
    goal: 'Transformar norma em decisão: quem pode o quê, com qual registro e quem aprova. Corre junto com a fase 2.',
    deliverable: 'Rascunho de política de governança de agentes de IA.',
    modules: [
      {
        id: 'risco',
        title: 'Risco: nomear antes de construir',
        problem: 'A diretoria quer "IA em tudo, o quanto antes". Que perguntas precisam de resposta antes do primeiro agente entrar em produção?',
        items: [
          leitura('nist-rmf', 'NIST AI Risk Management Framework', 'https://www.nist.gov/itl/ai-risk-management-framework', 'As quatro funções: governar, mapear, medir e gerir. Use como roteiro de perguntas, não como texto para decorar.'),
          entrega('entrega-escopo', 'Uma página de escopo', 'Caso de uso nomeado e mensurável, o que o agente pode fazer sem humano, o que nunca pode, e quais dados ele toca.'),
          explica('explica-risco', 'Por que fechar o escopo antes de escolher a ferramenta economiza mais do que qualquer otimização técnica?'),
        ],
      },
      {
        id: 'seguranca',
        title: 'Segurança de aplicações com LLM',
        problem: 'Um agente lê e-mails de clientes, consulta títulos em aberto e pode propor desconto. O que um e-mail malicioso consegue fazer com ele?',
        items: [
          leitura('owasp-llm', 'OWASP Top 10 para aplicações com LLM', 'https://genai.owasp.org/llm-top-10/', 'Leia como lista de verificação: para cada item, onde ele apareceria no seu piloto.'),
          lab('permissao'),
          entrega('entrega-checklist', 'Lista de verificação antes de ligar um conector', 'Menor privilégio, perfil próprio do agente, aprovação humana em ação financeira ou irreversível, registro de auditoria e tratamento de todo conteúdo externo como dado, nunca como instrução.'),
          explica('explica-seguranca', 'Entrada não confiável, acesso a dado sensível e capacidade de agir: por que as três juntas são o problema, e qual delas você corta primeiro?'),
        ],
      },
      {
        id: 'dados',
        title: 'Dados pessoais e normas',
        problem: 'O agente vai consultar cadastro de clientes e fornecedores. Quais campos ele realmente precisa, e quem aprova esse acesso?',
        items: [
          leitura('lgpd', 'LGPD: Lei 13.709/2018', 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm', 'Artigo 6º: finalidade, necessidade e responsabilização. É de onde sai a regra de minimização.'),
          leitura('iso-42001', 'ISO/IEC 42001: visão geral', 'https://www.iso.org/standard/42001', 'Sistema de gestão de IA. Basta a visão geral: a certificação é assunto de auditoria externa.'),
          entrega('entrega-politica', 'Rascunho de política de governança de agentes', 'Perfil dedicado por agente, aprovação humana obrigatória onde o erro custa caro, registro de auditoria e o encarregado de dados como aprovador de qualquer conector que toque dado pessoal.'),
          explica('explica-dados', 'O que é minimização de dados, aplicada a um agente que só precisa saber se um pedido já foi faturado?'),
        ],
      },
    ],
  },
  {
    id: 'fase4',
    num: 4,
    title: 'Levar para as pessoas',
    goal: 'Treinar quem vai usar e alinhar expectativa com o que a tecnologia entrega de fato.',
    deliverable: 'Plano de capacitação por papel e material mínimo de apoio.',
    modules: [
      {
        id: 'capacitacao',
        title: 'Capacitação e gestão de expectativa',
        problem: 'Metade da equipe espera mágica e a outra metade espera ser substituída. O que cada grupo precisa ouvir, e ver funcionando, na primeira sessão?',
        items: [
          entrega('entrega-treinamento', 'Plano de treinamento por papel', 'Quem opera, quem aprova e quem só consulta: o que cada um precisa saber fazer ao sair da sala.'),
          entrega('entrega-apoio', 'Material mínimo de apoio', 'Perguntas frequentes, o que fazer quando o agente erra e um canal para avisar.'),
          explica('explica-capacitacao', 'Como você explicaria, em um minuto, o que o assistente faz bem, o que ele faz mal e quando chamar uma pessoa?'),
        ],
      },
    ],
  },
];

/** Todos os itens, com a fase e o módulo a que pertencem. */
export const allItems = () =>
  PHASES.flatMap((phase) => phase.modules.flatMap((module) => module.items.map((item) => ({ phase, module, item }))));
