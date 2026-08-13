import { getPaddleEnvironment } from "@/lib/paddle";
import type { PaymentTestModeBannerProps } from "@/types";

export function PaymentTestModeBanner({ className = "" }: PaymentTestModeBannerProps) {
  if (getPaddleEnvironment() !== "sandbox") return null;
  return (
    <div
      className={`w-full bg-amber-500/10 border-b border-amber-500/40 px-4 py-2 text-center text-xs text-amber-200 ${className}`.trim()}
    >
      Payments are in test mode. Use test card{" "}
      <code className="font-mono">4242 4242 4242 4242</code>.{" "}
      <a
        href="https://docs.lovable.dev/features/payments#test-and-live-environments"
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-medium"
      >
        Learn more
      </a>
    </div>
  );
}
