import React from 'react';
import { Drawer } from './drawer';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = (props) => {
  return <Drawer {...props} side="bottom" />;
};
