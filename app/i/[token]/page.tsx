import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getInvite } from "@/lib/invites";
import { InvitationExperience } from "./invitation-experience";

export const dynamic = "force-dynamic";

type InvitationPageProps = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: InvitationPageProps): Promise<Metadata> {
  const { token } = await params;
  const invite = await getInvite(token);

  return {
    title: invite ? `Messaggio per ${invite.name}` : "Messaggio personale",
  };
}

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { token } = await params;
  const invite = await getInvite(token);
  if (!invite) notFound();

  return (
    <InvitationExperience
      token={invite.token}
      name={invite.name}
      message={invite.message}
      schedule={invite.schedule}
      backgroundPath={invite.backgroundPath}
      backgroundTone={invite.backgroundTone}
    />
  );
}
