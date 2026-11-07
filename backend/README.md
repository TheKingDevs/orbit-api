# Orbit API 🚀

API REST unificada para downloads (Instagram com `type` obrigatório, TikTok áudio/vídeo, Pinterest, YouTube) e gerador de cards Canvas com `@napi-rs/canvas`.

---

## 🛠️ Novos Endpoints

1. **Instagram:**
   `GET /api/download/instagram?url=...&type=video&token=public-token`
2. **TikTok Áudio:**
   `GET /api/download/tiktok_audio?url=...&token=public-token`
3. **TikTok Vídeo:**
   `GET /api/download/tiktok_video?url=...&token=public-token`

---

## 🔐 Segurança dos dados

- Defina `DATA_ENCRYPTION_KEY` em produção (`openssl rand -base64 32`).
- Tokens de API, e-mails e o identificador Google são persistidos no MongoDB como hash HMAC-SHA256 para busca/deduplicação.
- Tokens, e-mails, nomes, fotos e motivos de suspensão são persistidos como ciphertext AES-256-GCM, pois precisam ser lidos pela aplicação.
- Documentos antigos com campos em texto puro são migrados automaticamente na inicialização e os campos legados são removidos.
- O hash é irreversível; a chave de criptografia não deve ser trocada sem um processo de rotação, pois os dados antigos deixariam de ser legíveis.
- Use a mesma `DATA_ENCRYPTION_KEY` em todos os ambientes que compartilham o mesmo banco; a ausência da chave impede a inicialização com MongoDB.

## 📦 Build de produção

`bun run build` gera `dist/orbit-backend`, um executável com bytecode e minificação. Ele não distribui o código-fonte JS, mas não é criptografia e não impede engenharia reversa. O runtime mantém `node_modules` para as bibliotecas nativas do `sherpa-onnx`.
