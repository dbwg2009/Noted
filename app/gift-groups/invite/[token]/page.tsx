import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getContributorByInviteToken } from "@/lib/gift-groups-queries";
import { acceptInviteAction } from "../../actions";
import { ActionForm } from "../../action-form";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const invite = await getContributorByInviteToken(token);

  if (!invite) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Invalid invite link</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          This invite link is not valid. It may have already been used or removed.
        </p>
      </main>
    );
  }

  if (invite.inviteAcceptedAt) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Already accepted</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          This invite has already been accepted.
        </p>
        <a href={`/gift-groups/${invite.groupId}`} className="mt-4 inline-block text-sm text-brand-blue-600 hover:underline dark:text-brand-blue-400">
          View group gift →
        </a>
      </main>
    );
  }

  if (invite.inviteExpiresAt && invite.inviteExpiresAt < new Date()) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Invite expired</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          This invite link has expired. Ask the group organiser to resend it.
        </p>
      </main>
    );
  }

  const session = await auth();

  if (!session?.user) {
    const callbackUrl = encodeURIComponent(`/gift-groups/invite/${token}`);
    redirect(`/login?callbackUrl=${callbackUrl}`);
  }

  if (error === "wrong_account") {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Wrong account</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          This invite was sent to <strong>{invite.email}</strong>. You&rsquo;re logged in with
          a different email. Please log in with the correct account to accept this invite.
        </p>
        <a href={`/login?callbackUrl=${encodeURIComponent(`/gift-groups/invite/${token}`)}`} className="mt-4 inline-block text-sm text-brand-blue-600 hover:underline dark:text-brand-blue-400">
          Log in with a different account →
        </a>
      </main>
    );
  }

  if (error === "failed") {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Could not accept this invite. Please try again or contact the group organiser.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">You&rsquo;ve been invited to a group gift</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Accept the invite to join this group gift and track your contribution.
      </p>
      <ActionForm action={acceptInviteAction} className="mt-6">
        <input type="hidden" name="token" value={token} />
        <button type="submit" className="btn-primary px-4 py-2 text-sm">
          Accept invite
        </button>
      </ActionForm>
    </main>
  );
}
