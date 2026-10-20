import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
        <h1 className="text-2xl font-semibold text-teal-800">Ideia</h1>
        <p className="mb-6 text-sm text-zinc-500">Orçamentos da oficina 3D</p>
        <LoginForm />
      </div>
    </main>
  );
}
