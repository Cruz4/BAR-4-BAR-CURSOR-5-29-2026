'use client';

import { auth } from '@/lib/firebase/client/firebase';
import { getClientAppCheckToken } from '@/lib/firebase/client/app-check';
import type { UploadKind, UploadTicketResponse } from '@/lib/upload-gate-types';

async function uploadAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Sign in to upload.');
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${await user.getIdToken()}`,
  };
  const appCheck = await getClientAppCheckToken();
  if (appCheck) {
    headers['X-Firebase-AppCheck'] = appCheck;
  }
  return headers;
}

export async function requestUploadTicket(input: {
  kind: UploadKind;
  storagePath: string;
  byteSize: number;
  contentType: string;
  companionPath?: string;
  companionByteSize?: number;
}): Promise<UploadTicketResponse> {
  const headers = await uploadAuthHeaders();
  const res = await fetch('/api/uploads/ticket', {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
  const data = (await res.json().catch(() => ({}))) as UploadTicketResponse & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || 'Upload not allowed right now.');
  }
  if (!data.ticketId) {
    throw new Error('Upload ticket missing.');
  }
  return { ticketId: data.ticketId, expiresAt: data.expiresAt };
}

export async function completeUploadTicket(ticketId: string): Promise<void> {
  const headers = await uploadAuthHeaders();
  const res = await fetch('/api/uploads/complete', {
    method: 'POST',
    headers,
    body: JSON.stringify({ ticketId }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || 'Could not finalize upload.');
  }
}
