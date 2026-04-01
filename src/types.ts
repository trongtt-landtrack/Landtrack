export interface Agent {
  id: string;
  name: string;
  link?: string;
  dlLink?: string;
  dlText?: string;
  projectLink?: string;
}

export interface Project {
  id: string;
  name: string;
  slogan?: string;
  developer: string;
  location: string;
  type: string;
  status: string;
  imageUrl: string;
  sheetUrl?: string;
  isHot: boolean;
  isFavorite: boolean;
  subdivisions?: Subdivision[];
  headerRow?: number;
  dataStartRow?: number;
  dataEndRow?: number;
  requiredFields?: string[];
  statsFields?: string[];
  filterFields?: string[];
  docStatsField?: string;
  docLinkField?: string;
  headerMatrix?: Record<string, string>;
  standardHeaders?: string[];
  agents?: Agent[];
}

export interface ProjectConfig {
  projectId: string;
  name: string;
  slogan: string;
  developer: string;
  location: string;
  type: string;
  status: string;
  imageUrl: string;
  sheetUrl: string;
  isHot: boolean;
  headerRow: number;
  dataStartRow: number;
  dataEndRow: number;
  requiredFields: string[];
  statsFields: string[];
  filterFields: string[];
  docStatsField: string;
  docLinkField: string;
  headerMatrix: Record<string, string>;
  standardHeaders: string[];
  agents?: Agent[];
}

export interface Subdivision {
  id: string;
  code: string;
  name: string;
  totalUnits: number;
  imageUrl: string;
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  PROJECT_DIRECTOR = 'project_director',
  USER = 'user',
  PENDING = 'pending',
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  phone: string;
  email: string;
  avatarUrl: string;
  departmentId?: string;
  teamId?: string;
}

export interface UnitSearchResult {
  projectId: string;
  projectName: string;
  unitData: any;
}
