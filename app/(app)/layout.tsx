import { Nav } from "@/components/nav";
import { requireUser } from "@/lib/supabase/server";
import { sair } from "@/app/login/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { email } = await requireUser();

  return (
    <div className="min-h-dvh md:pl-56">
      <Nav />
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
        <span className="text-lg font-semibold text-teal-800 md:invisible">Ideia</span>
        <form action={sair} className="flex items-center gap-3 text-sm text-zinc-500">
          <span className="hidden sm:inline">{email}</span>
          <button type="submit" className="rounded-md px-2 py-1 hover:bg-zinc-100">
            Sair
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 pb-24 md:pb-6">{children}</main>
    </div>
  );
}
