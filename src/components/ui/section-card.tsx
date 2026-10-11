import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: 'default' | 'elevated' | 'glow' | 'subtle';
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  variant = 'default',
}) => {
  return (
    <Card variant={variant} className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div>
          {typeof title === 'string' ? <CardTitle>{title}</CardTitle> : title}
          {description && (
            <div className="mt-1">
              {typeof description === 'string' ? (
                <CardDescription>{description}</CardDescription>
              ) : (
                description
              )}
            </div>
          )}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </CardHeader>
      <CardContent className={cn('pt-2', contentClassName)}>{children}</CardContent>
    </Card>
  );
};
