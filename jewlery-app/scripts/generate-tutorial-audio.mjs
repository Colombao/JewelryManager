import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "..", "public", "tutorial", "audio");
const VOICE = "pt-BR-FranciscaNeural";

const segments = [
  {
    file: "00-intro.mp3",
    text: "Olá! Neste vídeo você vai conhecer o Jewlery, o sistema para quem trabalha com semi joias e revenda. Vamos passar por cada tela e ver como usar no dia a dia.",
  },
  {
    file: "01-dashboard.mp3",
    text: "Começamos pelo Dashboard. Aqui você tem a visão geral do negócio: indicadores de estoque, kits em andamento e o que precisa de atenção. É o melhor ponto de partida para o dia a dia.",
  },
  {
    file: "02-fluxo.mp3",
    text: "No Fluxo, em formato Kanban, você acompanha cada kit da revendedora. Arraste os cards entre as colunas conforme o status muda e controle item por item até o acerto financeiro.",
  },
  {
    file: "03-produtos.mp3",
    text: "Em Produtos você consulta todo o catálogo: quantidade em estoque, preços por nível e em quais kits cada peça está. A busca ajuda a achar rápido por nome, código, SKU ou categoria.",
  },
  {
    file: "04-cadastro-produtos.mp3",
    text: "No Cadastro você inclui novas semi joias manualmente ou importa em lote por planilha Excel, CSV ou PDF do catálogo. Depois da importação, use o carrossel para definir o preço ajustado quando precisar.",
  },
  {
    file: "05-montagem-kit.mp3",
    text: "Em Montar Kit você escolhe a revendedora, adiciona as peças com quantidade e preço. O sistema valida o estoque disponível e calcula o valor total do kit automaticamente.",
  },
  {
    file: "06-visualizacao-kit.mp3",
    text: "Em Kits Montados você vê todos os kits já criados, com status, revendedora vinculada e detalhes de cada composição. Ideal para revisar o que está com cada pessoa.",
  },
  {
    file: "07-revendedoras.mp3",
    text: "Aqui você gerencia as revendedoras: cadastro, dados de contato e permissões. Cada uma pode acessar o portal próprio para consultar kits e informações da conta dela.",
  },
  {
    file: "10-portal-acertos.mp3",
    text: "No portal da revendedora, em Acertos, ela vê o que está pendente, o histórico e pode registrar pagamentos. Tudo fica transparente entre loja e revendedora.",
  },
  {
    file: "11-portal-kits.mp3",
    text: "Na área de Kits, a revendedora consulta os kits que estão com ela, abre os detalhes das peças e acompanha o que ainda está em consignação.",
  },
  {
    file: "08-analise.mp3",
    text: "Na Análise você encontra relatórios e tendências do mercado para apoiar decisões de estoque e montagem de kits com base no que está em alta.",
  },
  {
    file: "09-configuracoes.mp3",
    text: "Por fim, em Configurações você ajusta margens de lucro, categorias, tipos de banho e outros parâmetros que impactam preços e a organização do catálogo.",
  },
  {
    file: "99-outro.mp3",
    text: "Pronto! Esse foi o tour pelo Jewlery, do painel da loja até o portal da revendedora.",
  },
];

async function synthesize(text, outputPath) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = await tts.toStream(text);
  await pipeline(audioStream, createWriteStream(outputPath));
  tts.close();
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  console.log(`Gerando narração em pt-BR (${VOICE})...\n`);

  for (const segment of segments) {
    const outputPath = path.join(OUTPUT_DIR, segment.file);
    process.stdout.write(`→ ${segment.file}... `);
    await synthesize(segment.text, outputPath);
    console.log("ok");
  }

  console.log(`\n${segments.length} arquivos salvos em public/tutorial/audio/`);
}

main().catch((error) => {
  console.error("Falha ao gerar áudio:", error);
  process.exit(1);
});
