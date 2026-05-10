"use client";

import { deleteGiftGroup } from "../actions";
import { ActionForm } from "../action-form";

export function DeleteGroupButton({ groupId }: { groupId: string }) {
  return (
    <ActionForm
      action={deleteGiftGroup}
      onSubmit={(e) => {
        if (!confirm("Delete this group gift? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
      className="mt-2"
    >
      <input type="hidden" name="groupId" value={groupId} />
      <button
        type="submit"
        className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
      >
        Delete group
      </button>
    </ActionForm>
  );
}
