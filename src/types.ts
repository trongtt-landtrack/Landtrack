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
  DEPARTMENT_HEAD = 'department_head',
  TEAM_LEADER = 'team_leader',
  PROJECT_ADMIN = 'project_admin',
  PROJECT_MEMBER = 'project_member',
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
