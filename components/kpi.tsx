export function Kpi({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0 rounded border border-line bg-panel px-2.5 py-2">
      <div className="text-[11px] tracking-[.08em] text-muted uppercase">{rotulo}</div>
      <b className="mt-0.5 block font-mono text-[15px] font-semibold [overflow-wrap:anywhere]">{valor}</b>
    </div>
  );
}
