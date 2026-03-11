import { Module } from '@nestjs/common';
import { RawMaterialController } from './raw-material.controller';
import { RawMaterialService } from './raw-material.service';
import { StockMovementController } from './stock-movement.controller';
import { StockMovementService } from './stock-movement.service';

@Module({
  controllers: [RawMaterialController, StockMovementController],
  providers: [RawMaterialService, StockMovementService],
  exports: [RawMaterialService],
})
export class InventoryModule {}
