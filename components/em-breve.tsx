export function EmBreve({ titulo, fase }: { titulo: string; fase: number }) {
  return (
    <section>
      <h1 className="text-3xl font-extrabold tracking-tight">{titulo}</h1>
      <p className="mt-2 text-muted">Em construção (fase {fase}).</p>
    </section>
  );
}
