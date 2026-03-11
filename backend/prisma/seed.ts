import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check if super admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { isSuperAdmin: true },
  });

  if (existingAdmin) {
    console.log('Super admin already exists:', existingAdmin.email);
    return;
  }

  const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@hepyonet.com';
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin123!';

  // Create Supabase auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  });

  if (authError) {
    console.error('Failed to create Supabase auth user:', authError.message);
    process.exit(1);
  }

  // Create super admin user (no restaurant needed)
  const user = await prisma.user.create({
    data: {
      supabaseId: authData.user.id,
      email: adminEmail,
      name: 'Super Admin',
      isSuperAdmin: true,
      restaurantId: null,
    },
  });

  console.log('Super admin created:', user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
