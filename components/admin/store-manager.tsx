"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  FileTextIcon,
  Loader2Icon,
  MailIcon,
  PlusIcon,
  ReceiptIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ImageUploader } from "./image-uploader";
import type { Order, Product } from "@/lib/store";
import {
  addProduct,
  approveOrder,
  deleteOrder,
  deleteProduct,
  rejectOrder,
  resendDelivery,
  saveProduct,
  uploadProductFile,
} from "@/lib/store-actions";
import { timeAgo } from "@/lib/utils-format";

const money = (laari: number) => (laari / 100).toFixed(2);

/**
 * Shop management: what is for sale, and the orders waiting on a decision.
 *
 * Approving an order is the only thing that issues a download token, so this
 * screen is the paywall. The delivery email can fail without blocking that —
 * the link is always shown here so it can be sent by hand.
 */
export function StoreManager({
  products,
  orders,
  mailReady,
}: {
  products: Product[];
  orders: Order[];
  mailReady: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const pendingOrders = orders.filter((o) => o.status === "pending").length;

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

  return (
    <div className="flex flex-col gap-5 p-5">
      <h1 className="font-heading text-heading-ink text-[26px] leading-[1.5]">ފިހާރަ</h1>

      {!mailReady && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-[13.5px] leading-[1.9]">
          އީމެއިލް ކީ ސެޓުކުރައްވާފައި ނެތުމުން، އެޕްރޫވްކުރެއްވުމުން ލިންކު އަމިއްލައަށް
          ފޮނުއްވަންޖެހޭނެއެވެ. ސެޓިންގްސްއިން ކީ އިތުރުކުރެއްވޭނެ.
        </p>
      )}

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">
            އޯޑަރު
            {pendingOrders > 0 && (
              <Badge variant="secondary" className="ms-1.5">
                {pendingOrders}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="products">ފޮތްތައް</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="grid gap-3 pt-4">
          {orders.length === 0 && (
            <p className="text-faint-ink border-rule rounded-md border border-dashed py-12 text-center text-[14px]">
              އަދި އޯޑަރެއް ނާދޭ
            </p>
          )}
          {orders.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              busy={pending && busyId === `o${o.id}`}
              onApprove={() => {
                setBusyId(`o${o.id}`);
                start(async () => {
                  const res = await approveOrder(o.id);
                  setBusyId(null);
                  if (res.error) {
                    toast.error(res.error);
                    return;
                  }
                  if (res.mail?.sent) toast.success("އެޕްރޫވްކޮށް، އީމެއިލް ފޮނުވިއްޖެ");
                  else
                    toast.warning(
                      res.mail?.configured
                        ? `އެޕްރޫވްކުރެވިއްޖެ — އީމެއިލް ނުފޮނުވުނު: ${res.mail?.reason ?? ""}`
                        : "އެޕްރޫވްކުރެވިއްޖެ — ލިންކު އަމިއްލައަށް ފޮނުއްވާ"
                    );
                  router.refresh();
                });
              }}
              onReject={(note) =>
                run(`o${o.id}`, () => rejectOrder(o.id, note), "ބާޠިލުކުރެވިއްޖެ")
              }
              onResend={() => {
                setBusyId(`o${o.id}`);
                start(async () => {
                  const res = await resendDelivery(o.id);
                  setBusyId(null);
                  if (res.sent) toast.success("އަލުން ފޮނުވިއްޖެ");
                  else toast.error(res.error ?? "ނުފޮނުވުނު");
                });
              }}
              onDelete={() => run(`o${o.id}`, () => deleteOrder(o.id), "ފުއްސަވައިފި")}
            />
          ))}
        </TabsContent>

        <TabsContent value="products" className="grid gap-4 pt-4">
          <NewProduct onDone={() => router.refresh()} />
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onDelete={() =>
                run(`p${p.id}`, () => deleteProduct(p.id), "ފުއްސަވައިފި")
              }
              busy={pending && busyId === `p${p.id}`}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OrderCard({
  order: o,
  busy,
  onApprove,
  onReject,
  onResend,
  onDelete,
}: {
  order: Order;
  busy: boolean;
  onApprove: () => void;
  onReject: (note: string) => void;
  onResend: () => void;
  onDelete: () => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  const downloadUrl = o.token ? `/store/download/${o.token}` : "";

  return (
    <div
      className={`border-rule rounded-md border p-4 ${
        o.status === "pending" ? "border-brand/30 bg-brand/5" : ""
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-heading-ink text-[14.5px]">{o.productTitle}</span>
        <Badge
          variant={
            o.status === "approved"
              ? "default"
              : o.status === "rejected"
                ? "destructive"
                : "secondary"
          }
        >
          {o.status === "approved"
            ? "އެޕްރޫވް"
            : o.status === "rejected"
              ? "ބާޠިލު"
              : "ބެލުމަށް"}
        </Badge>
        <span className="text-faint-ink text-[12px]">{timeAgo(o.createdAt)}</span>
      </div>

      <div className="text-muted-ink mb-3 grid gap-0.5 text-[13px] leading-[1.9]">
        <span>{o.buyerName || "ނަން ނެތް"}</span>
        <span dir="ltr" className="text-start">
          {o.buyerEmail}
        </span>
        {o.buyerPhone && (
          <span dir="ltr" className="text-start">
            {o.buyerPhone}
          </span>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* The slip is served through an authenticated route, never from public/. */}
        <Button asChild variant="outline" size="sm">
          <Link href={`/api/admin/slip/${o.id}`} target="_blank" rel="noopener">
            <ReceiptIcon />
            ސްލިޕް ބައްލަވާ
          </Link>
        </Button>

        {downloadUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard
                .writeText(`${window.location.origin}${downloadUrl}`)
                .then(() => toast.success("ލިންކު ކޮޕީކުރެވިއްޖެ"))
                .catch(() => toast.error("ކޮޕީ ނުކުރެވުނު"));
            }}
          >
            <CopyIcon />
            ޑައުންލޯޑް ލިންކު
          </Button>
        )}
      </div>

      {o.note && (
        <p className="text-muted-ink mb-3 text-[13px] leading-[1.9]">{o.note}</p>
      )}

      {rejecting ? (
        <div className="grid gap-2">
          <Input
            dir="rtl"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ބާޠިލުކުރާ ސަބަބު…"
          />
          <div className="flex gap-1.5">
            <Button size="sm" variant="destructive" disabled={busy} onClick={() => onReject(note)}>
              ބާޠިލުކުރައްވާ
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>
              <XIcon />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          {o.status !== "approved" && (
            <Button size="sm" disabled={busy} onClick={onApprove}>
              {busy ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
              އެޕްރޫވްކޮށް ފޮނުއްވާ
            </Button>
          )}
          {o.status === "approved" && (
            <Button size="sm" variant="outline" disabled={busy} onClick={onResend}>
              {busy ? <Loader2Icon className="animate-spin" /> : <MailIcon />}
              އަލުން ފޮނުއްވާ
            </Button>
          )}
          {o.status === "pending" && (
            <Button size="sm" variant="ghost" onClick={() => setRejecting(true)}>
              <XIcon />
              ބާޠިލު
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
      )}
    </div>
  );
}

function NewProduct({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="border-rule flex flex-wrap items-end gap-2 rounded-md border p-4">
      <div className="grid min-w-[240px] flex-1 gap-1.5">
        <Label className="text-muted-ink text-[12px]">އައު ފޮތެއް</Label>
        <Input
          dir="rtl"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ފޮތުގެ ނަން…"
        />
      </div>
      <Button
        disabled={pending || !title.trim()}
        onClick={() =>
          start(async () => {
            await addProduct(title);
            setTitle("");
            toast.success("އިތުރުކުރެވިއްޖެ");
            onDone();
          })
        }
      >
        {pending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
        އިތުރުކުރައްވާ
      </Button>
    </div>
  );
}

function ProductCard({
  product: p,
  busy,
  onDelete,
}: {
  product: Product;
  busy: boolean;
  onDelete: () => void;
}) {
  const [cover, setCover] = useState(p.cover);
  const [saving, startSave] = useTransition();
  const [uploading, startUpload] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="border-rule grid gap-4 rounded-md border p-4">
      <form
        action={(fd) =>
          startSave(async () => {
            fd.set("cover", cover);
            const res = await saveProduct(fd);
            if (res.error) toast.error(res.error);
            else toast.success("ރައްކާކުރެވިއްޖެ");
          })
        }
        className="grid gap-3.5"
      >
        <input type="hidden" name="id" value={p.id} />

        <div className="grid gap-3.5 sm:grid-cols-[1fr_140px]">
          <div className="grid gap-1.5">
            <Label className="text-muted-ink text-[12px]">ނަން</Label>
            <Input dir="rtl" name="title" defaultValue={p.title} required />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-muted-ink text-[12px]">އަގު (ރުފިޔާ)</Label>
            <Input
              name="price"
              type="number"
              step="0.01"
              min="0"
              dir="ltr"
              className="text-start"
              defaultValue={money(p.price)}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label className="text-muted-ink text-[12px]">ތަޢާރަފު</Label>
          <Textarea dir="rtl" name="description" rows={3} defaultValue={p.description} />
        </div>

        <div className="grid gap-1.5">
          <Label className="text-muted-ink text-[12px]">ބޭރުގަނޑު</Label>
          <ImageUploader value={cover} onChange={setCover} aspect={3 / 4} />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Switch id={`pub-${p.id}`} name="published" defaultChecked={p.published} />
            <Label htmlFor={`pub-${p.id}`} className="text-[13.5px]">
              ފިހާރައިގައި ދައްކަވާ
            </Label>
          </div>

          <Button type="submit" size="sm" disabled={saving}>
            {saving ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
            ރައްކާކުރައްވާ
          </Button>
        </div>
      </form>

      <div className="border-rule flex flex-wrap items-center gap-2 border-t pt-3.5">
        <span className="text-muted-ink inline-flex items-center gap-1.5 text-[13px]">
          <FileTextIcon className="size-4" aria-hidden />
          {p.filePath ? "ފައިލް އަޕްލޯޑްކުރެވިފައި" : "ފައިލެއް ނެތް"}
        </span>

        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const fd = new FormData();
            fd.set("id", String(p.id));
            fd.set("file", file);
            startUpload(async () => {
              const res = await uploadProductFile(fd);
              if (res.error) toast.error(res.error);
              else toast.success("އަޕްލޯޑްކުރެވިއްޖެ");
              if (fileRef.current) fileRef.current.value = "";
            });
          }}
        />

        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
          PDF އަޕްލޯޑް
        </Button>

        {p.published && (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/store/${p.slug}`} target="_blank" rel="noopener">
              <ExternalLinkIcon />
            </Link>
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
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
