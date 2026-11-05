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
