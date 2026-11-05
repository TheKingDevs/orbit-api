export async function publicWelcomeRoute(): Promise<Response> {
  return Response.json({
    message: '🚀 Bem-vindo à Orbit API! Sistema unificado de downloads, Canvas, stickers e transcrição.',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      balance: '/api/user/balance?token=public-token',
      instagram: '/api/download/instagram?url=...&type=video&token=public-token',
      tiktok_audio: '/api/download/tiktok_audio?url=...&token=public-token',
      tiktok_video: '/api/download/tiktok_video?url=...&token=public-token',
      pinterest: '/api/download/pinterest?url=https://br.pinterest.com/pin/769834130090232508&type=image&token=public-token',
      play_audio: '/api/download/play_audio?url=...&platform=youtube&token=public-token',
      play_video: '/api/download/play_video?url=...&platform=youtube&token=public-token',
      canvas_welcome: '/api/canvas/welcome?username=Ornit&token=public-token',
      canvas_goodbye: '/api/canvas/goodbye?username=Ornit&token=public-token',
      canvas_ttp: '/api/canvas/ttp?text=Olá%20mundo&token=public-token',
      canvas_attp: '/api/canvas/attp?text=Olá%20mundo&effect=wave&token=public-token',
      canvas_effects: 'GET/POST /api/canvas/effects?effect=circle&url=...&token=public-token',
      sticker_ttp: '/api/sticker/ttp?text=Olá%20mundo&token=public-token',
      sticker_brat: '/api/sticker/brat?text=Olá%20mundo&token=public-token',
      sticker_abrat: '/api/sticker/abrat?text=Olá%20mundo&token=public-token',
      ttp_preview: '/preview/ttp',
      to_gif: 'POST /api/utility/to-gif?token=public-token (body: webp)',
      transcribe: 'POST /api/transcribe?language=auto&token=public-token (multipart/form-data, campo: file)'
    }
  });
}
