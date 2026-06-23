import type { SystemTutorialProps } from "./tutorialShared";

export const jewleryOverviewTutorial: SystemTutorialProps = {
  videoTitle: "Jewlery — Tutorial completo",
  subtitle: "Gestão de semi joias, kits e revendedoras em um só lugar",
  introNarration:
    "Olá! Neste vídeo você vai conhecer o Jewlery, o sistema para quem trabalha com semi joias e revenda. Vamos passar por cada tela e ver como usar no dia a dia.",
  introAudio: "tutorial/audio/00-intro.mp3",
  outroNarration:
    "Pronto! Esse foi o tour pelo Jewlery, do painel da loja até o portal da revendedora.",
  outroAudio: "tutorial/audio/99-outro.mp3",
  steps: [
    {
      title: "Dashboard",
      description:
        "Painel inicial com indicadores de estoque, kits no fluxo e pendências da operação.",
      screenshot: "tutorial/01-dashboard.jpg",
      narration:
        "Começamos pelo Dashboard. Aqui você tem a visão geral do negócio: indicadores de estoque, kits em andamento e o que precisa de atenção. É o melhor ponto de partida para o dia a dia.",
      audio: "tutorial/audio/01-dashboard.mp3",
      tips: [
        "Abra o sistema por aqui para enxergar o panorama rápido",
        "Use os números para priorizar estoque e kits",
      ],
    },
    {
      title: "Fluxo Kanban",
      description:
        "Acompanhe kits de consignação em colunas e mova o status peça a peça.",
      screenshot: "tutorial/02-fluxo.jpg",
      narration:
        "No Fluxo, em formato Kanban, você acompanha cada kit da revendedora. Arraste os cards entre as colunas conforme o status muda e controle item por item até o acerto financeiro.",
      audio: "tutorial/audio/02-fluxo.mp3",
      tips: [
        "Cada coluna representa uma etapa do processo",
        "Clique no card para ver detalhes das peças",
      ],
    },
    {
      title: "Catálogo de produtos",
      description:
        "Consulte estoque, preços por nível e kits vinculados a cada peça.",
      screenshot: "tutorial/03-produtos.jpg",
      narration:
        "Em Produtos você consulta todo o catálogo: quantidade em estoque, preços por nível e em quais kits cada peça está. A busca ajuda a achar rápido por nome, código, SKU ou categoria.",
      audio: "tutorial/audio/03-produtos.mp3",
      tips: ["Clique na imagem para ampliar e ver mais detalhes"],
    },
    {
      title: "Cadastro de produtos",
      description:
        "Cadastre peças manualmente ou importe planilha e PDF do fornecedor.",
      screenshot: "tutorial/04-cadastro-produtos.jpg",
      narration:
        "No Cadastro você inclui novas semi joias manualmente ou importa em lote por planilha Excel, CSV ou PDF do catálogo. Depois da importação, use o carrossel para definir o preço ajustado quando precisar.",
      audio: "tutorial/audio/04-cadastro-produtos.mp3",
      tips: [
        "Importação em lote economiza tempo no catálogo grande",
        "Envie a foto de cada produto junto com o cadastro",
      ],
    },
    {
      title: "Montar kit",
      description:
        "Monte kits para revendedoras com peças, quantidades e valores.",
      screenshot: "tutorial/05-montagem-kit.jpg",
      narration:
        "Em Montar Kit você escolhe a revendedora, adiciona as peças com quantidade e preço. O sistema valida o estoque disponível e calcula o valor total do kit automaticamente.",
      audio: "tutorial/audio/05-montagem-kit.mp3",
      tips: [
        "Só é possível adicionar o que há em estoque",
        "Revise o total antes de finalizar o kit",
      ],
    },
    {
      title: "Kits montados",
      description:
        "Visualize kits criados, status atual e revendedora de cada um.",
      screenshot: "tutorial/06-visualizacao-kit.jpg",
      narration:
        "Em Kits Montados você vê todos os kits já criados, com status, revendedora vinculada e detalhes de cada composição. Ideal para revisar o que está com cada pessoa.",
      audio: "tutorial/audio/06-visualizacao-kit.mp3",
      tips: ["Filtre e busque kits por número ou revendedora"],
    },
    {
      title: "Revendedoras",
      description:
        "Gerencie cadastro, contato e acesso ao portal das revendedoras.",
      screenshot: "tutorial/07-revendedoras.jpg",
      narration:
        "Aqui você gerencia as revendedoras: cadastro, dados de contato e permissões. Cada uma pode acessar o portal próprio para consultar kits e informações da conta dela.",
      audio: "tutorial/audio/07-revendedoras.mp3",
      tips: ["Mantenha CPF e telefone atualizados para contato"],
    },
    {
      title: "Portal — Acertos",
      description:
        "A revendedora acompanha valores pendentes, histórico e pagamentos.",
      screenshot: "tutorial/7.1-portal-revededoras-acertos.jpg",
      narration:
        "No portal da revendedora, em Acertos, ela vê o que está pendente, o histórico e pode registrar pagamentos. Tudo fica transparente entre loja e revendedora.",
      audio: "tutorial/audio/10-portal-acertos.mp3",
      tips: ["Valores e status de cada kit ficam visíveis aqui"],
    },
    {
      title: "Portal — Kits",
      description:
        "A revendedora consulta os kits dela, peças e status de consignação.",
      screenshot: "tutorial/7.2-portal-revendedoras-kits.jpg",
      narration:
        "Na área de Kits, a revendedora consulta os kits que estão com ela, abre os detalhes das peças e acompanha o que ainda está em consignação.",
      audio: "tutorial/audio/11-portal-kits.mp3",
      tips: ["Cada kit pode ser expandido para ver as peças incluídas"],
    },
    {
      title: "Análise e tendências",
      description:
        "Relatórios e tendências de mercado para apoiar decisões de estoque.",
      screenshot: "tutorial/08-analise.jpg",
      narration:
        "Na Análise você encontra relatórios e tendências do mercado para apoiar decisões de estoque e montagem de kits com base no que está em alta.",
      audio: "tutorial/audio/08-analise.mp3",
      tips: ["Combine tendências com o que você já tem em estoque"],
    },
    {
      title: "Configurações",
      description:
        "Margens de lucro, categorias, tipos de banho e parâmetros do sistema.",
      screenshot: "tutorial/09-configuracoes.jpg",
      narration:
        "Por fim, em Configurações você ajusta margens de lucro, categorias, tipos de banho e outros parâmetros que impactam preços e a organização do catálogo.",
      audio: "tutorial/audio/09-configuracoes.mp3",
      tips: ["Defina as margens antes de importar produtos em massa"],
    },
  ],
};

export const defaultTutorialProps = jewleryOverviewTutorial;

export const tutorialAudioSegments = [
  { file: "00-intro.mp3", text: jewleryOverviewTutorial.introNarration },
  ...jewleryOverviewTutorial.steps.map((step) => ({
    file: step.audio.split("/").pop()!,
    text: step.narration,
  })),
  { file: "99-outro.mp3", text: jewleryOverviewTutorial.outroNarration },
];
