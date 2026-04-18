import { connection } from "next/server";

import { assignRoleAction, createUserBlockAction } from "@/lib/actions/admin";
import { getAdminUsersOverview } from "@/lib/supabase/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function AdminUsersPage() {
  await connection();
  const users = await getAdminUsersOverview();

  return (
    <div className="grid gap-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#7c5b0b]">
          Moderare conturi
        </p>
        <h1 className="mt-2 font-heading text-5xl uppercase tracking-[0.12em] text-[#08140f]">
          Utilizatori și roluri
        </h1>
      </div>

      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user.userId} className="border-[#e7dfbf] bg-white/95">
            <CardContent className="grid gap-4 p-5 xl:grid-cols-[1fr_0.8fr_1fr]">
              <div>
                <p className="font-semibold text-[#08140f]">
                  {user.fullName ?? "Utilizator fără nume"}
                </p>
                <p className="text-sm text-slate-500">{user.email ?? "Fără email"}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span>Roluri: {user.roles.join(", ")}</span>
                  <span>Score abuz: {user.abuseScore}</span>
                  <span>No-show: {Math.round(user.noShowRatio * 100)}%</span>
                </div>
              </div>

              <form action={assignRoleAction} className="grid gap-3 rounded-3xl border border-[#efe6c7] bg-[#fffdf6] p-4">
                <input type="hidden" name="userId" value={user.userId} />
                <Label htmlFor={`role-${user.userId}`}>Atribuie rol</Label>
                <Input
                  id={`role-${user.userId}`}
                  name="role"
                  defaultValue={user.roles[0] ?? "user"}
                />
                <Button type="submit" className="rounded-full bg-[#11552d] hover:bg-[#0e4524]">
                  Salvează rolul
                </Button>
              </form>

              <form action={createUserBlockAction} className="grid gap-3 rounded-3xl border border-[#efe6c7] bg-[#fffdf6] p-4">
                <input type="hidden" name="userId" value={user.userId} />
                <Label htmlFor={`type-${user.userId}`}>Tip restricție</Label>
                <Input id={`type-${user.userId}`} name="type" defaultValue="warning" />
                <Label htmlFor={`reason-${user.userId}`}>Motiv</Label>
                <Input id={`reason-${user.userId}`} name="reason" placeholder="No-show repetat / rezervări suspecte" />
                <Label htmlFor={`ends-${user.userId}`}>Valabil până la</Label>
                <Input id={`ends-${user.userId}`} name="endsAt" type="datetime-local" />
                <Button type="submit" variant="outline" className="rounded-full">
                  Aplică restricția
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
