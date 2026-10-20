"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/", label: "Orçamento", icone: "M12 4v16m8-8H4" },
  { href: "/historico", label: "Histórico", icone: "M4 6h16M4 12h16M4 18h10" },
  { href: "/clientes", label: "Clientes", icone: "M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM4 21a8 8 0 0 1 16 0" },
  { href: "/cadastros", label: "Cadastros", icone: "M4 7h16v13H4zM9 7V4h6v3" },
  {
    href: "/configuracoes",
    label: "Ajustes",
    icone: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3m0 14v3M2 12h3m14 0h3",
  },
];

function ativo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Icone({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5" aria-hidden>
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: barra lateral */}
      <nav className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-zinc-200 bg-white p-4 md:flex">
        <span className="mb-6 px-2 text-xl font-semibold text-teal-800">Ideia</span>
        <ul className="space-y-1">
          {ITENS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                  ativo(pathname, item.href)
                    ? "bg-teal-50 font-medium text-teal-800"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                <Icone d={item.icone} />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Celular: barra inferior */}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid grid-cols-5">
          {ITENS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${
                  ativo(pathname, item.href) ? "font-medium text-teal-700" : "text-zinc-500"
                }`}
              >
                <Icone d={item.icone} />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
