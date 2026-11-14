export type ViewportMode = 'fluid' | 'phone' | 'tablet';

export type ProjectFilter = 'all' | 'cloud' | 'local';

export type ProjectStorageType = 'cloud' | 'local';

export type ResolvedAtmosphereMode = 'dawn' | 'noon' | 'sunset' | 'night';

export type GlobeLightingMode = 'auto' | ResolvedAtmosphereMode;

export type ProjectTemplate = 'cadastral' | 'pipeline' | 'photogrammetry';

export interface GisProject {
  id: string;
  name: string;
  path: string;
  storageType: ProjectStorageType;
  linkTypeLabel: string;
  statusLabel: string;
  sizeOrSyncLabel: string;
  coordinateLabel: string;
  lat: number;
  lon: number;
  crs: 'CGCS2000' | 'WGS84' | 'EPSG:2056';
  template: ProjectTemplate;
  layerCount: number;
  featureCount: number;
  lastModified: string;
  thumbnailUrl?: string;
  topologyChecked?: boolean;
  isFeatured?: boolean;
  description: string;
}

export interface AppPreferences {
  globeLighting: GlobeLightingMode;
  autoRotateGlobe: boolean;
  basemapStyle: 'vector-day' | 'satellite-hybrid' | 'terrain-contour';
  launchLastOnStart: boolean;
}

export type AiIntentActionType =
  | 'FOCUS_PROJECT'
  | 'OPEN_PROJECT'
  | 'CREATE_PROJECT'
  | 'FILTER_PROJECTS'
  | 'SYNC_PROJECT'
  | 'PIN_PROJECT'
  | 'SET_ATMOSPHERE'
  | 'TOGGLE_ROTATION'
  | 'OPEN_SETTINGS'
  | 'UNKNOWN';

export interface CreateProjectPrefill {
  name?: string;
  storageType?: ProjectStorageType;
  template?: ProjectTemplate;
  crs?: 'CGCS2000' | 'WGS84' | 'EPSG:2056';
  regionIndex?: number;
}

export interface AiIntentResult {
  action: AiIntentActionType;
  projectId?: string;
  filter?: ProjectFilter;
  atmosphere?: GlobeLightingMode;
  autoRotate?: boolean;
  createDraft?: CreateProjectPrefill;
  reply: string;
  source?: 'gemini' | 'local';
}

