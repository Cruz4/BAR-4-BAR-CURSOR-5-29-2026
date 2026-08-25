/**
 * Reversible Scene home redesign.
 *
 * The live choice is stored in Firestore at `config/sceneLayout` and is managed
 * from Admin -> Config. This value is only the safe bootstrap/failure default.
 */
export const SCENE_PORTAL_HUB_DEFAULT_ENABLED = true;

export const SCENE_LAYOUT_CHANGED_EVENT = 'b4b:scene-layout-changed';

export type SceneLayoutSource = 'admin' | 'default_portal';

export type SceneLayoutPublicStatus = {
  portalHubEnabled: boolean;
  source: SceneLayoutSource;
  updatedAt: string | null;
};

export type SceneLayoutAdminConfig = SceneLayoutPublicStatus & {
  updatedBy: string | null;
};
