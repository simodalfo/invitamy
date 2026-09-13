import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAuthenticated()) redirect("/admin");

  return (
    <main className="auth-shell" id="main-content">
      <div className="auth-ambient" aria-hidden="true" />
      <section className="auth-panel" aria-labelledby="login-title">
        <span className="brand-mark" aria-hidden="true">✦</span>
        <div className="auth-copy">
          <h1 id="login-title">Il tuo piccolo segreto.</h1>
          <p>Accedi per creare un invito personale.</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
