import React from 'react';
import { Customer } from '@/types/database';
import { useCustomerProfile } from '@/contexts/CustomerContext';
import { cn } from '@/lib/utils';

interface CustomerLinkProps {
    customer: Customer | null | undefined;
    className?: string;
}

export function CustomerLink({ customer, className }: CustomerLinkProps) {
    const { openCustomerProfile } = useCustomerProfile();

    if (!customer) {
        return <span className="text-muted-foreground">-</span>;
    }

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                openCustomerProfile(customer);
            }}
            className={cn(
                "text-primary font-medium hover:underline text-left transition-colors cursor-pointer",
                className
            )}
            type="button"
        >
            {customer.name}
        </button>
    );
}
