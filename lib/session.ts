import { cookies } from 'next/headers';
import { Customer } from '@/lib/types';
import { TDStore } from '@/lib/firebase/store';
import { SEED_CUSTOMERS } from '@/lib/data/seedData';

const CUSTOMER_COOKIE_NAME = 'td_customer_id';

export async function getCurrentCustomer(): Promise<Customer> {
  const cookieStore = await cookies();
  const customerId = cookieStore.get(CUSTOMER_COOKIE_NAME)?.value || 'cust_sarah_connor';

  const customer = await TDStore.getCustomer(customerId);
  if (customer) {
    return customer;
  }

  // Fallback to default demo customer
  return SEED_CUSTOMERS[0];
}

export function getDefaultCustomerId(): string {
  return 'cust_sarah_connor';
}
