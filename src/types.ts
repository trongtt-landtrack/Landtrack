export interface Project {
  id: string;
  name: string;
  developer: string;
  location: string;
  type: string;
  status: string;
  imageUrl: string;
  sheetUrl?: string;
  isHot: boolean;
  isFavorite: boolean;
  subdivisions?: Subdivision[];
}

export interface Subdivision {
  id: string;
  code: string;
  name: string;
  totalUnits: number;
  imageUrl: string;
}

export interface User {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  avatarUrl: string;
}
