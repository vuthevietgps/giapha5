import type { Member } from '../../models/member.model';

export type Gender = 'male' | 'female' | 'other' | undefined;

export interface Couple {
  key: string; // stable key (sorted partner ids or single id)
  male?: Member;
  female?: Member;
  members: string[]; // ids included in this couple (1 or 2)
  maleHubKey?: string; // male id for hubs
  femaleHubKey?: string; // female id for hubs (multiple husbands)
  hideMale?: boolean;  // render spouse-only (male is shown in the first couple of the hub)
  hideFemale?: boolean; // render spouse-only (female is shown in the first couple of the hub)
  hideInHub?: boolean; // don't render box for secondary wives when using inside-box hub layout
  extraWives?: (Member | undefined)[]; // wives rendered inside the primary box (excluding base female)
  extraHusbands?: (Member | undefined)[]; // husbands rendered inside the primary box (excluding base male)
  linkVia?: 'father' | 'mother';
  motherIdUsed?: string;
  // parentKey is attached for child couples to reference their parent couple key
  parentKey?: string;
  // Timestamp for sorting siblings (earlier birth -> left). Derived from the child's dob.
  childBirthTs?: number;
}

export type Connection = { fromKey: string; toKey: string; x1: number; y1: number; x2: number; y2: number; d: string; color?: string };
export type LayoutPos = { x: number; y: number; width: number; height: number };
export type NodeDot = { x: number; y: number; color?: string; r?: number };
