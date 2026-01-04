export interface Member {
  id?: string;
  fullName: string;
  photoUrl?: string;
  phone?: string;
  email?: string;
  password?: string;
  family: string; // family id
  father?: string; // member id
  spouse?: string; // member id
  mother?: string; // member id
  bio?: string;
  dob?: string; // ISO date string
  dod?: string; // ISO date string
  position?: string; // position id
  gender?: 'male' | 'female' | 'other';
  isMartyred?: boolean;
}
