import { config as loadEnv } from 'dotenv';
import { join } from 'path';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../config/data-source';
import { Role, ROLE } from '../users/entities/role.entity';
import { Permission, PERM } from '../users/entities/permission.entity';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';

loadEnv({ path: join(__dirname, '../../../../.env') });

// role → permission key matrix
const ROLE_PERMS: Record<string, string[]> = {
  [ROLE.SUPER_ADMIN]: Object.values(PERM),
  [ROLE.ADMIN]: [
    PERM.USER_CREATE, PERM.USER_EDIT, PERM.MEDIA_UPLOAD,
    PERM.MEDIA_DELETE_OWN, PERM.MEDIA_DELETE_ANY, PERM.CATEGORY_MANAGE,
    PERM.ALBUM_MANAGE, PERM.ANALYTICS_VIEW,
  ],
  [ROLE.USER]: [PERM.MEDIA_UPLOAD, PERM.MEDIA_DELETE_OWN, PERM.ALBUM_MANAGE],
};

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD ?? 'ChangeMe!123';

async function seed() {
  const ds = await new DataSource(dataSourceOptions).initialize();
  const permRepo = ds.getRepository(Permission);
  const roleRepo = ds.getRepository(Role);
  const userRepo = ds.getRepository(User);
  const catRepo = ds.getRepository(Category);

  // permissions
  const permEntities = new Map<string, Permission>();
  for (const key of Object.values(PERM)) {
    let p = await permRepo.findOne({ where: { key } });
    if (!p) p = await permRepo.save(permRepo.create({ key }));
    permEntities.set(key, p);
  }

  // roles
  const roleEntities = new Map<string, Role>();
  for (const name of Object.values(ROLE)) {
    let role = await roleRepo.findOne({ where: { name }, relations: ['permissions'] });
    if (!role) role = roleRepo.create({ name, permissions: [] });
    role.permissions = ROLE_PERMS[name].map((k) => permEntities.get(k)!).filter(Boolean);
    role = await roleRepo.save(role);
    roleEntities.set(name, role);
  }

  // default accounts
  const accounts = [
    { email: 'super@mediavault.local', username: 'superadmin', role: ROLE.SUPER_ADMIN, displayName: 'Super Admin' },
    { email: 'admin@mediavault.local', username: 'admin', role: ROLE.ADMIN, displayName: 'Admin' },
    { email: 'user@mediavault.local', username: 'creator', role: ROLE.USER, displayName: 'Demo Creator' },
  ];
  for (const acc of accounts) {
    const exists = await userRepo.findOne({ where: { email: acc.email } });
    if (exists) continue;
    await userRepo.save(
      userRepo.create({
        email: acc.email,
        username: acc.username,
        displayName: acc.displayName,
        passwordHash: await bcrypt.hash(DEFAULT_PASSWORD, 12),
        status: 'active',
        roles: [roleEntities.get(acc.role)!],
      }),
    );
    console.log(`  created ${acc.role}: ${acc.email}`);
  }

  // categories
  const categories = ['Nature', 'Portraits', 'Architecture', 'Travel', 'Street', 'Aerial', 'Wildlife', 'Cinematic', 'Black & White'];
  for (const name of categories) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const exists = await catRepo.findOne({ where: { slug } });
    if (!exists) await catRepo.save(catRepo.create({ name, slug }));
  }

  console.log('\n✅ Seed complete.');
  console.log(`   Default password for all accounts: ${DEFAULT_PASSWORD}`);
  await ds.destroy();
}

seed().catch((e) => {
  console.error('Seed failed', e);
  process.exit(1);
});
