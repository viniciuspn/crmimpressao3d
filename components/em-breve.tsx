export function EmBreve({ titulo, fase }: { titulo: string; fase: number }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold">{titulo}</h1>
      <p className="mt-2 text-zinc-500">Em construção (fase {fase}).</p>
    </section>
  );
}
