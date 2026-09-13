import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { InviteGenerator } from "./invite-generator";
import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAuthenticated())) redirect("/login");

  return (
    <main className="admin-shell" id="main-content">
      <header className="admin-header">
        <a className="admin-brand" href="/admin" aria-label="Torna alla creazione invito">
          invito<span aria-hidden="true">✦</span>
        </a>
        <LogoutButton />
      </header>

      <section className="admin-workspace" aria-labelledby="generator-title">
        <div className="admin-intro">
          <p className="admin-greeting">Ciao.</p>
          <h1 id="generator-title">Chi vuoi sorprendere?</h1>
          <p>Scrivi il nome, genera il link e mandalo senza aggiungere altro.</p>
        </div>
        <InviteGenerator />
      </section>
    </main>
  );
}
