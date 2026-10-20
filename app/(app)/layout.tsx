import { Nav } from "@/components/nav";
import { requireUser } from "@/lib/supabase/server";
import { sair } from "@/app/login/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { email } = await requireUser();

  return (
    <div className="min-h-dvh md:pl-56">
      <Nav />
      <header className="flex items-center justify-between border-b border-line bg-panel px-4 py-3">
        <span className="text-lg font-semibold text-accent md:invisible">Ideia</span>
        <form action={sair} className="flex items-center gap-3 text-sm text-muted">
          <span className="hidden sm:inline">{email}</span>
          <button type="submit" className="rounded-md px-2 py-1 hover:bg-soft">
            Sair
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 pb-24 md:pb-6">{children}</main>
    </div>
  );
}
