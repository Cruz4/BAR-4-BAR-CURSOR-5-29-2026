/** Shared upload gate kinds — safe for client + server imports. */
export type UploadKind = 'wall_image' | 'wall_video' | 'voice' | 'drop_audio' | 'sheet_take' | 'profile_preview';

export type UploadTicketResponse = {
  ticketId: string;
  expiresAt: string;
};
