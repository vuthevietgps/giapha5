export interface Union {
  id?: string;
  family: string;
  partners: string[]; // member IDs
  startDate?: string;
  endDate?: string;
  notes?: string;
}
