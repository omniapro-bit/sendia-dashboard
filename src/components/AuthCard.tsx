import Image from "next/image";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

/**
 * Shared shell for all auth pages: logo above, glass card with title and subtitle.
 */
export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="w-full max-w-[440px] animate-fade-in">
      <div className="flex items-center justify-center mb-10">
        <Image src="/logo.png" alt="Sendia" width={140} height={40} className="object-contain" priority />
      </div>
      <div
        className="rounded-[20px] w-full"
        style={{ background: "#16161f", border: "1px solid #2a2a3a", padding: "44px 48px" }}
      >
        <h1
          className="font-bold text-[#f0f0f5] mb-2"
          style={{ fontSize: "1.6rem", letterSpacing: "-0.5px" }}
        >
          {title}
        </h1>
        <p className="text-[#9999b0] text-[0.95rem] mb-8">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
