import { Router } from "express";
import { TikTokSearchService } from "@services/tiktokSearch.service";
import { tiktokSearchQuerySchema } from "@types/tiktokSearch.type";
import { InvalidParameterError, UnauthorizedError } from "@errors/index";
import { UserService } from "@services/user.service";

const router = Router();

router.get("/api/search/tiktok", async (req, res, next) => {
  try {
    const validationResult = tiktokSearchQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      throw new InvalidParameterError(validationResult.error.errors.map(e => e.message).join(", "));
    }

    const { text, token } = validationResult.data;

    const isValidUser = await UserService.validateTokenAndConsumeLimit(token);
    if (!isValidUser) {
      throw new UnauthorizedError("Token inválido, expirado ou limite diário excedido.");
    }

    const videos = await TikTokSearchService.searchVideos(text);

    return res.status(200).json({
      success: true,
      message: "Busca de vídeos do TikTok realizada com sucesso.",
      query: text,
      totalResults: videos.length,
      data: videos
    });
  } catch (error) {
    next(error);
  }
});

export default router;
