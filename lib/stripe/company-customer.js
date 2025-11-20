import Stripe from 'stripe';
import { Company } from '@/models';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Get or create a Stripe customer for a company
 * @param {Object} params
 * @param {Object} params.company - Company document from database
 * @param {Object} params.org - Organization document with stripeAccountId
 * @returns {Promise<string>} - Stripe customer ID
 */
export async function getOrCreateCompanyStripeCustomer({ company, org }) {
  // If company already has a Stripe customer ID, return it
  if (company.stripeCustomerId) {
    console.log('✅ Company already has Stripe customer:', company.stripeCustomerId);
    return company.stripeCustomerId;
  }

  console.log('🆕 Creating new Stripe customer for company:', company.name);

  // Prepare address object (only include if we have at least one field)
  const address = {};
  if (company.address?.address1) address.line1 = company.address.address1;
  if (company.address?.address2) address.line2 = company.address.address2;
  if (company.address?.city) address.city = company.address.city;
  if (company.address?.state) address.state = company.address.state;
  if (company.address?.postcode) address.postal_code = company.address.postcode;
  if (company.address?.country) address.country = company.address.country;

  // Create Stripe customer
  const stripeCustomer = await stripe.customers.create({
    name: company.name,
    email: company.contactEmail,
    phone: company.contactPhone || undefined,
    address: Object.keys(address).length > 0 ? address : undefined,
    metadata: {
      companyId: company._id.toString(),
      orgId: org._id.toString(),
      abn: company.abn || '',
      contactName: company.contactName
    }
  }, {
    stripeAccount: org.stripeAccountId
  });

  console.log('✅ Created Stripe customer:', stripeCustomer.id);

  // Update company record with Stripe customer ID
  await Company.findByIdAndUpdate(company._id, {
    stripeCustomerId: stripeCustomer.id
  });

  return stripeCustomer.id;
}

/**
 * Update company Stripe customer details
 * @param {Object} params
 * @param {Object} params.company - Company document from database
 * @param {Object} params.org - Organization document with stripeAccountId
 * @returns {Promise<Object>} - Updated Stripe customer
 */
export async function updateCompanyStripeCustomer({ company, org }) {
  if (!company.stripeCustomerId) {
    throw new Error('Company does not have a Stripe customer ID');
  }

  // Prepare address object
  const address = {};
  if (company.address?.address1) address.line1 = company.address.address1;
  if (company.address?.address2) address.line2 = company.address.address2;
  if (company.address?.city) address.city = company.address.city;
  if (company.address?.state) address.state = company.address.state;
  if (company.address?.postcode) address.postal_code = company.address.postcode;
  if (company.address?.country) address.country = company.address.country;

  // Update Stripe customer
  const stripeCustomer = await stripe.customers.update(
    company.stripeCustomerId,
    {
      name: company.name,
      email: company.contactEmail,
      phone: company.contactPhone || undefined,
      address: Object.keys(address).length > 0 ? address : undefined,
      metadata: {
        companyId: company._id.toString(),
        orgId: org._id.toString(),
        abn: company.abn || '',
        contactName: company.contactName
      }
    },
    {
      stripeAccount: org.stripeAccountId
    }
  );

  console.log('✅ Updated Stripe customer:', stripeCustomer.id);

  return stripeCustomer;
}
