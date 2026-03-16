import { Module } from '@nestjs/common';
import { PersonnelController } from './personnel.controller';
import { PersonnelService } from './personnel.service';
import { PositionController } from './position.controller';
import { PositionService } from './position.service';

@Module({
  controllers: [PersonnelController, PositionController],
  providers: [PersonnelService, PositionService],
  exports: [PersonnelService],
})
export class PersonnelModule {}
