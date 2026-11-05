import type { ReactNode } from "react";

export default function LandingContentLayout({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="page-enter px-5 pb-20 pt-14 text-white sm:px-8 sm:pt-20">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="text-4xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-5xl">
          {title}
        </h1>
        {children}
      </div>
    </main>
  );
}
