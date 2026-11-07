export async function publicWelcomeRoute(): Promise<Response> {
  return Response.json({
    message: '🚀 Bem-vindo à Orbit API! Sistema unificado de downloads, Canvas, stickers e transcrição.',
    status: 'online',
    version: '2.0.0',
    endpoints: {
      balance: '/api/user/balance?token=public-token',
      instagram: '/api/download/instagram?url=...&type=video&token=public-token',
      tiktok_audio: '/api/download/tiktok_audio?url=...&token=public-token',
      tiktok_video: '/api/download/tiktok_video?url=...&token=public-token',
      pinterest: '/api/download/pinterest?url=https://br.pinterest.com/pin/769834130090232508&type=image&token=public-token',
      play_audio: '/api/download/play_audio?name=nome%20da%20musica&token=public-token',
      play_video: '/api/download/play_video?name=nome%20do%20video&token=public-token',
      ytdl_audio: '/api/download/ytdl_audio?url=https://youtube.com/watch?v=...&token=public-token',
      ytdl_video: '/api/download/ytdl_video?url=https://youtube.com/watch?v=...&token=public-token',
      gpt: '/api/ai/gpt?query=...&token=public-token',
      groq: '/api/ai/groq?query=...&token=public-token',
      gemini: '/api/ai/gemini?query=...&token=public-token',
      shazam: '/api/ai/shazam?audioUrl=...&token=public-token',
      transcribe: 'POST /api/transcribe?language=auto&token=public-token (multipart/form-data, campo: file)',
      canvas_welcome: '/api/canvas/welcome?username=Ornit&token=public-token',
      canvas_goodbye: '/api/canvas/goodbye?username=Ornit&token=public-token',
      canvas_ttp: '/api/canvas/ttp?text=Ol%C3%A1%20mundo&token=public-token',
      canvas_attp: '/api/canvas/attp?text=Ol%C3%A1%20mundo&effect=wave&token=public-token',
      canvas_effects: 'GET/POST /api/canvas/effects?effect=circle&url=...&token=public-token',
      sticker_ttp: '/api/sticker/ttp?text=Ol%C3%A1%20mundo&token=public-token',
      sticker_brat: '/api/sticker/brat?text=Ol%C3%A1%20mundo&token=public-token',
      sticker_abrat: '/api/sticker/abrat?text=Ol%C3%A1%20mundo&token=public-token',
      ttp_preview: '/preview/ttp',
      to_gif: 'POST /api/utility/to-gif?token=public-token (body: webp)'
    }
  });
}
