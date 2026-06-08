/** Auth fields attached client-side and verified server-side for AI server actions. */
export type AiSecuredInput = {
  idToken: string;
  userId: string;
  customApiKey?: string;
};
