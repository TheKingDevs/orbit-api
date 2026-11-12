import { APP_VERSION } from '@utils/appVersion';

export async function publicWelcomeRoute(): Promise<Response> {
  return Response.json({
    message: '🚀 Bem-vindo à Orbit API! Sistema unificado de downloads, Canvas, stickers e transcrição.',
    status: 'online',
    version: APP_VERSION,
    authentication: 'Send your API key in the x-apikey or x-api-key request header.',
    endpoints: {
      balance: '/api/user/balance',
      instagram: '/api/download/instagram?url=...&type=video',
      tiktok_audio: '/api/download/tiktok_audio?url=...',
      tiktok_video: '/api/download/tiktok_video?url=...',
      pinterest: '/api/download/pinterest?url=https://br.pinterest.com/pin/769834130090232508&type=image',
      spotify: '/api/download/spotify?url=https://open.spotify.com/track/...',
      threads: '/api/download/threads?url=https://www.threads.com/@usuario/post/...',
      google_drive: '/api/download/google-drive?url=https://drive.google.com/file/d/.../view',
      capcut: '/api/download/capcut?url=https://www.capcut.com/template-detail/...',
      twitter: '/api/download/twitter?url=https://x.com/usuario/status/...',
      play_audio: '/api/download/play_audio?name=nome%20da%20musica',
      play_video: '/api/download/play_video?name=nome%20do%20video',
      ytdl_audio: '/api/download/ytdl_audio?url=https://youtube.com/watch?v=...',
      ytdl_video: '/api/download/ytdl_video?url=https://youtube.com/watch?v=...',
      gpt: '/api/ai/gpt?query=...',
      groq: '/api/ai/groq?query=...',
      gemini: '/api/ai/gemini?query=...',
      shazam: 'GET /api/ai/shazam?audioUrl=... ou POST /api/ai/shazam (multipart/form-data, campo: file; limite: 50 MB)',
      image_generate: 'POST /api/ai/image (JSON: { prompt, params?, models? })',
      image_status: 'GET /api/ai/image/status?id=...',
      transcribe: 'POST /api/transcribe?language=auto (multipart/form-data, campo: file)',
      ocr: 'POST /api/ai/ocr?language=auto (multipart/form-data, campo: file)',
      summarize: 'POST /api/ai/summarize (JSON: text, language?, style?, length?)',
      audioSummarize: 'POST /api/audio/summarize?language=auto (multipart/form-data, campo: file)',
      canvas_welcome: '/api/canvas/welcome?username=Ornit',
      canvas_goodbye: '/api/canvas/goodbye?username=Ornit',
      canvas_ttp: '/api/canvas/ttp?text=Ol%C3%A1%20mundo',
      canvas_attp: '/api/canvas/attp?text=Ol%C3%A1%20mundo&effect=wave',
      canvas_effects: 'GET/POST /api/canvas/effects?effect=circle&url=...',
      sticker_ttp: '/api/sticker/ttp?text=Ol%C3%A1%20mundo',
      sticker_brat: '/api/sticker/brat?text=Ol%C3%A1%20mundo',
      sticker_abrat: '/api/sticker/abrat?text=Ol%C3%A1%20mundo',
      to_gif: 'POST /api/utility/to-gif (body: webp)'
    }
  });
}
