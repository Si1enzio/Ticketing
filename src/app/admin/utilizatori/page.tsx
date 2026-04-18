import { connection } from "next/server";

import {
  assignRoleAction,
  createUserBlockAction,
  setReservationAccessAction,
} from "@/lib/actions/admin";
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
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
          Moderare conturi
        </p>
        <h1 className="mt-2 font-heading text-5xl uppercase tracking-[0.08em] text-[#111111]">
          Utilizatori si roluri
        </h1>
      </div>

      <div className="grid gap-4">
        {users.map((user) => (
          <Card
            key={user.userId}
            className="surface-panel overflow-hidden rounded-[28px] border border-white/70 bg-white/92"
          >
            <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fda4af_100%)]" />
            <CardContent className="grid gap-4 p-5 xl:grid-cols-[1fr_0.95fr_1fr]">
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-[#111111]">
                    {user.fullName ?? "Utilizator fara nume"}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {user.email ?? "Fara email"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-neutral-600">
                  <span>Roluri: {user.roles.join(", ")}</span>
                  <span>
                    Acces bilete: {user.canReserve ? "activ" : "oprit"}
                  </span>
                  <span>Score abuz: {user.abuseScore}</span>
                  <span>No-show: {Math.round(user.noShowRatio * 100)}%</span>
                </div>
              </div>

              <div className="grid gap-4">
                <form
                  action={setReservationAccessAction}
                  className="grid gap-3 rounded-[26px] border border-black/6 bg-neutral-50 p-4"
                >
                  <input type="hidden" name="userId" value={user.userId} />
                  <input
                    type="hidden"
                    name="canReserve"
                    value={user.canReserve ? "false" : "true"}
                  />
                  <Label>Solicitare bilete gratuite</Label>
                  <p className="text-sm leading-6 text-neutral-600">
                    Drept explicit pentru utilizatorii obisnuiti. Rolurile administrative
                    pot emite prin privilegii, fara aceasta bifare.
                  </p>
                  <Button
                    type="submit"
                    className={
                      user.canReserve
                        ? "rounded-full border border-[#111111] bg-[#111111] text-white hover:bg-black"
                        : "rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
                    }
                  >
                    {user.canReserve
                      ? "Revoca accesul la bilete"
                      : "Acorda acces la bilete"}
                  </Button>
                </form>

                <form
                  action={assignRoleAction}
                  className="grid gap-3 rounded-[26px] border border-black/6 bg-neutral-50 p-4"
                >
                  <input type="hidden" name="userId" value={user.userId} />
                  <Label htmlFor={`role-${user.userId}`}>Atribuie rol</Label>
                  <Input
                    id={`role-${user.userId}`}
                    name="role"
                    defaultValue={user.roles[0] ?? "user"}
                  />
                  <Button
                    type="submit"
                    className="rounded-full border border-[#111111] bg-[#111111] text-white hover:bg-black"
                  >
                    Salveaza rolul
                  </Button>
                </form>
              </div>

              <form
                action={createUserBlockAction}
                className="grid gap-3 rounded-[26px] border border-black/6 bg-neutral-50 p-4"
              >
                <input type="hidden" name="userId" value={user.userId} />
                <Label htmlFor={`type-${user.userId}`}>Tip restrictie</Label>
                <Input id={`type-${user.userId}`} name="type" defaultValue="warning" />
                <Label htmlFor={`reason-${user.userId}`}>Motiv</Label>
                <Input
                  id={`reason-${user.userId}`}
                  name="reason"
                  placeholder="No-show repetat / rezervari suspecte"
                />
                <Label htmlFor={`ends-${user.userId}`}>Valabil pana la</Label>
                <Input id={`ends-${user.userId}`} name="endsAt" type="datetime-local" />
                <Button
                  type="submit"
                  variant="outline"
                  className="rounded-full border-[#dc2626]/18 bg-white text-[#b91c1c] hover:bg-[#fef2f2]"
                >
                  Aplica restrictia
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
