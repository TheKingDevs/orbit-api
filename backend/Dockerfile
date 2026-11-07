FROM oven/bun:latest AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 curl ca-certificates build-essential && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile

COPY tsconfig.json build.config.json ./
COPY scripts ./scripts
COPY src ./src
COPY assets ./assets

RUN bun run build

FROM oven/bun:latest AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 ffmpeg curl ca-certificates libstdc++6 \
    fonts-dejavu-core fonts-noto-color-emoji && \
    curl -L --fail --retry 3 https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/assets ./assets

RUN mkdir -p models/whisper-tiny storage && \
    curl -L --fail --retry 3 --retry-delay 2 https://huggingface.co/csukuangfj/sherpa-onnx-whisper-tiny/resolve/main/tiny-encoder.int8.onnx -o models/whisper-tiny/tiny-encoder.int8.onnx && \
    curl -L --fail --retry 3 --retry-delay 2 https://huggingface.co/csukuangfj/sherpa-onnx-whisper-tiny/resolve/main/tiny-decoder.int8.onnx -o models/whisper-tiny/tiny-decoder.int8.onnx && \
    curl -L --fail --retry 3 --retry-delay 2 https://huggingface.co/csukuangfj/sherpa-onnx-whisper-tiny/resolve/main/tiny-tokens.txt -o models/whisper-tiny/tiny-tokens.txt

ENV NODE_ENV=production
ENV WHISPER_MODEL_DIR=/app/models/whisper-tiny

EXPOSE 3000

CMD ["./dist/orbit-backend"]
