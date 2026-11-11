// Desafios do laboratório: validadores puros sobre o estado.
// check(ctx) → { done, progress ∈ [0,1], live? }   ctx = { s, d }  (d = s.derived)
import { pct, num } from '../util.js';

export const context = (s) => ({ s, d: s.derived });
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export const LLM_CHALLENGES = [
  {
    id: 'janela',
    title: 'O modelo só olha para a janela',
    type: 'quiz',
    desc: 'Com contexto de 1 token, o que o modelo consulta para escolher o próximo token?',
    hints: ['Olhe a ficha “O que o modelo viu”: quantos tokens aparecem ali?', 'É a mesma regra do Laboratório de Markov: o próximo passo depende só de onde se está agora.'],
    quiz: () => ({
      options: [
        { label: 'A frase inteira escrita até agora', why: 'Ele não enxerga a frase inteira. Veja na ficha ao lado quais tokens ele realmente usou.' },
        { label: 'Só o último token', correct: true },
        { label: 'O texto de treino, relido a cada passo', why: 'O texto foi lido uma vez, para contar. Depois disso o modelo consulta só a tabela de contagens.' },
      ],
    }),
    success: 'Com janela de 1 token, o modelo é uma cadeia de Markov: cada token é um estado e o próximo depende só do atual.',
  },
  {
    id: 'deterministico',
    title: 'Mesma entrada, mesma saída',
    desc: 'Leve a temperatura a 0 e gere a frase duas vezes, trocando a semente entre uma e outra.',
    hints: ['A temperatura fica na barra abaixo do texto.', 'Clique em “Gerar frase”, depois em “Nova semente” e gere de novo: mudou alguma coisa?'],
    check: ({ s }) => {
      const cold = s.settings.temperature === 0;
      const runs = s.flags.coldRuns;
      return {
        done: cold && runs >= 2,
        progress: (cold ? 0.4 : 0) + 0.3 * Math.min(2, runs),
        live: cold ? `${plural(runs, 'frase gerada', 'frases geradas')} de 2` : `temperatura em ${num(s.settings.temperature, 1)}`,
      };
    },
    success: 'Com temperatura 0 não há sorteio: vence sempre o mais provável, e a semente deixa de importar. É o ajuste para classificar, extrair e conferir.',
  },
  {
    id: 'surpresa',
    title: 'Aumente a surpresa',
    desc: 'Agora o contrário: temperatura em 1,5 ou mais e duas frases geradas.',
    hints: ['Suba a temperatura e veja as barras ficarem mais parecidas entre si.', 'Compare as frases com a do desafio anterior: qual você colocaria num relatório?'],
    check: ({ s }) => {
      const hot = s.settings.temperature >= 1.5;
      const runs = s.flags.hotRuns;
      return {
        done: hot && runs >= 2,
        progress: 0.4 * Math.min(1, s.settings.temperature / 1.5) + 0.3 * Math.min(2, runs),
        heat: Math.min(1, s.settings.temperature / 1.5),
        live: hot ? `${plural(runs, 'frase gerada', 'frases geradas')} de 2` : `temperatura em ${num(s.settings.temperature, 1)}`,
      };
    },
    success: 'Temperatura alta dá chance ao improvável: mais variedade, mais frases que nunca existiram e mais erro. Serve para rascunho, não para registro.',
  },
  {
    id: 'nucleo',
    title: 'Corte a cauda',
    desc: 'Num ponto do texto com 4 ou mais opções, ajuste o top-p até sobrarem exatamente 2 tokens no sorteio.',
    hints: ['Apague o texto gerado: logo depois do começo costuma haver várias opções.', 'Abaixe o top-p devagar e conte as barras que continuam coloridas.'],
    check: ({ s, d }) => {
      const enough = d.dist.length >= 4;
      const cut = s.settings.topP < 1;
      return {
        done: enough && cut && d.kept === 2,
        progress: !enough ? 0 : d.kept === 2 && cut ? 1 : 1 / (1 + Math.abs(d.kept - 2)),
        live: enough ? `${plural(d.kept, 'token', 'tokens')} no sorteio, de ${d.dist.length}` : 'este ponto do texto tem menos de 4 opções',
      };
    },
    success: 'O top-p corta a cauda de opções improváveis, que é de onde vêm os absurdos, sem deixar o modelo determinístico.',
  },
  {
    id: 'inventa',
    title: 'Faça o modelo inventar',
    desc: 'Escreva um começo que termine numa palavra que o texto de treino não tem.',
    hints: ['Digite no campo “Comece com” uma palavra de outro assunto.', 'Repare que o modelo não avisa que não sabe: ele responde do mesmo jeito.'],
    check: ({ s, d }) => {
      const hasPrompt = d.prompt.length > 0;
      const unknown = hasPrompt && s.steps.length === 0 && d.seen.used === 0;
      return {
        done: unknown,
        progress: unknown ? 1 : hasPrompt ? 0.3 : 0,
        live: hasPrompt ? `o modelo reconheceu ${plural(d.seen.used, 'token', 'tokens')} do contexto` : 'digite um começo',
      };
    },
    success: 'Sem nunca ter visto o contexto, ele chuta pelo que é frequente e segue em frente com a mesma segurança. Num LLM grande o mecanismo é esse, só mais convincente. É por isso que se entrega o documento certo junto com a pergunta.',
  },
  {
    id: 'recita',
    title: 'Mais contexto, mais cópia',
    desc: 'Use contexto de 3 tokens, gere uma frase e observe a medida “cópia do texto”.',
    hints: ['O tamanho do contexto fica na barra abaixo do texto.', 'Com a janela maior, quantos caminhos diferentes ainda existem em cada ponto?'],
    check: ({ s, d }) => {
      const wide = s.settings.order === 3;
      const measured = d.copied !== null;
      return {
        done: wide && measured && d.copied >= 0.8,
        progress: (wide ? 0.5 : 0) + (measured ? 0.5 * Math.min(1, d.copied / 0.8) : 0),
        live: !wide ? `contexto de ${s.settings.order}` : measured ? `${pct(d.copied, 0)} do que foi gerado é cópia` : 'gere uma frase',
      };
    },
    success: 'Janela maior deixa o texto coerente, mas com pouco texto de treino sobra um caminho só: o modelo recita. Para generalizar com contexto longo é preciso muito mais texto e uma rede no lugar da tabela.',
  },
  {
    id: 'ponte',
    title: 'Veja a cadeia',
    desc: 'Volte para contexto de 1 token e abra o modelo no Laboratório de Markov.',
    hints: ['O botão fica na ficha “A mesma coisa, como cadeia de Markov”.'],
    check: ({ s }) => ({
      done: s.flags.bridged,
      progress: s.flags.bridged ? 1 : s.settings.order === 1 ? 0.5 : 0,
      live: s.settings.order === 1 ? 'pronto para abrir' : `contexto de ${s.settings.order}: volte para 1`,
    }),
    success: 'Os potes do diagrama são os tokens mais frequentes, e as setas são as contagens. Tudo que você aprendeu sobre cadeias vale aqui.',
  },
];

export const byId = Object.fromEntries(LLM_CHALLENGES.map((c) => [c.id, c]));
