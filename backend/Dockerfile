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
    python3 python3-venv ffmpeg tesseract-ocr tesseract-ocr-por tesseract-ocr-eng curl ca-certificates libstdc++6 \
    fonts-dejavu-core fonts-noto-color-emoji && \
    rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/orbit-python && \
    /opt/orbit-python/bin/pip install --no-cache-dir shazamio==0.9.0

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/assets ./assets
COPY scripts ./scripts

RUN mkdir -p models/whisper-tiny storage && \
    curl -L --fail --retry 3 --retry-delay 2 https://huggingface.co/csukuangfj/sherpa-onnx-whisper-tiny/resolve/main/tiny-encoder.int8.onnx -o models/whisper-tiny/tiny-encoder.int8.onnx && \
    curl -L --fail --retry 3 --retry-delay 2 https://huggingface.co/csukuangfj/sherpa-onnx-whisper-tiny/resolve/main/tiny-decoder.int8.onnx -o models/whisper-tiny/tiny-decoder.int8.onnx && \
    curl -L --fail --retry 3 --retry-delay 2 https://huggingface.co/csukuangfj/sherpa-onnx-whisper-tiny/resolve/main/tiny-tokens.txt -o models/whisper-tiny/tiny-tokens.txt

ENV NODE_ENV=production
ENV WHISPER_MODEL_DIR=/app/models/whisper-tiny
ENV SHAZAM_PYTHON=/opt/orbit-python/bin/python

EXPOSE 3000

CMD ["./dist/orbit-backend"]
