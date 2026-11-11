// Textos de treino prontos. Curtos de propósito: dá para ler tudo e conferir a contagem à mão.
// Os dois primeiros falam de rotinas de uma indústria com ERP, sem dados de empresa nenhuma.

export const CORPORA = {
  pedidos: {
    title: 'Vida de um pedido',
    about: 'Frases sobre o caminho de um pedido, do cadastro à entrega.',
    prompt: 'o pedido foi',
    text: `O pedido foi criado pelo vendedor.
O pedido foi enviado para análise de crédito.
O pedido foi aprovado pelo financeiro.
O pedido foi aprovado pelo financeiro e seguiu para a separação.
O pedido foi recusado pelo financeiro.
O pedido foi recusado por falta de limite de crédito.
O pedido foi separado pelo estoque.
O pedido foi separado e seguiu para o faturamento.
O pedido foi faturado e a nota foi emitida.
O pedido foi faturado e seguiu para a expedição.
O pedido foi entregue ao cliente.
O pedido foi entregue com atraso.
O pedido foi cancelado pelo cliente.
O pedido foi cancelado por falta de estoque.
A nota foi emitida pelo faturamento.
A nota foi emitida e o pedido foi entregue.
A nota foi rejeitada por erro no cadastro do cliente.
A nota foi cancelada pelo faturamento.
O cliente foi cadastrado pelo vendedor.
O cliente foi bloqueado por falta de pagamento.
O cliente foi bloqueado pelo financeiro.
O cliente pagou o título com atraso.
O cliente pagou o título e o pedido foi liberado.
O título foi pago pelo cliente.
O título foi protestado por falta de pagamento.
O título foi renegociado pelo financeiro.
O estoque foi conferido pelo almoxarifado.
O estoque foi ajustado depois do inventário.
A separação foi concluída pelo estoque.
A expedição foi concluída e o pedido foi entregue ao cliente.`,
  },
  chamados: {
    title: 'Chamados de suporte',
    about: 'Como as pessoas descrevem problemas para a equipe de sistemas.',
    prompt: 'o sistema',
    text: `O sistema travou ao emitir a nota.
O sistema travou ao gerar o relatório.
O sistema ficou lento depois da atualização.
O sistema ficou lento ao abrir o cadastro de clientes.
O sistema não permite alterar o pedido.
O sistema não permite cancelar a nota.
O sistema não permite incluir o cliente.
O usuário não consegue acessar o relatório.
O usuário não consegue acessar o sistema.
O usuário não consegue emitir a nota.
O usuário não consegue alterar o cadastro.
O usuário esqueceu a senha.
O usuário pediu acesso ao módulo financeiro.
O usuário pediu acesso ao relatório de vendas.
O relatório não mostra os pedidos de ontem.
O relatório não mostra o saldo do cliente.
O relatório mostra valores diferentes do financeiro.
O relatório demora muito para abrir.
A nota não foi transmitida.
A nota foi rejeitada por erro no cadastro.
A nota não aparece no relatório de vendas.
A impressora não imprime a nota.
A impressora não imprime o relatório.
O cadastro do cliente está duplicado.
O cadastro do produto está sem o código fiscal.
O saldo do estoque está diferente do inventário.
O saldo do cliente não foi atualizado.
A rotina de fechamento não terminou.
A rotina de fechamento demora muito depois da atualização.
A integração com o banco não importou os pagamentos.`,
  },
  proverbios: {
    title: 'Provérbios',
    about: 'Frases curtas que todo mundo conhece: fica fácil notar quando o modelo recita e quando mistura.',
    prompt: 'quem',
    text: `Quem tudo quer tudo perde.
Quem não arrisca não petisca.
Quem semeia vento colhe tempestade.
Quem com ferro fere com ferro será ferido.
Quem espera sempre alcança.
Quem canta seus males espanta.
Quem não tem cão caça com gato.
Quem ri por último ri melhor.
Quem avisa amigo é.
Quem cala consente.
Quem procura acha.
Quem vê cara não vê coração.
Quem não chora não mama.
Quem muito fala pouco acerta.
Quem planta colhe.
Água mole em pedra dura tanto bate até que fura.
De grão em grão a galinha enche o papo.
Mais vale um pássaro na mão do que dois voando.
A pressa é inimiga da perfeição.
Devagar se vai ao longe.
Cada macaco no seu galho.
Em terra de cego quem tem um olho é rei.
Casa de ferreiro espeto de pau.
O barato sai caro.
Nem tudo que reluz é ouro.
Depois da tempestade vem a bonança.
Antes tarde do que nunca.
Não deixe para amanhã o que pode fazer hoje.
Quem não deve não teme.
Quem tem pressa come cru.`,
  },
};

export const DEFAULT_CORPUS = 'pedidos';
export const CUSTOM_CORPUS = 'meu';
