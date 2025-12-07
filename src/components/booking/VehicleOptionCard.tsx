'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

export interface VehicleOption {
  id: string;
  name: string;
  passengerCapacity: number;
  luggageCapacity: string;
  price: number;
  imageUrl?: string;
}

interface VehicleOptionCardProps {
  vehicle: VehicleOption;
  isSelected: boolean;
  onSelect: (vehicleId: string) => void;
}

export function VehicleOptionCard({ vehicle, isSelected, onSelect }: VehicleOptionCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(vehicle.id)}
      className="cursor-pointer"
    >
      <Card
        className={cn(
          'transition-all duration-200',
          {
            'ring-2 ring-[#25A89B] border-[#25A89B]': isSelected,
            'hover:border-[#25A89B] hover:shadow-md': !isSelected,
          }
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {vehicle.imageUrl ? (
              <img
                src={vehicle.imageUrl}
                alt={vehicle.name}
                className="w-20 h-20 object-cover rounded-lg"
              />
            ) : (
              <div className="w-20 h-20 bg-slate-200 rounded-lg flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-slate-900">{vehicle.name}</h3>
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span>{vehicle.passengerCapacity} passengers</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                  <span>{vehicle.luggageCapacity}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[#25A89B]">
                R {vehicle.price.toFixed(2)}
              </div>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="mt-2 text-xs text-[#25A89B] font-medium"
                >
                  Selected
                </motion.div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

