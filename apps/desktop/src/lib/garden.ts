import { api, ApiError } from "@/lib/api";
import type { GardenInvitationView, GardenPerson } from "@/lib/garden-types";

export async function getGardenDashboard() {
  return api<{
    people: GardenPerson[];
    incomingInvites: GardenInvitationView[];
    outgoingInvites: GardenInvitationView[];
    guestCount: number;
    maxGuests: number;
    capacity: number;
  }>("/garden/dashboard");
}

export async function getGardenStatuses() {
  return api("/garden/statuses");
}

export async function getIncomingInvitations() {
  const data = await api<{ incoming: GardenInvitationView[] }>(
    "/garden/invites",
  );
  return data.incoming;
}

export async function getOutgoingInvitations() {
  const data = await api<{ outgoing: GardenInvitationView[] }>(
    "/garden/invites",
  );
  return data.outgoing;
}

export async function getPendingInviteCount() {
  const incoming = await getIncomingInvitations();
  return incoming.length;
}

type Ok = { error?: undefined; invitedName?: string };
type Err = { error: string };
export type GardenActionResult = Ok | Err;

async function wrap(fn: () => Promise<Ok>): Promise<GardenActionResult> {
  try {
    return await fn();
  } catch (error) {
    return {
      error:
        error instanceof ApiError ? error.message : "Something went wrong",
    };
  }
}

export async function inviteGardenMember(email: string) {
  return wrap(() =>
    api<Ok>("/garden/invite", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  );
}

export async function addGardenMember(email: string) {
  return inviteGardenMember(email);
}

export async function acceptGardenInvitation(invitationId: string) {
  return wrap(() =>
    api<Ok>(`/garden/invites/${invitationId}/accept`, { method: "POST" }),
  );
}

export async function declineGardenInvitation(invitationId: string) {
  return wrap(() =>
    api<Ok>(`/garden/invites/${invitationId}/decline`, { method: "POST" }),
  );
}

export async function cancelGardenInvitation(invitationId: string) {
  return wrap(() =>
    api<Ok>(`/garden/invites/${invitationId}/cancel`, { method: "POST" }),
  );
}

export async function removeGardenMember(memberId: string) {
  return wrap(() => api<Ok>(`/garden/members/${memberId}`, { method: "DELETE" }));
}
