import { redirect } from "next/navigation";
import { UserManager, type UserRow } from "@/components/admin/user-manager";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "ފަރާތްތައް" };

export default async function UsersPage() {
  const me = await requireUser();
  // Editors can change their own password but not manage the roster.
  if (me.role !== "admin") redirect("/admin");

  const rows = getDb()
    .prepare("SELECT id, username, name, email, role, created_at FROM users ORDER BY id")
    .all() as (Omit<UserRow, "createdAt"> & { created_at: string })[];

  const users: UserRow[] = rows.map((r) => ({
    id: r.id,
    username: r.username,
    name: r.name,
    email: r.email,
    role: r.role,
    createdAt: r.created_at,
  }));

  return <UserManager users={users} me={{ id: me.id, role: me.role }} />;
}
