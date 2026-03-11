import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class RestaurantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Super admins bypass restaurant check
    if (user?.isSuperAdmin) {
      return true;
    }

    if (!user?.restaurantId) {
      throw new ForbiddenException('No restaurant associated');
    }

    if (user.restaurant?.status !== 'APPROVED') {
      throw new ForbiddenException('Restaurant not approved yet');
    }

    return true;
  }
}
