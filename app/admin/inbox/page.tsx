import { requireUser } from "@/lib/auth";
import { listComments, listQuestions } from "@/lib/engagement";
import { Inbox } from "@/components/admin/inbox";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  await requireUser();
  return <Inbox comments={listComments()} questions={listQuestions()} />;
}
