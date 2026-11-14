import { LoginForm } from "@/components/admin/LoginForm";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <span aria-hidden className="mx-auto mb-5 block size-14 rounded-full bg-[radial-gradient(circle_at_30%_30%,#7dd3fc,#6366f1_55%,#1e1b4b)] shadow-[0_0_40px_rgb(99_102_241/0.55)]" />
          <h1 className="text-[28px] font-bold tracking-tight">Вход в админ-панель</h1>
          <p className="mt-2 text-content-2">Orbit IT School</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
