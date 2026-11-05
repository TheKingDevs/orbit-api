const PAGE = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Orbit TTP Preview</title>
  <style>
    :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #070b14; color: #e5e7eb; }
    main { max-width: 1100px; margin: 0 auto; padding: 32px 20px 64px; }
    h1 { font-size: 26px; margin: 0 0 6px; }
    p { color: #94a3b8; line-height: 1.5; }
    .grid { display: grid; grid-template-columns: 340px 1fr; gap: 24px; align-items: start; }
    .panel { background: #101828; border: 1px solid #1f2a44; border-radius: 16px; padding: 18px; }
    label { display: block; font-size: 13px; color: #cbd5e1; margin: 14px 0 6px; }
    textarea, input, select, button { width: 100%; border-radius: 10px; border: 1px solid #26324d; background: #0b1220; color: #f8fafc; padding: 10px 12px; font: inherit; }
    textarea { min-height: 96px; resize: vertical; }
    input[type="color"] { height: 44px; padding: 4px; }
    button { margin-top: 18px; background: #6366f1; border-color: #6366f1; font-weight: 700; cursor: pointer; }
    button:hover { background: #4f46e5; }
    .card { width: 512px; max-width: 100%; aspect-ratio: 1 / 1; display: flex; align-items: center; padding: 40px; border-radius: 16px; overflow: hidden; }
    .card span { display: block; width: 100%; font-weight: 700; line-height: 1.2; white-space: pre-wrap; overflow-wrap: anywhere; }
    .result { margin-top: 18px; }
    .result img { width: 100%; border-radius: 12px; border: 1px solid #26324d; }
    a { color: #a5b4fc; }
    .hint { font-size: 12px; color: #64748b; margin-top: 8px; }
    @media (max-width: 860px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main>
    <h1>Orbit TTP Preview</h1>
    <p>Pré-visualização 512x512 usando <strong>html-to-image</strong> no navegador. A API entrega o mesmo card em PNG pelo endpoint <code>/api/canvas/ttp</code>.</p>
    <div class="grid">
      <section class="panel">
        <label for="text">Texto</label>
        <textarea id="text">Olá mundo 🎉🚀</textarea>
        <label for="textColor">Cor do texto</label>
        <input id="textColor" type="color" value="#fbbf24">
        <label for="backgroundColor">Cor de fundo</label>
        <input id="backgroundColor" type="color" value="#0f172a">
        <label for="position">Posição do texto</label>
        <select id="position">
          <option value="left">left</option>
          <option value="center" selected>center</option>
          <option value="right">right</option>
        </select>
        <label for="token">Token (opcional, para abrir na API)</label>
        <input id="token" placeholder="public-token">
        <button id="generate" type="button">Gerar preview</button>
        <div class="hint">O preview é local no navegador. A API usa canvas nativo no servidor.</div>
      </section>
      <section class="panel">
        <div id="card" class="card" style="background-color:#0f172a;justify-content:center;">
          <span id="card-text" style="color:#fbbf24;text-align:center;">Olá mundo 🎉🚀</span>
        </div>
        <div class="result">
          <img id="result" alt="Preview TTP" hidden>
          <p><a id="download" download="orbit-ttp.png" href="#">Baixar PNG</a> · <a id="apiLink" href="/api/canvas/ttp" target="_blank" rel="noreferrer">Abrir na API</a></p>
        </div>
      </section>
    </div>
  </main>
  <script src="/assets/html-to-image.js"></script>
  <script>
    const card = document.getElementById('card');
    const cardText = document.getElementById('card-text');
    const text = document.getElementById('text');
    const textColor = document.getElementById('textColor');
    const backgroundColor = document.getElementById('backgroundColor');
    const position = document.getElementById('position');
    const token = document.getElementById('token');
    const result = document.getElementById('result');
    const download = document.getElementById('download');
    const apiLink = document.getElementById('apiLink');

    function applyStyles() {
      card.style.backgroundColor = backgroundColor.value;
      card.style.justifyContent = position.value === 'left' ? 'flex-start' : position.value === 'right' ? 'flex-end' : 'center';
      cardText.style.color = textColor.value;
      cardText.style.textAlign = position.value;
      const length = Array.from(text.value).length;
      cardText.style.fontSize = length > 100 ? '24px' : length > 60 ? '32px' : length > 30 ? '42px' : '56px';
      cardText.textContent = text.value || 'Texto';
    }

    function updateApiLink() {
      const params = new URLSearchParams();
      params.set('text', text.value);
      params.set('textColor', textColor.value);
      params.set('backgroundColor', backgroundColor.value);
      params.set('position', position.value);
      if (token.value.trim()) params.set('token', token.value.trim());
      apiLink.href = '/api/canvas/ttp?' + params.toString();
    }

    async function generate() {
      applyStyles();
      updateApiLink();

      if (!window.htmlToImage) {
        result.hidden = true;
        alert('html-to-image não carregou.');
        return;
      }

      const dataUrl = await window.htmlToImage.toPng(card, {
        pixelRatio: 1,
        backgroundColor: backgroundColor.value
      });

      result.src = dataUrl;
      result.hidden = false;
      download.href = dataUrl;
    }

    [text, textColor, backgroundColor, position, token].forEach((input) => {
      input.addEventListener('input', () => {
        applyStyles();
        updateApiLink();
      });
    });

    document.getElementById('generate').addEventListener('click', generate);
    applyStyles();
    updateApiLink();
  </script>
</body>
</html>`;

export function ttpPreviewRoute(): Response {
  return new Response(PAGE, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
