"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArchiveIcon,
  CheckIcon,
  ExternalLinkIcon,
  Loader2Icon,
  MessageSquareIcon,
  PhoneIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Comment, Question } from "@/lib/engagement";
import {
  answerQuestion,
  deleteComment,
  deleteQuestion,
  setCommentStatus,
  setQuestionStatus,
} from "@/lib/feedback-actions";
import { timeAgo } from "@/lib/utils-format";

/**
 * Everything readers have sent in.
 *
 * Comments never appear on the site, so this is the only place they exist —
 * which makes "new" versus "read" the whole workflow, rather than a moderation
 * queue with a publish step.
 */
export function Inbox({
  comments,
  questions,
}: {
  comments: Comment[];
  questions: Question[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = (key: string, fn: () => Promise<{ error: string | null }>, ok: string) => {
    setBusyId(key);
    start(async () => {
      const res = await fn();
      setBusyId(null);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(ok);
      router.refresh();
    });
  };

  const newComments = comments.filter((c) => c.status === "new").length;
  const newQuestions = questions.filter((q) => q.status === "new").length;

  return (
    <div className="flex flex-col gap-5 p-5">
      <h1 className="font-heading text-heading-ink text-[26px] leading-[1.5]">
        ލިބުނު ޚިޔާލާއި ސުވާލު
      </h1>

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">
            ސުވާލު
            {newQuestions > 0 && (
              <Badge variant="secondary" className="ms-1.5">
                {newQuestions}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="comments">
            ޚިޔާލު
            {newComments > 0 && (
              <Badge variant="secondary" className="ms-1.5">
                {newComments}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="grid gap-3 pt-4">
          {questions.length === 0 && <Empty label="އަދި ސުވާލެއް ނާދޭ" />}
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              busy={pending && busyId === `q${q.id}`}
              onAnswer={(text) =>
                run(`q${q.id}`, () => answerQuestion(q.id, text), "ރައްކާކުރެވިއްޖެ")
              }
              onClose={() =>
                run(`q${q.id}`, () => setQuestionStatus(q.id, "closed"), "ބަންދުކުރެވިއްޖެ")
              }
              onDelete={() =>
                run(`q${q.id}`, () => deleteQuestion(q.id), "ފުއްސަވައިފި")
              }
            />
          ))}
        </TabsContent>

        <TabsContent value="comments" className="grid gap-3 pt-4">
          {comments.length === 0 && <Empty label="އަދި ޚިޔާލެއް ނާދޭ" />}
          {comments.map((c) => (
            <div
              key={c.id}
              className={`border-rule rounded-md border p-4 ${
                c.status === "new" ? "bg-brand/5 border-brand/30" : ""
              }`}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <MessageSquareIcon className="text-muted-ink size-4" aria-hidden />
                <span className="text-heading-ink text-[14px]">
                  {c.name || "ނަން ނެތް"}
                </span>
                {c.contact && (
                  <span className="text-muted-ink font-arabic text-[12.5px]" dir="ltr">
                    {c.contact}
                  </span>
                )}
                <span className="text-faint-ink text-[12px]">{timeAgo(c.createdAt)}</span>

                <Link
                  href={`/article/${c.articleSlug}`}
                  target="_blank"
                  className="text-brand hover:text-brand-deep ms-auto inline-flex items-center gap-1 text-[12.5px] transition-colors"
                >
                  {c.articleTitle.slice(0, 40)}
                  <ExternalLinkIcon className="size-3" aria-hidden />
                </Link>
              </div>

              <p className="text-ink mb-3 text-[14.5px] leading-[2] whitespace-pre-wrap">
                {c.body}
              </p>

              <div className="flex items-center gap-1.5">
                {c.status === "new" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending && busyId === `c${c.id}`}
                    onClick={() =>
                      run(`c${c.id}`, () => setCommentStatus(c.id, "read"), "ކިޔައިފި")
                    }
                  >
                    <CheckIcon />
                    ކިޔައިފިން
                  </Button>
                )}
                {c.status !== "archived" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending && busyId === `c${c.id}`}
                    onClick={() =>
                      run(`c${c.id}`, () => setCommentStatus(c.id, "archived"), "ރައްކާކުރެވިއްޖެ")
                    }
                  >
                    <ArchiveIcon />
                    އަރުޝީފު
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-ink hover:text-destructive ms-auto"
                  disabled={pending && busyId === `c${c.id}`}
                  onClick={() => run(`c${c.id}`, () => deleteComment(c.id), "ފުއްސަވައިފި")}
                >
                  <Trash2Icon />
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <p className="text-faint-ink border-rule rounded-md border border-dashed py-12 text-center text-[14px]">
      {label}
    </p>
  );
}

function QuestionCard({
  question: q,
  busy,
  onAnswer,
  onClose,
  onDelete,
}: {
  question: Question;
  busy: boolean;
  onAnswer: (text: string) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [answer, setAnswer] = useState(q.answer);

  return (
    <div
      className={`border-rule rounded-md border p-4 ${
        q.status === "new" ? "bg-brand/5 border-brand/30" : ""
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-heading-ink text-[14px]">{q.name || "ނަން ނެތް"}</span>

        {/* Tapping opens Viber straight to the reader who asked. */}
        <a
          href={`viber://chat?number=${encodeURIComponent(q.viber)}`}
          className="text-brand hover:text-brand-deep font-arabic inline-flex items-center gap-1 text-[13px] tabular-nums transition-colors"
          dir="ltr"
        >
          <PhoneIcon className="size-3.5" aria-hidden />
          {q.viber}
        </a>

        <span className="text-faint-ink text-[12px]">{timeAgo(q.createdAt)}</span>

        {q.status !== "new" && (
          <Badge variant="secondary" className="ms-auto">
            {q.status === "answered" ? "ޖަވާބު ދެވިފައި" : "ބަންދު"}
          </Badge>
        )}
      </div>

      <p className="text-ink mb-3 text-[15px] leading-[2] whitespace-pre-wrap">{q.body}</p>

      <Textarea
        dir="rtl"
        rows={3}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="ޖަވާބު ނޯޓުކުރައްވާ (ވައިބަރުން ފޮނުއްވުމަށްފަހު)…"
        className="mb-2.5"
      />

      <div className="flex items-center gap-1.5">
        <Button size="sm" disabled={busy || !answer.trim()} onClick={() => onAnswer(answer)}>
          {busy ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
          ޖަވާބު ރައްކާކުރައްވާ
        </Button>
        {q.status !== "closed" && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={onClose}>
            <ArchiveIcon />
            ބަންދުކުރައްވާ
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-ink hover:text-destructive ms-auto"
          disabled={busy}
          onClick={onDelete}
        >
          <Trash2Icon />
        </Button>
      </div>
    </div>
  );
}
