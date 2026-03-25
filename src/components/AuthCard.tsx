import Image from "next/image";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

/**
 * Shared shell for all auth pages: logo above, clean card with title and subtitle.
 */
export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="w-full max-w-[420px] animate-fade-in">
      {/* Logo */}
      <div className="flex items-center justify-center mb-8">
        <Image
          src="/logo.png"
          alt="Sendia"
          width={150}
          height={44}
          className="object-contain"
          priority
        />
      </div>

      {/* Card */}
      <div
        className="w-full rounded-[20px]"
        style={{
          background: "#16161f",
          border: "1px solid #2a2a3a",
          padding: "40px 44px 44px",
        }}
      >
        <h1
          className="font-bold text-[#f0f0f5] mb-2 leading-tight"
          style={{ fontSize: "1.5rem", letterSpacing: "-0.4px" }}
        >
          {title}
        </h1>
        <p
          className="text-[#b0b0c0] mb-8"
          style={{ fontSize: "0.9rem" }}
        >
          {subtitle}
        </p>
        {children}
      </div>
    </div>
  );
}
