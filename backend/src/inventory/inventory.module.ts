import { Module } from '@nestjs/common';
import { RawMaterialController } from './raw-material.controller';
import { RawMaterialService } from './raw-material.service';
import { StockMovementController } from './stock-movement.controller';
import { StockMovementService } from './stock-movement.service';
import { MaterialTypeController } from './material-type.controller';
import { MaterialTypeService } from './material-type.service';
import { SupplierController } from './supplier.controller';
import { SupplierService } from './supplier.service';

@Module({
  controllers: [RawMaterialController, StockMovementController, MaterialTypeController, SupplierController],
  providers: [RawMaterialService, StockMovementService, MaterialTypeService, SupplierService],
  exports: [RawMaterialService],
})
export class InventoryModule {}
