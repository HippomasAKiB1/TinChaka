import { Vehicle } from '@prisma/client';
import { prisma } from '../config/db';
import { AppError } from '../types/AppError';

// Updates the driver's vehicle online/availability status
export async function setOnlineStatus(driverId: string, isOnline: boolean): Promise<Vehicle> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { driver_id: driverId },
  });

  if (!vehicle) {
    throw new AppError(404, 'No vehicle registered for this driver', 'VEHICLE_NOT_FOUND');
  }

  return await prisma.vehicle.update({
    where: { driver_id: driverId },
    data: { is_online: isOnline },
  });
}
