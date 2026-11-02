import Link from "next/link";
import { SendIcon } from "lucide-react";

/**
 * Link to the Telegram channel.
 *
 * A card rather than Telegram's own embed widget: the embed loads a script and
 * an iframe from telegram.org on every homepage visit, which hands a third
 * party a record of everyone who opens the site and slows the page down. The
 * card costs nothing and sends anyone who wants the feed straight there.
 */
export function TelegramCard({ channel }: { channel: string }) {
  const handle = channel.trim().replace(/^@/, "");
  if (!handle) return null;

  return (
    <section className="border-rule-soft bg-paper-4 rounded-[10px] border p-4">
      <div className="mb-2 flex items-center gap-2 text-[12px] leading-[1.8] text-[#229ED9]">
        <SendIcon className="size-4" aria-hidden />
        ޓެލެގްރާމް
      </div>

      <p className="text-muted-ink mb-3 text-[13.5px] leading-[1.9] text-pretty">
        އައު ލިޔުންތައް ޓެލެގްރާމް ޗެނަލުން ލިބިވަޑައިގަންނަވާނެ
      </p>

      <Link
        href={`https://t.me/${handle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-10 items-center gap-2 rounded-[5px] border border-[#229ED9] px-4 text-[14px] leading-[1.7] text-[#229ED9] transition-colors hover:bg-[#229ED9] hover:text-white"
      >
        @{handle}
      </Link>
    </section>
  );
}
