import { Module } from '@nestjs/common';
import { RawMaterialController } from './raw-material.controller';
import { RawMaterialService } from './raw-material.service';
import { StockMovementController } from './stock-movement.controller';
import { StockMovementService } from './stock-movement.service';
import { MaterialTypeController } from './material-type.controller';
import { MaterialTypeService } from './material-type.service';

@Module({
  controllers: [RawMaterialController, StockMovementController, MaterialTypeController],
  providers: [RawMaterialService, StockMovementService, MaterialTypeService],
  exports: [RawMaterialService],
})
export class InventoryModule {}
