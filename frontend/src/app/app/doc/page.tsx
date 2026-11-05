import { redirect } from "next/navigation";

export const instant = false;

export default function DocsIndexPage() {
  redirect("/app/doc/canvas/welcome");
}
