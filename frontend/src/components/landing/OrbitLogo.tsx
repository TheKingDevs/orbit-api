import Image from "next/image";

interface OrbitLogoProps {
  className?: string;
  alt?: string;
}

export default function OrbitLogo({
  className = "h-8 w-auto",
  alt = ""
}: OrbitLogoProps) {
  return (
    <Image
      src="/orbit-logo.png"
      alt={alt}
      width={256}
      height={184}
      unoptimized
      draggable={false}
      className={`${className} object-contain`}
    />
  );
}
