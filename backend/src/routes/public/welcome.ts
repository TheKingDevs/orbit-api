export async function publicWelcomeRoute(): Promise<Response> {
  return Response.json({
    message: '🚀 Bem-vindo à Orbit API! Sistema unificado de downloads, Canvas, stickers e transcrição.',
    status: 'online',
    version: '2.0.0',
    endpoints: {
      balance: '/api/user/balance?apikey=public-token',
      instagram: '/api/download/instagram?url=...&type=video&apikey=public-token',
      tiktok_audio: '/api/download/tiktok_audio?url=...&apikey=public-token',
      tiktok_video: '/api/download/tiktok_video?url=...&apikey=public-token',
      pinterest: '/api/download/pinterest?url=https://br.pinterest.com/pin/769834130090232508&type=image&apikey=public-token',
      play_audio: '/api/download/play_audio?name=nome%20da%20musica&apikey=public-token',
      play_video: '/api/download/play_video?name=nome%20do%20video&apikey=public-token',
      ytdl_audio: '/api/download/ytdl_audio?url=https://youtube.com/watch?v=...&apikey=public-token',
      ytdl_video: '/api/download/ytdl_video?url=https://youtube.com/watch?v=...&apikey=public-token',
      gpt: '/api/ai/gpt?query=...&apikey=public-token',
      groq: '/api/ai/groq?query=...&apikey=public-token',
      gemini: '/api/ai/gemini?query=...&apikey=public-token',
      shazam: '/api/ai/shazam?audioUrl=...&apikey=public-token',
      image_generate: 'POST /api/ai/image?apikey=public-token (JSON: { prompt, params?, models? })',
      image_status: 'GET /api/ai/image/status?id=...&apikey=public-token',
      transcribe: 'POST /api/transcribe?language=auto&apikey=public-token (multipart/form-data, campo: file)',
      canvas_welcome: '/api/canvas/welcome?username=Ornit&apikey=public-token',
      canvas_goodbye: '/api/canvas/goodbye?username=Ornit&apikey=public-token',
      canvas_ttp: '/api/canvas/ttp?text=Ol%C3%A1%20mundo&apikey=public-token',
      canvas_attp: '/api/canvas/attp?text=Ol%C3%A1%20mundo&effect=wave&apikey=public-token',
      canvas_effects: 'GET/POST /api/canvas/effects?effect=circle&url=...&apikey=public-token',
      sticker_ttp: '/api/sticker/ttp?text=Ol%C3%A1%20mundo&apikey=public-token',
      sticker_brat: '/api/sticker/brat?text=Ol%C3%A1%20mundo&apikey=public-token',
      sticker_abrat: '/api/sticker/abrat?text=Ol%C3%A1%20mundo&apikey=public-token',
      to_gif: 'POST /api/utility/to-gif?apikey=public-token (body: webp)'
    }
  });
}
