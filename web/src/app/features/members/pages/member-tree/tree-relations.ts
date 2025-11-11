import { firstValueFrom } from 'rxjs';
import type { Member } from '../../models/member.model';

export interface ResolveFatherDeps {
  openFatherDialog: (mother: Member, fathers: Member[]) => Promise<Member | null>;
  spousesByMember: Record<string, Member[]>;
  root: Member | null;
  preferredFatherByMother: Record<string, string>;
}

export async function resolveFatherForMotherAsync(mother: Member, deps: ResolveFatherDeps): Promise<Member | null> {
  const { openFatherDialog, spousesByMember, root, preferredFatherByMother } = deps;
  const partners = spousesByMember[mother.id!] || [];
  const males = partners.filter(p => p.gender === 'male');
  if (males.length === 1) return males[0];
  if (males.length > 1){
    const cachedId = preferredFatherByMother[mother.id!];
    const cached = cachedId ? males.find(m => m.id === cachedId) : undefined;
    if (cached) return cached;
    const picked = await openFatherDialog(mother, males);
    if (picked) { preferredFatherByMother[mother.id!] = picked.id!; return picked; }
    throw new Error('cancelled');
  }
  if (root && root.gender === 'male'){
    const rootPartners = spousesByMember[root.id!] || [];
    if (rootPartners.find(p=> p.id === mother.id)) return root;
  }
  return null;
}

export interface EnsureUnionDeps {
  listUnions: (partnerId: string) => Promise<any[]>;
  createUnion: (motherId: string, fatherId: string) => Promise<void>;
}

export async function ensureUnionIfNeeded(motherId?: string, fatherId?: string, deps?: EnsureUnionDeps): Promise<void> {
  if (!motherId || !fatherId || !deps) return;
  try {
    const unions = await deps.listUnions(motherId);
    const exists = unions?.some(u => (u.partners||[]).includes(motherId) && (u.partners||[]).includes(fatherId));
    if (exists) return;
    await deps.createUnion(motherId, fatherId);
  } catch {}
}
