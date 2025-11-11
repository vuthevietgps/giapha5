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

  // 1) Seed Families (idempotent)
  const familySamples: Partial<Family & { contactPhone?: string; contactName?: string; address?: string }>[] = [
    { name: 'Dòng họ Nguyễn', contactName: 'Nguyễn Văn A', contactPhone: '0909000001', address: 'Hà Nội' },
    { name: 'Dòng họ Trần', contactName: 'Trần Thị B', contactPhone: '0909000002', address: 'TP. Hồ Chí Minh' },
    { name: 'Dòng họ Lê', contactName: 'Lê Văn C', contactPhone: '0909000003', address: 'Đà Nẵng' },
  ];

  let familyInserts = 0;
  for (const s of familySamples) {
    const res = await FamilyModel.updateOne(
      { name: s.name },
      { $setOnInsert: s },
      { upsert: true }
    );
    if (res.upsertedCount && res.upsertedCount > 0) familyInserts += res.upsertedCount;
  }
  console.log(`Seeded families. Inserted: ${familyInserts}.`);

  // 2) Seed Positions (idempotent)
  const positionSamples = [
    { name: 'Trưởng họ', description: 'Đứng đầu dòng họ', sortOrder: 1 },
    { name: 'Phó họ', description: 'Hỗ trợ công việc', sortOrder: 2 },
    { name: 'Thư ký', description: 'Ghi chép, liên lạc', sortOrder: 3 },
    { name: 'Thủ quỹ', description: 'Quản lý quỹ', sortOrder: 4 },
    { name: 'Cố vấn', description: 'Tư vấn, góp ý', sortOrder: 5 },
  ];
  let positionInserts = 0;
  for (const p of positionSamples) {
    const res = await PositionModel.updateOne({ name: p.name }, { $setOnInsert: p }, { upsert: true });
    if (res.upsertedCount && res.upsertedCount > 0) positionInserts += res.upsertedCount;
  }
  console.log(`Seeded positions. Inserted: ${positionInserts}.`);

  const positions = await PositionModel.find().lean();
  const posMap = new Map<string, Types.ObjectId>();
  for (const p of positions) posMap.set(p.name, p._id as any);

  // 3) Seed ~20 Members across families with valid relationships (idempotent)
  const families = await FamilyModel.find().lean();
  const maleNames = ['Anh', 'Bình', 'Cường', 'Dũng', 'Hùng', 'Khánh', 'Long', 'Minh', 'Nam', 'Quang'];
  const femaleNames = ['Anh', 'Bích', 'Chi', 'Dung', 'Hoa', 'Lan', 'Linh', 'Mai', 'Ngọc', 'Thảo'];

  function vnFullName(familyName: string, isMale: boolean) {
    const first = isMale ? maleNames[Math.floor(Math.random() * maleNames.length)] : femaleNames[Math.floor(Math.random() * femaleNames.length)];
    const middle = isMale ? 'Văn' : 'Thị';
    const last = familyName.replace('Dòng họ ', '');
    return `${last} ${middle} ${first}`;
  }

  async function upsertMember(doc: any) {
    const filter = doc.email ? { email: doc.email } : { family: doc.family, fullName: doc.fullName, dob: doc.dob || null };
    await MemberModel.updateOne(filter, { $setOnInsert: doc }, { upsert: true });
    const found = await MemberModel.findOne(filter).exec();
    return found!;
  }

  let totalCreated = 0;
  for (const fam of families) {
    // Create head and spouse
    const headMale = Math.random() > 0.3; // 70% male head
    const headName = vnFullName(fam.name, true);
    const spouseName = vnFullName(fam.name, false);
    const headDob = new Date(1950 + Math.floor(Math.random() * 10), 1, 1);
    const spouseDob = new Date(1952 + Math.floor(Math.random() * 10), 1, 1);
    const headEmail = `head.${fam._id.toString().slice(-4)}@example.com`;
    const headPwd = await hash('Password@123', 10);
    const spouseEmail = `spouse.${fam._id.toString().slice(-4)}@example.com`;
    const spousePwd = await hash('Password@123', 10);

    const head = await upsertMember({
      fullName: headName,
      family: fam._id,
      gender: 'male',
      dob: headDob,
      email: headEmail,
      password: headPwd,
      position: posMap.get('Trưởng họ'),
    });
    const spouse = await upsertMember({
      fullName: spouseName,
      family: fam._id,
      gender: 'female',
      dob: spouseDob,
      email: spouseEmail,
      password: spousePwd,
      position: posMap.get('Cố vấn'),
    });
    // Link spouse both ways
    await MemberModel.updateOne({ _id: head._id }, { spouse: spouse._id });
    await MemberModel.updateOne({ _id: spouse._id }, { spouse: head._id });

    // Children 3-4
    const childCount = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < childCount; i++) {
      const isMale = Math.random() > 0.5;
      const name = vnFullName(fam.name, isMale);
      const year = 1975 + Math.floor(Math.random() * 15);
      const dob = new Date(year, Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 27));
      const maybeEmail = Math.random() > 0.6 ? `${name.toLowerCase().replace(/\s+/g, '.')}.${i}.${fam._id.toString().slice(-3)}@example.com` : undefined;
      const doc: any = {
        fullName: name,
        family: fam._id,
        gender: isMale ? 'male' : 'female',
        father: head._id,
        dob,
        position: Math.random() > 0.7 ? posMap.get('Thư ký') : undefined,
      };
      if (maybeEmail) {
        doc.email = maybeEmail;
        doc.password = await hash('Password@123', 10);
      }
      await upsertMember(doc);
      totalCreated++;
    }
  }

  console.log(`Seeded members across families. Attempted ~${totalCreated} children + heads/spouses (idempotent).`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
