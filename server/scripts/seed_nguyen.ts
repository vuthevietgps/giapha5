import 'dotenv/config';
import mongoose, { Types } from 'mongoose';
import { Family, FamilySchema } from '../src/families/schemas/family.schema';
import { Position, PositionSchema } from '../src/positions/schemas/position.schema';
import { Member, MemberSchema } from '../src/members/schemas/member.schema';
import { hash } from 'bcryptjs';

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/giapha';
  console.log('Connecting to', uri);
  await mongoose.connect(uri);
  const FamilyModel = mongoose.model<Family>('Family', FamilySchema, 'families');
  const PositionModel = mongoose.model<Position>('Position', PositionSchema, 'positions');
  const MemberModel = mongoose.model<Member>('Member', MemberSchema, 'members');

  const nguyen = await FamilyModel.findOne({ name: 'Dòng họ Nguyễn' }).lean();
  if (!nguyen) throw new Error('Không tìm thấy Dòng họ Nguyễn');

  const positions = await PositionModel.find().lean();
  const posMap = new Map<string, Types.ObjectId>();
  for (const p of positions) posMap.set(p.name, p._id as any);

  const members = await MemberModel.find({ family: nguyen._id }).lean();
  const byId = new Map<string, any>();
  members.forEach(m => byId.set(m._id.toString(), m));

  const roots = members.filter(m => !m.father);
  if (!roots.length) throw new Error('Không tìm thấy gốc cho họ Nguyễn');
  const head = roots.find(r => r.gender === 'male') || roots[0];

  function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
  const maleFirst = ['An', 'Bình', 'Cường', 'Dũng', 'Hải', 'Hùng', 'Khánh', 'Long', 'Minh', 'Nam', 'Quang'];
  const femaleFirst = ['Anh', 'Bích', 'Chi', 'Dung', 'Hoa', 'Lan', 'Linh', 'Mai', 'Ngọc', 'Thảo'];
  function name(isMale: boolean) {
    const last = 'Nguyễn';
    const middle = isMale ? 'Văn' : 'Thị';
    const first = isMale ? rand(maleFirst) : rand(femaleFirst);
    return `${last} ${middle} ${first}`;
  }

  async function upsertMember(doc: any) {
    const filter = doc.email ? { email: doc.email } : { family: doc.family, fullName: doc.fullName, dob: doc.dob || null };
    await (mongoose.model as any)('Member').updateOne(filter, { $setOnInsert: doc }, { upsert: true });
    const found = await (mongoose.model as any)('Member').findOne(filter).exec();
    return found!;
  }

  // Ensure each child of the head has a spouse and 1-3 children
  const children = members.filter(m => m.father?.toString() === head._id.toString());
  let created = 0;
  for (const ch of children) {
    // spouse
    let spouse: any = ch.spouse ? await (mongoose.model as any)('Member').findById(ch.spouse).lean() : null;
    if (!spouse) {
      const isFemaleSpouse = ch.gender === 'male';
      const spouseDoc: any = {
        fullName: name(isFemaleSpouse),
        family: nguyen._id,
        gender: isFemaleSpouse ? 'female' : 'male',
        dob: new Date(1970 + Math.floor(Math.random() * 10), 1, 1),
      };
      if (Math.random() > 0.6) {
        spouseDoc.email = `sp.${ch._id.toString().slice(-4)}.${Date.now().toString().slice(-4)}@example.com`;
        spouseDoc.password = await hash('Password@123', 10);
      }
      spouse = await upsertMember(spouseDoc);
      await (mongoose.model as any)('Member').updateOne({ _id: ch._id }, { spouse: spouse._id });
      await (mongoose.model as any)('Member').updateOne({ _id: spouse._id }, { spouse: ch._id });
    }

    // 1-3 children for this couple
    const kidCount = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < kidCount; i++) {
      const isMale = Math.random() > 0.5;
      const dob = new Date(1995 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 27));
      const doc: any = {
        fullName: name(isMale),
        family: nguyen._id,
        gender: isMale ? 'male' : 'female',
        father: ch._id,
        mother: spouse.gender === 'female' ? spouse._id : undefined,
        dob,
        position: Math.random() > 0.85 ? posMap.get('Thư ký') : undefined,
      };
      if (Math.random() > 0.7) {
        doc.email = `kid.${ch._id.toString().slice(-3)}.${i}.${Date.now().toString().slice(-3)}@example.com`;
        doc.password = await hash('Password@123', 10);
      }
      await upsertMember(doc);
      created++;
    }
  }

  console.log(`Seeded Nguyễn: couples ensured=${children.length}, children added/ensured≈${created}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
