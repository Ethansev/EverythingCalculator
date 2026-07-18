export function ReceiptSurface({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`receipt-paper font-receipt px-5 py-8 sm:px-10 my-3 ${className}`}>
      <div className="text-center text-[11px] tracking-[0.25em] text-stone-400 uppercase">
        Everything Calculator
      </div>
      <div className="text-center text-[11px] tracking-[0.25em] text-stone-400 uppercase mb-6">
        · · · split receipt · · ·
      </div>
      {children}
    </div>
  );
}
