import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Orbit",
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#07070a",
    theme_color: "#07070a",
    lang: "pt-BR",
    icons: [
      {
        src: "/icon.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/orbit-logo.png",
        sizes: "256x184",
        type: "image/png",
        purpose: "any"
      }
    ]
  };
}
