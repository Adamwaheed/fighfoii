"use client";

import { useActionState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  changePasswordAction,
  createUserAction,
  deleteUserAction,
  type AuthFormState,
} from "@/lib/auth-actions";
import { formatDate } from "@/lib/utils-format";
import { PlusIcon, Trash2Icon } from "lucide-react";

const initial: AuthFormState = { error: null };

export interface UserRow {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = { admin: "އެޑްމިން", editor: "އެޑިޓަރު" };

function Err({ state }: { state: AuthFormState }) {
  if (!state.error) return null;
  return (
    <p role="alert" className="text-destructive text-[13.5px] leading-[1.8]">
      {state.error}
    </p>
  );
}

export function UserManager({
  users,
  me,
}: {
  users: UserRow[];
  me: { id: number; role: string };
}) {
  const [createState, createAction, creating] = useActionState(createUserAction, initial);
  const [pwState, pwAction, changing] = useActionState(changePasswordAction, initial);
  const [pending, start] = useTransition();
  const isAdmin = me.role === "admin";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">ބޭނުންކުރައްވާ ފަރާތްތައް</CardTitle>
          <CardDescription>
            އައު އެކައުންޓު އުފެއްދޭނީ މި ޕެނަލުން އެކަންޏެވެ.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ނަން</TableHead>
                <TableHead>ޔޫޒަރނޭމް</TableHead>
                <TableHead>ދަރަޖަ</TableHead>
                <TableHead className="hidden sm:table-cell">އުފެއްދި ތާރީޚު</TableHead>
                <TableHead className="w-px" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    {u.name}
                    {u.id === me.id && (
                      <span className="text-faint-ink text-xs"> (ތިޔަ ބޭފުޅާ)</span>
                    )}
                  </TableCell>
                  <TableCell dir="ltr" className="text-start font-mono text-xs">
                    {u.username}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell whitespace-nowrap">
                    {formatDate(u.createdAt)}
                  </TableCell>
                  <TableCell>
                    {isAdmin && u.id !== me.id ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="ފޮހެލާ" disabled={pending}>
                            <Trash2Icon className="text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-heading">
                              {u.name} ފޮހެލަންތޯ؟
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              މި ޢަމަލު އަނބުރާ ނުގެނެވޭނެއެވެ.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ބާޠިލު</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                start(async () => {
                                  const res = await deleteUserAction(u.id);
                                  if (res?.error) toast.error(res.error);
                                  else toast.success("ފޮހެލެވިއްޖެ");
                                })
                              }
                            >
                              ފޮހެލާ
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <span className="text-faint-ink px-3">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {isAdmin && (
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="font-heading text-xl">އައު އެކައުންޓު</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createAction} className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-muted-ink text-[13px]">ނަން</Label>
                  <Input dir="rtl" name="name" placeholder="ފުރިހަމަ ނަން…" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-muted-ink text-[13px]">ޔޫޒަރނޭމް</Label>
                  <Input dir="ltr" name="username" required className="text-start" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-muted-ink text-[13px]">ޕާސްވޯޑު</Label>
                  <Input
                    dir="ltr"
                    name="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    className="text-start"
                  />
                  <p className="text-faint-ink text-[12px]">މަދުވެގެން 8 އަކުރު</p>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-muted-ink text-[13px]">ދަރަޖަ</Label>
                  <Select name="role" defaultValue="editor">
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">އެޑިޓަރު</SelectItem>
                      <SelectItem value="admin">އެޑްމިން</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Err state={createState} />
                <Button type="submit" disabled={creating}>
                  <PlusIcon />
                  އުފައްދަވާ
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="font-heading text-xl">ޕާސްވޯޑު ބަދަލުކުރެއްވުން</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={pwAction} className="grid gap-3">
              <div className="grid gap-1.5">
                <Label className="text-muted-ink text-[13px]">މިހާރުގެ ޕާސްވޯޑު</Label>
                <Input dir="ltr" name="current" type="password" required className="text-start" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-muted-ink text-[13px]">އައު ޕާސްވޯޑު</Label>
                <Input
                  dir="ltr"
                  name="next"
                  type="password"
                  required
                  autoComplete="new-password"
                  className="text-start"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-muted-ink text-[13px]">އަލުން</Label>
                <Input
                  dir="ltr"
                  name="confirm"
                  type="password"
                  required
                  autoComplete="new-password"
                  className="text-start"
                />
              </div>
              <Err state={pwState} />
              <Button type="submit" variant="outline" disabled={changing}>
                ބަދަލުކުރައްވާ
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
