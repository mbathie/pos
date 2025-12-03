// Feature components and metadata imports

// Operational Features
import MembershipPauseFeature, { membershipPauseMeta } from './membership-pause';
import MembershipCancellationFeature, { membershipCancellationMeta } from './membership-cancellation';
import MembershipCardManagementFeature, { membershipCardManagementMeta } from './membership-card-management';
import CheckinSystemFeature, { checkinSystemMeta } from './checkin-system';
import LocationHoursFeature, { locationHoursMeta } from './location-hours';
import SubscriptionWebhooksFeature, { subscriptionWebhooksMeta } from './subscription-webhooks';
import ScheduleCalendarFeature, { scheduleCalendarMeta } from './schedule-calendar';
import InvoicePaymentLinksFeature, { invoicePaymentLinksMeta } from './invoice-payment-links';

// Product Features
import MembershipProductsFeature, { membershipProductsMeta } from './membership-products';
import ShopItemsFeature, { shopItemsMeta } from './shop-items';
import ClassesCoursesFeature, { classesCoursesMeta } from './classes-courses';

// System Features
import POSInterfacesFeature, { posInterfacesMeta } from './pos-interfaces';
import DiscountsAdjustmentsFeature, { discountsAdjustmentsMeta } from './discounts-adjustments';
import WaiversFeature, { waiversMeta } from './waivers';
import CustomerManagementFeature, { customerManagementMeta } from './customer-management';
import CompanyPaymentsFeature, { companyPaymentsMeta } from './company-payments';
import TransactionsFeature, { transactionsMeta } from './transactions';
import RefundsFeature, { refundsMeta } from './refunds';

// Re-export all components and metadata
export {
  MembershipPauseFeature,
  membershipPauseMeta,
  MembershipCancellationFeature,
  membershipCancellationMeta,
  MembershipCardManagementFeature,
  membershipCardManagementMeta,
  CheckinSystemFeature,
  checkinSystemMeta,
  LocationHoursFeature,
  locationHoursMeta,
  SubscriptionWebhooksFeature,
  subscriptionWebhooksMeta,
  ScheduleCalendarFeature,
  scheduleCalendarMeta,
  InvoicePaymentLinksFeature,
  invoicePaymentLinksMeta,
  MembershipProductsFeature,
  membershipProductsMeta,
  ShopItemsFeature,
  shopItemsMeta,
  ClassesCoursesFeature,
  classesCoursesMeta,
  POSInterfacesFeature,
  posInterfacesMeta,
  DiscountsAdjustmentsFeature,
  discountsAdjustmentsMeta,
  WaiversFeature,
  waiversMeta,
  CustomerManagementFeature,
  customerManagementMeta,
  CompanyPaymentsFeature,
  companyPaymentsMeta,
  TransactionsFeature,
  transactionsMeta,
  RefundsFeature,
  refundsMeta,
};

// Feature category definitions
export const operationalFeatures = [
  membershipPauseMeta,
  membershipCancellationMeta,
  membershipCardManagementMeta,
  checkinSystemMeta,
  locationHoursMeta,
  subscriptionWebhooksMeta,
  scheduleCalendarMeta,
  invoicePaymentLinksMeta,
];

export const productFeatures = [
  membershipProductsMeta,
  shopItemsMeta,
  classesCoursesMeta,
];

export const systemFeatures = [
  posInterfacesMeta,
  discountsAdjustmentsMeta,
  waiversMeta,
  customerManagementMeta,
  companyPaymentsMeta,
  transactionsMeta,
  refundsMeta,
];

export const allFeatures = [...operationalFeatures, ...productFeatures, ...systemFeatures];

// Map of feature ID to component
export const featureComponents = {
  'membership-pause': MembershipPauseFeature,
  'membership-cancellation': MembershipCancellationFeature,
  'membership-card-management': MembershipCardManagementFeature,
  'checkin-system': CheckinSystemFeature,
  'location-hours': LocationHoursFeature,
  'subscription-webhooks': SubscriptionWebhooksFeature,
  'schedule-calendar': ScheduleCalendarFeature,
  'invoice-payment-links': InvoicePaymentLinksFeature,
  'membership-products': MembershipProductsFeature,
  'shop-items': ShopItemsFeature,
  'classes-courses': ClassesCoursesFeature,
  'pos-interfaces': POSInterfacesFeature,
  'discounts-adjustments': DiscountsAdjustmentsFeature,
  'waivers': WaiversFeature,
  'customer-management': CustomerManagementFeature,
  'company-payments': CompanyPaymentsFeature,
  'transactions': TransactionsFeature,
  'refunds': RefundsFeature,
};
