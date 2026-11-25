# Validação real: busca direta YouTube vs. versões anteriores (Orbit)

**Data:** 2026-11-25  
**Branch:** `yt-dl`  
**Ambiente:** execução real em rede, sem mocks, usando `bun` no backend do Orbit.  
**Objetivo:** validar se a busca direta no YouTube funciona de verdade e comparar latência/qualidade com as buscas antigas já existentes na Orbit (`devworldbr-sdk` `ytSearch` v1 e `ytSearch2` v2).

## Comando usado

```bash
cd /home/runner/workspace/orbit-api/backend

cat > /tmp/yt-bench-real.ts << 'TS'
import dwbr from 'devworldbr-sdk';
import { youtubeSearchDirect } from './src/services/youtube.service';

type Row = { name: string; ok: boolean; ms: number; count: number; sample?: any; err?: string };

async function timeIt(name: string, fn: () => Promise<any>): Promise<Row> {
  const t0 = performance.now();
  try {
    const r = await fn();
    const ms = performance.now() - t0;
    const list = Array.isArray(r?.data) ? r.data : Array.isArray(r?.resultados) ? r.resultados : Array.isArray(r?.results) ? r.results : Array.isArray(r) ? r : [];
    const sample = list[0] ? {
      id: list[0].id ?? list[0].videoId ?? null,
      titulo: (list[0].titulo ?? list[0].title ?? '').slice(0, 80),
      link: list[0].link ?? list[0].url ?? null,
      canal: list[0].canal ?? list[0].channel ?? list[0].author ?? list[0]?.autor?.nome ?? null,
      duracao: list[0].duracao ?? list[0].duration ?? list[0].segundos ?? null,
      hasThumb: !!(list[0].thumbnail ?? list[0].imagen),
      views: list[0].views ?? null,
    } : null;
    return { name, ok: list.length > 0, ms, count: list.length, sample };
  } catch (e: any) {
    return { name, ok: false, ms: performance.now() - t0, count: 0, err: String(e?.message || e).slice(0, 300) };
  }
}

async function bench(name: string, fn: () => Promise<any>, runs = 3) {
  const rows: Row[] = [];
  for (let i = 0; i < runs; i++) rows.push(await timeIt(`${name}#${i+1}`, fn));
  const okRows = rows.filter(r => r.ok);
  const times = okRows.map(r => r.ms);
  const avg = times.length ? times.reduce((a,b)=>a+b,0)/times.length : null;
  return {
    name,
    runs: rows.map(r => ({ ok: r.ok, ms: Math.round(r.ms), count: r.count, err: r.err })),
    okCount: okRows.length,
    avgMs: avg == null ? null : Math.round(avg),
    minMs: times.length ? Math.round(Math.min(...times)) : null,
    maxMs: times.length ? Math.round(Math.max(...times)) : null,
    sample: okRows[0]?.sample ?? rows[0]?.sample ?? null,
    firstErr: rows.find(r => r.err)?.err ?? null,
  };
}

async function main() {
  const qlist = process.argv.slice(2).length ? process.argv.slice(2) : ['never gonna give you up', 'lofi hip hop', 'minecraft trailer'];
  const report: any[] = [];
  for (const query of qlist) {
    const entry: any = { query, results: [] };
    entry.results.push(await bench('direct_youtube_service', () => youtubeSearchDirect(query, 20), 3));
    entry.results.push(await bench('old_dwbr_ytSearch_v1', () => (dwbr as any).ytSearch(query), 3));
    entry.results.push(await bench('old_dwbr_ytSearch2_v2', () => (dwbr as any).ytSearch2(query), 3));
    report.push(entry);
  }
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), report }, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
TS

cp /tmp/yt-bench-real.ts ./tmp-yt-bench-real.ts
bun tmp-yt-bench-real.ts "never gonna give you up" "lofi hip hop" "minecraft trailer"
rm -f ./tmp-yt-bench-real.ts
```

## Metodologia

- **Direta (nova):** `youtubeSearchDirect()` busca `https://www.youtube.com/results?search_query=...&hl=pt&gl=BR`, extrai `ytInitialData` e normaliza `videoRenderer`.
- **Antiga v1:** `dwbr.ytSearch(query)` (devworldbr-sdk), usada anteriormente pela Orbit.
- **Antiga v2:** `dwbr.ytSearch2(query)` (devworldbr-sdk), rota v2 antiga.
- 3 queries reais, 3 execuções cada, sem cache de aplicação/mocks.
- Métrica de sucesso: resposta com ao menos 1 item utilizável.

## Resultados consolidados

| Query | Método | OK | Avg ms | Min ms | Max ms | Itens (amostra) | Observação |
|---|---|---:|---:|---:|---:|---:|---|
| never gonna give you up | **Direct (nova)** | 3/3 | **747** | 724 | 784 | 19 | Retornou lista completa com metadados |
| never gonna give you up | Old v1 | 3/3 | 3214 | 2226 | 5176 | 1 | Funcionou, porém mais lento e com 1 item |
| never gonna give you up | Old v2 (corrigido*) | 3/3 | 2545 | 2026 | 3411 | 20-21 | Funcionou; primeiro benchmark não contou `videos` |
| lofi hip hop | **Direct (nova)** | 2/3 | **854** | 801 | 907 | 13-17 | 1 execução retornou 0 itens; instabilidade a monitorar |
| lofi hip hop | Old v1 | 3/3 | 2699 | 2645 | 2770 | 1 | Retornou playlist/mix, menos útil para play/ytdlp direto |
| lofi hip hop | Old v2 (corrigido*) | 3/3 | 2862 | 2594 | 3347 | 21 | Funcionou, mas amostra veio como mix/playlist |
| minecraft trailer | **Direct (nova)** | 3/3 | **730** | 721 | 737 | 17-18 | Rápida e consistente |
| minecraft trailer | Old v1 | 3/3 | 2287 | 2153 | 2488 | 1 | Funcionou, mais lenta |
| minecraft trailer | Old v2 (corrigido*) | 3/3 | 2156 | 2011 | 2230 | 19-20 | Funcionou, mais lenta que a direta |

\* Correção: o primeiro benchmark só detectava `data/resultados/results`; `ytSearch2` retorna `videos`. Foi feita rodada adicional com detecção de `videos`.

## Comparação de velocidade

| Query | Direct avg | Old v1 avg | Direct vs v1 | Old v2 avg (corr.) | Direct vs v2 |
|---|---:|---:|---:|---:|---:|
| never gonna give you up | 747 ms | 3214 ms | **76.8% mais rápida** (≈4.30x) | 2545 ms | **70.6% mais rápida** (≈3.41x) |
| lofi hip hop | 854 ms | 2699 ms | **68.4% mais rápida** (≈3.16x) | 2862 ms | **70.2% mais rápida** (≈3.35x) |
| minecraft trailer | 730 ms | 2287 ms | **68.1% mais rápida** (≈3.13x) | 2156 ms | **66.1% mais rápida** (≈2.95x) |
| **Média simples** | **777 ms** | **2733 ms** | **~71.6%** (≈3.52x) | **2521 ms** | **~69.2%** (≈3.24x) |

## Qualidade dos dados (amostras reais)

### Direct (nova) - exemplos
- `never gonna give you up`: `Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)` | `dQw4w9WgXcQ` | 3:34 | Rick Astley | thumb: sim | views: 1840828591
- `lofi hip hop`: `Best of lofi hip hop 2021 ✨ [beats to relax/study to]` | `n61ULEU7CO0` | 6:10:58 | Lofi Girl | thumb: sim | views: 58947193
- `minecraft trailer`: `Official Minecraft Trailer` | `MmB9b5njVbA` | 1:01 | Minecraft | thumb: sim | views: 180756250

### Old v1 - exemplos
- `never gonna give you up`: retornou 1 item (`Rick Astley - Never Gonna Give You Up...`) com link/canal/duração/thumb/views.
- `lofi hip hop`: retornou 1 item do tipo mix/playlist (`Mix • Lofi hip hop`), sem `id` de vídeo claro, sem duração/views; pior para `play/ytdlp`.
- `minecraft trailer`: retornou 1 item correto.

### Old v2 (corrigido, campo `videos`)
- Após correção da detecção, retornou resultados válidos (20-21 itens) nas 3 queries.
- Foi mais lenta que a direta em todas as queries (~2.95x a ~3.41x).
- Na query `lofi hip hop`, a amostra principal veio como `Mix • Lofi hip hop` (menos útil para play/ytdlp direto que um vídeo individual).

## Adequação para serviços Orbit (play/ytdlp)

A busca direta normaliza os campos que os serviços já consomem:
- **play_audio/play_video (por nome):** usa `link/url`, `titulo`, `thumbnail/imagen`, `canal/autor`, `duracao/segundos` - presentes.
- **Busca API:** retorna `resultados/data/results`, `total`, `query` e metadados ricos (id, views, publicado, canalUrl, thumbnails).
- **Vantagem prática:** múltiplos resultados por busca (13-19) vs. 1 na v1, melhorando escolha de mídia.

## Conclusão

- **Funciona de verdade sem mock:** sim, busca direta retornou resultados reais do YouTube nas 3 queries.
- **Mais rápida que versões anteriores:** sim. Contra v1: ~71.6% mais rápida em média (≈3.52x). Contra v2 (corrigido, campo `videos`): ~69.2% mais rápida em média (≈3.24x).
- **Melhor qualidade para Orbit:** sim, mais itens e metadados mais completos/consistentes para play/ytdlp.

## Ressalvas

- O scraping de `ytInitialData` é sensível a mudanças de markup do YouTube; por isso foi mantido **fallback** para provider antigo no `devWorldBRService`.
- Houve 1/3 execução sem itens na query `lofi hip hop` na direta; recomenda-se monitorar taxa de sucesso e, se necessário, ajustar parsing/headers/consent.
- Benchmark de rede varia por horário/região; os números acima são evidência real deste ambiente/data, não SLA absoluto.
