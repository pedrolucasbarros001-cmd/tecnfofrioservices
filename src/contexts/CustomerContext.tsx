import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Customer } from '@/types/database';

interface CustomerContextType {
    selectedCustomer: Customer | null;
    isOpen: boolean;
    openCustomerProfile: (customer: Customer) => void;
    closeCustomerProfile: () => void;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: ReactNode }) {
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const openCustomerProfile = (customer: Customer) => {
        setSelectedCustomer(customer);
        setIsOpen(true);
    };

    const closeCustomerProfile = () => {
        setIsOpen(false);
        // We don't null out selectedCustomer immediately to avoid layout shifts during closing animation
    };

    return (
        <CustomerContext.Provider
            value={{
                selectedCustomer,
                isOpen,
                openCustomerProfile,
                closeCustomerProfile,
            }}
        >
            {children}
        </CustomerContext.Provider>
    );
}

export function useCustomerProfile() {
    const context = useContext(CustomerContext);
    if (context === undefined) {
        throw new Error('useCustomerProfile must be used within a CustomerProvider');
    }
    return context;
}
