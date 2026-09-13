import { notFound } from "next/navigation";
import { getInvite } from "@/lib/invites";
import { InvitationExperience } from "./invitation-experience";

export const dynamic = "force-dynamic";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInvite(token);
  if (!invite) notFound();

  return (
    <InvitationExperience
      token={invite.token}
      name={invite.name}
      backgroundPath={invite.backgroundPath}
      backgroundTone={invite.backgroundTone}
    />
  );
}
