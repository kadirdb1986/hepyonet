import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { UserModule } from './user/user.module';
import { AdminModule } from './admin/admin.module';
import { PersonnelModule } from './personnel/personnel.module';
import { FinanceModule } from './finance/finance.module';
import { InventoryModule } from './inventory/inventory.module';
import { ProductModule } from './product/product.module';
import { CategoryModule } from './category/category.module';
import { MenuModule } from './menu/menu.module';
import { ReportModule } from './report/report.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    SupabaseModule,
    AuthModule,
    RestaurantModule,
    UserModule,
    AdminModule,
    PersonnelModule,
    FinanceModule,
    InventoryModule,
    ProductModule,
    CategoryModule,
    MenuModule,
    ReportModule,
  ],
})
export class AppModule {}
