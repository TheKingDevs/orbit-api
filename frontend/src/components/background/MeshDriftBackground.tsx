"use client";

import { useEffect, useRef } from "react";
import { MESH_DRIFT_FRAGMENT_SHADER } from "./meshDriftShader";

const MAX_DPR = 1.35;
const FRAME_INTERVAL_MS = 1000 / 30;

const VERTEX_SHADER = `attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const DARK_COLORS = new Float32Array([
  0.043, 0.063, 0.149,
  0.239, 0.275, 0.910,
  0.694, 0.549, 1.000,
  1.000, 0.839, 0.906
]);
const LIGHT_COLORS = new Float32Array([
  0.78, 0.84, 0.96,
  0.63, 0.72, 0.99,
  0.82, 0.75, 0.98,
  0.98, 0.80, 0.87
]);

function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

export default function MeshDriftBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false
    });
    if (!canvas || !gl) return;

    const vertex = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      MESH_DRIFT_FRAGMENT_SHADER
    );
    const program = gl.createProgram();

    if (!vertex || !fragment || !program) {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
      if (program) gl.deleteProgram(program);
      return;
    }

    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);

    const parallelCompile = gl.getExtension("KHR_parallel_shader_compile") as
      | { COMPLETION_STATUS_KHR: number }
      | null;
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    const transparencyPreference = window.matchMedia(
      "(prefers-reduced-transparency: reduce)"
    );

    let disposed = false;
    let pollTimer = 0;
    let frame = 0;
    let frameTimer = 0;
    let buffer: WebGLBuffer | null = null;
    let reducedMotion = motionPreference.matches;
    let reducedTransparency = transparencyPreference.matches;
    let lightTheme = document.documentElement.dataset.theme === "light";
    let resourcesReady = false;

    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      if (frameTimer) window.clearTimeout(frameTimer);
      frame = 0;
      frameTimer = 0;
    };

    let resize = () => {};
    let start = () => {};
    let onVisibilityChange = () => {};
    let onMotionChange: (event: MediaQueryListEvent) => void = () => {};
    let onTransparencyChange: (event: MediaQueryListEvent) => void = () => {};
    let themeObserver: MutationObserver | null = null;

    const destroyResources = () => {
      stop();
      if (!resourcesReady) return;
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      motionPreference.removeEventListener("change", onMotionChange);
      transparencyPreference.removeEventListener("change", onTransparencyChange);
      themeObserver?.disconnect();
      if (buffer) gl.deleteBuffer(buffer);
      resourcesReady = false;
    };

    const setup = () => {
      if (disposed) return;
      if (parallelCompile && !gl.getProgramParameter(program, parallelCompile.COMPLETION_STATUS_KHR)) {
        pollTimer = window.setTimeout(setup, 50);
        return;
      }

      const shaderOk = gl.getShaderParameter(vertex, gl.COMPILE_STATUS)
        && gl.getShaderParameter(fragment, gl.COMPILE_STATUS);
      const programOk = gl.getProgramParameter(program, gl.LINK_STATUS);
      if (!shaderOk || !programOk) {
        gl.deleteProgram(program);
        gl.deleteShader(vertex);
        gl.deleteShader(fragment);
        return;
      }

      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.useProgram(program);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);

      buffer = gl.createBuffer();
      if (!buffer) {
        gl.deleteProgram(program);
        return;
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW
      );

      const position = gl.getAttribLocation(program, "a_position");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

      const uniform = (name: string) => gl.getUniformLocation(program, name);
      const uniforms = {
        colors: uniform("u_colors[0]"),
        scene: uniform("u_scene"),
        shape: uniform("u_shape"),
        surface: uniform("u_surface"),
        finish: uniform("u_finish"),
        transform: uniform("u_transform"),
        space: uniform("u_space"),
        cursor: uniform("u_cursor")
      };

      let lastDraw = 0;
      resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        const width = Math.max(1, Math.round(window.innerWidth * dpr));
        const height = Math.max(1, Math.round(window.innerHeight * dpr));
        if (canvas.width === width && canvas.height === height) return;
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      };

      const draw = (timestamp: number) => {
        if (reducedTransparency) return;
        gl.useProgram(program);
        gl.uniform3fv(uniforms.colors, lightTheme ? LIGHT_COLORS : DARK_COLORS);
        gl.uniform4f(
          uniforms.scene,
          canvas.width,
          canvas.height,
          reducedMotion ? 0 : -(timestamp / 1000) * 0.73,
          4
        );
        gl.uniform4f(uniforms.shape, 1.9, 0.1, 0.47, 0.04);
        gl.uniform4f(uniforms.surface, 1.54, 0.65, 0, 1);
        gl.uniform4f(uniforms.finish, 0, 0.21, 0.002, 0.1);
        gl.uniform4f(uniforms.transform, 4012, 5.65, 0.12, 0);
        gl.uniform4f(uniforms.space, 0.11, -0.19, 0, 0);
        gl.uniform4f(uniforms.cursor, 0, 2, 0.65, 0.46);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (canvas.dataset.ready !== "true") canvas.dataset.ready = "true";
      };

      const tick = (timestamp: number) => {
        if (timestamp - lastDraw >= FRAME_INTERVAL_MS) {
          draw(timestamp);
          lastDraw = timestamp;
        }
        if (document.visibilityState === "visible") {
          frameTimer = window.setTimeout(() => {
            frame = requestAnimationFrame(tick);
          }, 16);
        } else {
          frame = 0;
        }
      };

      start = () => {
        stop();
        if (document.visibilityState !== "visible" || reducedTransparency) return;
        if (reducedMotion) {
          draw(0);
          return;
        }
        lastDraw = 0;
        frame = requestAnimationFrame(tick);
      };

      onVisibilityChange = () => {
        if (document.visibilityState === "visible") start();
        else stop();
      };
      onMotionChange = (event) => {
        reducedMotion = event.matches;
        start();
      };
      onTransparencyChange = (event) => {
        reducedTransparency = event.matches;
        start();
      };
      themeObserver = new MutationObserver(() => {
        lightTheme = document.documentElement.dataset.theme === "light";
        start();
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"]
      });

      resize();
      start();
      window.addEventListener("resize", resize, { passive: true });
      document.addEventListener("visibilitychange", onVisibilityChange);
      motionPreference.addEventListener("change", onMotionChange);
      transparencyPreference.addEventListener("change", onTransparencyChange);
      resourcesReady = true;
    };

    setup();

    return () => {
      disposed = true;
      if (pollTimer) window.clearTimeout(pollTimer);
      destroyResources();
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, []);

  return (
    <div aria-hidden="true" className="mesh-drift-background">
      <canvas ref={canvasRef} className="mesh-drift-canvas" />
      <span className="mesh-drift-veil" />
    </div>
  );
}
