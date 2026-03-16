import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RestaurantGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Super admins bypass membership check but still need restaurant context
    if (user?.isSuperAdmin) {
      const restaurantId = request.headers['x-restaurant-id'];
      if (restaurantId) {
        const restaurant = await this.prisma.restaurant.findUnique({
          where: { id: restaurantId },
        });
        if (restaurant) {
          request.user = { ...user, restaurantId, restaurant };
        }
      }
      return true;
    }

    const restaurantId = request.headers['x-restaurant-id'];
    if (!restaurantId) {
      throw new ForbiddenException('No restaurant selected');
    }

    const membership = await this.prisma.restaurantMember.findUnique({
      where: {
        userId_restaurantId: {
          userId: user.id,
          restaurantId,
        },
      },
      include: { restaurant: true },
    });

    if (!membership || !membership.isActive) {
      throw new ForbiddenException('No access to this restaurant');
    }

    if (membership.restaurant.status !== 'APPROVED') {
      throw new ForbiddenException('Restaurant not approved yet');
    }

    // Attach restaurant context to request.user so @CurrentUser('restaurantId') keeps working
    request.user = {
      ...user,
      restaurantId,
      memberRole: membership.role,
      restaurant: membership.restaurant,
    };

    return true;
  }
}
