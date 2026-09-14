import { redirect } from "next/navigation";
import { getBotInviteUrl } from "@/invite/bot-invite-url";

/**
 * Public, unauthenticated shortcut (e.g. https://<domaine>/invite) — a
 * server owner needs to add the bot before they can ever log into the
 * dashboard, so this can't sit behind auth like the rest of the app.
 */
export function GET() {
  const inviteUrl = getBotInviteUrl();
  if (!inviteUrl) {
    redirect("/login");
  }
  redirect(inviteUrl);
}
