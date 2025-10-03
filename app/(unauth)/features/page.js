'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, ChevronDown, FileText, PauseCircle, XCircle, CheckCircle, Clock, Bell, Package, ShoppingCart, Calendar, Percent, FileCheck, Folder, Users, Receipt } from 'lucide-react';
// Flowchart removed

export default function FeaturesPage() {
  const [activeSection, setActiveSection] = useState('membership-pause');
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [isSystemOpen, setIsSystemOpen] = useState(false);

  const operationalFeatures = [
    {
      id: 'membership-pause',
      title: 'Membership Pause/Suspension',
      Icon: PauseCircle
    },
    {
      id: 'membership-cancellation',
      title: 'Membership Cancellation',
      Icon: XCircle
    },
    {
      id: 'checkin-system',
      title: 'Check-in System',
      Icon: CheckCircle
    },
    {
      id: 'location-hours',
      title: 'Location Hours & Closed Days',
      Icon: Clock
    },
    {
      id: 'subscription-webhooks',
      title: 'Subscription Renewal Webhooks',
      Icon: Bell
    }
  ];

  const productFeatures = [
    {
      id: 'membership-products',
      title: 'Membership Products',
      Icon: Package
    },
    {
      id: 'shop-items',
      title: 'Shop Items',
      Icon: ShoppingCart
    },
    {
      id: 'classes-courses',
      title: 'Classes & Courses',
      Icon: Calendar
    }
  ];

  const systemFeatures = [
    {
      id: 'discounts-adjustments',
      title: 'Discounts & Adjustments',
      Icon: Percent
    },
    {
      id: 'waivers',
      title: 'Waivers',
      Icon: FileCheck
    },
    {
      id: 'folders',
      title: 'Folders',
      Icon: Folder
    },
    {
      id: 'customer-management',
      title: 'Customer Management',
      Icon: Users
    },
    {
      id: 'transactions',
      title: 'Transaction Management',
      Icon: Receipt
    }
  ];

  const features = [...operationalFeatures, ...productFeatures, ...systemFeatures];

  useEffect(() => {
    const handleScroll = () => {
      const sections = features.map(f => document.getElementById(f.id));
      const scrollPosition = window.scrollY + 100;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(features[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-8xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6" />
            <h1 className="text-xl font-semibold">POS System Features</h1>
          </div>
        </div>
      </div>

      <div className="max-w-8xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar - Table of Contents */}
          <aside className="w-90 shrink-0 sticky top-20 self-start hidden lg:block">
            <Card>
              <CardContent className="p-4">
                <h2 className="font-semibold mb-4 text-sm uppercase text-muted-foreground">
                  Table of Contents
                </h2>
                <ScrollArea className="h-[calc(100vh-12rem)]">
                  <nav className="space-y-1">
                    {/* Operational Features */}
                    {operationalFeatures.map((feature) => {
                      const Icon = feature.Icon;
                      return (
                        <Button
                          key={feature.id}
                          variant="ghost"
                          className={`w-full justify-start text-left h-auto py-2 px-3 cursor-pointer ${
                            activeSection === feature.id
                              ? 'bg-accent text-accent-foreground font-medium'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                          onClick={() => scrollToSection(feature.id)}
                        >
                          <Icon className="h-4 w-4 mr-2 shrink-0" />
                          <span className="flex-1 text-sm">{feature.title}</span>
                          {activeSection === feature.id && (
                            <ChevronRight className="h-4 w-4 shrink-0" />
                          )}
                        </Button>
                      );
                    })}

                    {/* Product Setup - Collapsible */}
                    <Collapsible open={isProductsOpen} onOpenChange={setIsProductsOpen}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-left h-auto py-2 px-3 cursor-pointer text-muted-foreground hover:text-foreground font-medium"
                        >
                          {isProductsOpen ? (
                            <ChevronDown className="h-4 w-4 mr-2 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 mr-2 shrink-0" />
                          )}
                          <span className="flex-1 text-sm">Product Setup</span>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-1">
                        {productFeatures.map((feature) => {
                          const Icon = feature.Icon;
                          return (
                            <Button
                              key={feature.id}
                              variant="ghost"
                              className={`w-full justify-start text-left h-auto py-2 px-3 pl-9 cursor-pointer ${
                                activeSection === feature.id
                                  ? 'bg-accent text-accent-foreground font-medium'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                              onClick={() => scrollToSection(feature.id)}
                            >
                              <Icon className="h-4 w-4 mr-2 shrink-0" />
                              <span className="flex-1 text-sm">{feature.title}</span>
                              {activeSection === feature.id && (
                                <ChevronRight className="h-4 w-4 shrink-0" />
                              )}
                            </Button>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* System Management - Collapsible */}
                    <Collapsible open={isSystemOpen} onOpenChange={setIsSystemOpen}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-left h-auto py-2 px-3 cursor-pointer text-muted-foreground hover:text-foreground font-medium"
                        >
                          {isSystemOpen ? (
                            <ChevronDown className="h-4 w-4 mr-2 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 mr-2 shrink-0" />
                          )}
                          <span className="flex-1 text-sm">System Management</span>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-1">
                        {systemFeatures.map((feature) => {
                          const Icon = feature.Icon;
                          return (
                            <Button
                              key={feature.id}
                              variant="ghost"
                              className={`w-full justify-start text-left h-auto py-2 px-3 pl-9 cursor-pointer ${
                                activeSection === feature.id
                                  ? 'bg-accent text-accent-foreground font-medium'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                              onClick={() => scrollToSection(feature.id)}
                            >
                              <Icon className="h-4 w-4 mr-2 shrink-0" />
                              <span className="flex-1 text-sm">{feature.title}</span>
                              {activeSection === feature.id && (
                                <ChevronRight className="h-4 w-4 shrink-0" />
                              )}
                            </Button>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  </nav>
                </ScrollArea>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="flex-1 max-w-4xl">
            <div className="prose prose-neutral dark:prose-invert max-w-none">

              {/* Membership Pause/Suspension */}
              <section id="membership-pause" className="mb-16 scroll-mt-20">
                <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
                  <PauseCircle className="h-6 w-6 shrink-0" />
                  <h2 className="text-2xl font-semibold m-0">Membership Pause/Suspension</h2>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
                <p className="text-muted-foreground mb-4">
                  Allows members to temporarily pause their membership subscription for a specified number of days. During the pause period, the member's billing is suspended and they receive a prorated credit for the unused portion of their current billing period. The system enforces organization-defined limits on suspension days per year.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li><strong>Flexible Pause Duration:</strong> Members can pause from 1 day up to the organization's configured maximum</li>
                  <li><strong>365-Day Rolling Limit:</strong> Suspension days are tracked on a rolling 365-day period from subscription start date</li>
                  <li><strong>Prorated Credits:</strong> Members receive automatic credit for unused days in the current billing period</li>
                  <li><strong>Scheduled Pauses:</strong> Can schedule pauses to start on a future date (before next billing date)</li>
                  <li><strong>Early Resume with Credit Adjustment:</strong> When resuming early, credits are automatically adjusted for unused pause days</li>
                  <li><strong>Email Notifications:</strong> Automatic email notifications when memberships are suspended or resumed</li>
                  <li><strong>Stripe Integration:</strong> Seamlessly integrates with Stripe's pause_collection API for connected accounts</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6 mb-3">Configuration</h3>
                <p className="text-muted-foreground mb-2">
                  Organizations can set the maximum suspension days allowed per year in <strong>Settings → Organization</strong>:
                </p>
                <ul className="space-y-1 text-muted-foreground mb-4">
                  <li>Default: 30 days per year</li>
                  <li>Range: 0-365 days</li>
                  <li>Setting: <code className="text-sm bg-muted px-1.5 py-0.5 rounded">org.membershipSuspensionDaysPerYear</code></li>
                </ul>

                <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenarios</h3>

                <div className="space-y-6 mb-6">
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 1: Short-Term Travel</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Customer has $50/month membership, traveling for 2 weeks</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Current billing cycle: Oct 1-31 (30 days)</li>
                      <li>Pause date: Oct 10</li>
                      <li>Pause duration: 14 days</li>
                      <li><strong>Credit calculation:</strong> 14 days × ($50/30) = $23.33 credit</li>
                      <li><strong>Resume date:</strong> Oct 24</li>
                      <li><strong>Next billing:</strong> Oct 31 (adjusted amount: $50 - $23.33 = $26.67)</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 2: Extended Leave (Multi-Month)</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Customer has $20/month membership, taking 3-month sabbatical</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Current billing cycle: Sept 18 - Oct 18</li>
                      <li>Pause date: Sept 22</li>
                      <li>Pause duration: 90 days</li>
                      <li><strong>Credit calculation:</strong> Only for remaining days in September (26 days × $20/30 = $17.33)</li>
                      <li><strong>Skipped billing cycles:</strong> October and November entirely skipped</li>
                      <li><strong>Resume date:</strong> Dec 21</li>
                      <li><strong>Next billing:</strong> Dec 21 (new billing cycle starts)</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 3: Early Resume with Credit Adjustment</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Customer resumes 5 days early from 14-day pause</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Original pause: 14 days ($50/month membership)</li>
                      <li>Actual pause: 9 days</li>
                      <li><strong>Original credit:</strong> 14 × ($50/30) = $23.33</li>
                      <li><strong>Adjusted credit:</strong> 9 × ($50/30) = $15.00</li>
                      <li><strong>Adjustment invoice:</strong> +$8.33 (to reduce the credit)</li>
                      <li><strong>Result:</strong> Customer's credit is adjusted to reflect actual pause duration</li>
                    </ul>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold mb-2">Core Business Logic</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/lib/payments/suspend.js</code> - Main suspension logic</li>
                    <li><code>/lib/memberships.js</code> - Membership data access layer</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">API Routes</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/app/api/memberships/[id]/pause/route.js</code></li>
                    <li><code>/app/api/memberships/[id]/resume/route.js</code></li>
                  </ul>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
                <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
                  <li>Customer self-service pause via mobile app</li>
                  <li>Automatic resume reminders (email reminder before auto-resume)</li>
                  <li>Suspension reason categories for reporting</li>
                  <li>HTML email templates with branding</li>
                  <li>SMS notifications option</li>
                  <li>Webhook notifications for integrations</li>
                </ul>
              </section>

              {/* Membership Cancellation */}
              <section id="membership-cancellation" className="mb-16 scroll-mt-20">
                <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
                  <XCircle className="h-6 w-6 shrink-0" />
                  <h2 className="text-2xl font-semibold m-0">Membership Cancellation</h2>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
                <p className="text-muted-foreground mb-4">
                  Allows staff to cancel active membership subscriptions at the end of the current billing period. Cancellations are processed through Stripe's <code className="text-sm bg-muted px-1.5 py-0.5 rounded">cancel_at_period_end</code> API, ensuring members retain access until their paid period expires.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li><strong>End-of-Period Cancellation:</strong> Memberships remain active until next billing date</li>
                  <li><strong>Stripe Integration:</strong> Seamlessly integrates with Stripe's cancel_at_period_end for connected accounts</li>
                  <li><strong>Visual Indicators:</strong> Clear UI badges showing cancellation status and date</li>
                  <li><strong>Employee Tracking:</strong> Records which employee initiated the cancellation</li>
                  <li><strong>AlertDialog Confirmation:</strong> User-friendly confirmation dialog with cancellation details</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6 mb-3">How It Works</h3>
                <ol className="space-y-2 text-muted-foreground mb-4 list-decimal list-inside">
                  <li>Staff navigates to customer detail page</li>
                  <li>Clicks ellipsis menu (⋮) next to active membership</li>
                  <li>Selects "Cancel Membership" option</li>
                  <li>Reviews confirmation dialog</li>
                  <li>System updates Stripe subscription with <code className="text-sm bg-muted px-1.5 py-0.5 rounded">cancel_at_period_end: true</code></li>
                  <li>UI updates to show Active badge + Cancels badge</li>
                </ol>

                <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenarios</h3>

                <div className="space-y-6 mb-6">
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 1: Standard Cancellation</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Customer has active $70/month membership, paid through Oct 31</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Current date: Oct 15</li>
                      <li>Next billing date: Oct 31</li>
                      <li>Staff initiates cancellation via ellipsis menu</li>
                      <li><strong>System action:</strong> Sets <code className="text-xs bg-background px-1 py-0.5 rounded">cancel_at_period_end: true</code> in Stripe</li>
                      <li><strong>UI updates:</strong> Shows "Active" + "Cancels Oct 31" badges</li>
                      <li><strong>Customer access:</strong> Retains full membership access until Oct 31</li>
                      <li><strong>Oct 31 result:</strong> Membership expires, no renewal charge</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 2: Cancellation Reactivation</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Customer cancelled membership but changed their mind before cancellation date</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Original cancellation: Oct 15, scheduled to cancel Oct 31</li>
                      <li>Reactivation date: Oct 20 (11 days before cancellation)</li>
                      <li>Staff clicks "Undo Cancellation" in ellipsis menu</li>
                      <li><strong>System action:</strong> Sets <code className="text-xs bg-background px-1 py-0.5 rounded">cancel_at_period_end: false</code> in Stripe</li>
                      <li><strong>UI updates:</strong> Removes "Cancels" badge, shows only "Active"</li>
                      <li><strong>Billing resumes:</strong> Oct 31 renewal charge processes normally</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 3: Cancellation with Employee Tracking</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Manager cancels membership and records reason for audit trail</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Employee: Jane Smith (Manager)</li>
                      <li>Cancellation reason: "Customer relocating to different city"</li>
                      <li>Cancellation date: Nov 5</li>
                      <li><strong>System records:</strong> Employee ID, timestamp, and cancellation reason</li>
                      <li><strong>Audit log:</strong> "Cancelled by Jane Smith on Nov 5, 2025 - Customer relocating"</li>
                      <li><strong>Reporting:</strong> Cancellation data available for analytics and reporting</li>
                    </ul>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold mb-2">Core Business Logic</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/lib/payments/cancel.js</code> - Cancellation logic</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">API Routes</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/app/api/memberships/[id]/cancel/route.js</code></li>
                    <li><code>/app/api/memberships/[id]/reactivate/route.js</code></li>
                  </ul>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
                <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
                  <li>Add cancellation analytics/reporting</li>
                  <li>Email notification to customer when membership is cancelled</li>
                  <li>Bulk cancellation support for multiple memberships</li>
                  <li>Cancel reason dropdown with predefined options</li>
                  <li>Automatic win-back campaigns before cancellation date</li>
                  <li>Customer self-service cancellation in mobile app</li>
                  <li>Cancellation survey/feedback collection</li>
                  <li>Reactivation offer before cancellation takes effect</li>
                </ul>
              </section>

              {/* Check-in System */}
              <section id="checkin-system" className="mb-16 scroll-mt-20">
                <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 shrink-0" />
                  <h2 className="text-2xl font-semibold m-0">Check-in System</h2>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
                <p className="text-muted-foreground mb-4">
                  The check-in system handles various membership statuses and class purchases with intelligent routing and clear user feedback.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li><strong>Suspended Members Can Attend Purchased Classes:</strong> Customers with suspended memberships can still check into classes they've purchased separately</li>
                  <li><strong>Clear Status Communication:</strong> Different colored alerts (green/orange/red) indicate success, warning, or failure</li>
                  <li><strong>Auto-Close for Privacy:</strong> Check-in dialogs auto-close after 8 seconds to protect customer PII</li>
                  <li><strong>Time Window Validation:</strong> Classes can be checked into 30 minutes before/after scheduled time</li>
                  <li><strong>Manual Entry Option:</strong> Staff can manually enter member IDs if QR scanning isn't available</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6 mb-3">Check-in Record Status Types</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="default">checked-in</Badge>
                  <Badge variant="destructive">denied</Badge>
                  <Badge variant="secondary">no-show</Badge>
                  <Badge variant="outline">late</Badge>
                  <Badge variant="outline">early</Badge>
                </div>

                
                <h3 className="text-lg font-semibold mt-6 mb-3">Check-in Behavior Matrix</h3>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-semibold">Customer Status</th>
                        <th className="text-left p-2 font-semibold">Has Scheduled Class</th>
                        <th className="text-left p-2 font-semibold">Check-in Result</th>
                        <th className="text-left p-2 font-semibold">Visual Feedback</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b">
                        <td className="p-2">Active Membership</td>
                        <td className="p-2">Yes</td>
                        <td className="p-2">✅ Both class & membership checked in</td>
                        <td className="p-2">Green success for both</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2">Active Membership</td>
                        <td className="p-2">No</td>
                        <td className="p-2">✅ Membership checked in</td>
                        <td className="p-2">Green success</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2">Suspended Membership</td>
                        <td className="p-2">Yes</td>
                        <td className="p-2">✅ Class checked in, ⚠️ Membership warning</td>
                        <td className="p-2">Green for class, Orange warning</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2">Suspended Membership</td>
                        <td className="p-2">No</td>
                        <td className="p-2">❌ Check-in denied</td>
                        <td className="p-2">Orange alert with suspension details</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2">Expired Membership</td>
                        <td className="p-2">Yes</td>
                        <td className="p-2">✅ Class checked in only</td>
                        <td className="p-2">Green for class</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2">Expired Membership</td>
                        <td className="p-2">No</td>
                        <td className="p-2">❌ Check-in denied</td>
                        <td className="p-2">Red alert for expired membership</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2">No Membership</td>
                        <td className="p-2">Yes</td>
                        <td className="p-2">✅ Class checked in</td>
                        <td className="p-2">Green success</td>
                      </tr>
                      <tr>
                        <td className="p-2">No Membership</td>
                        <td className="p-2">No</td>
                        <td className="p-2">❌ No valid check-in</td>
                        <td className="p-2">Gray message</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/app/api/checkin/qr/route.js</code> - Main check-in API endpoint</li>
                    <li><code>/lib/checkin.js</code> - Shared check-in logic</li>
                    <li><code>/app/(app)/checkin/page.js</code> - Frontend check-in interface with QR scanner</li>
                    <li><code>/models/Checkin.js</code> - Check-in data model</li>
                  </ul>
                </div>
              </section>

              {/* Location Hours & Closed Days */}
              <section id="location-hours" className="mb-16 scroll-mt-20">
                <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
                  <Clock className="h-6 w-6 shrink-0" />
                  <h2 className="text-2xl font-semibold m-0">Location Hours & Closed Days</h2>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
                <p className="text-muted-foreground mb-4">
                  Allows organizations to configure store hours and closed days (public holidays, staff training days, etc.) for each location. The system automatically validates class and course bookings against these hours to prevent scheduling conflicts.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li><strong>Store Hours Configuration:</strong> Set opening and closing times for each day of the week</li>
                  <li><strong>5-Minute Intervals:</strong> Time selection restricted to 5-minute increments for consistency</li>
                  <li><strong>Closed Days/Public Holidays:</strong> Define date ranges when the location is closed</li>
                  <li><strong>Automatic Booking Validation:</strong> Class/course times that conflict with closed hours are automatically blocked</li>
                  <li><strong>Visual Indicators:</strong> Conflicting times displayed with strikethrough and warning badges</li>
                  <li><strong>Per-Location Settings:</strong> Each location can have independent hours and closed days</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6 mb-3">Repeating Patterns</h3>
                <p className="text-muted-foreground mb-2">Closed days support various repeating patterns:</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="secondary">Does not repeat</Badge>
                  <Badge variant="secondary">Daily</Badge>
                  <Badge variant="secondary">Weekly</Badge>
                  <Badge variant="secondary">Fortnightly</Badge>
                  <Badge variant="secondary">Monthly</Badge>
                  <Badge variant="secondary">Quarterly</Badge>
                  <Badge variant="secondary">Yearly</Badge>
                </div>

                
                <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenarios</h3>

                <div className="space-y-6 mb-6">
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 1: Standard Store Hours</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong></p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside mb-2">
                      <li>Location: Main HQ</li>
                      <li>Monday hours: 05:00 AM - 10:50 PM</li>
                      <li>Tuesday hours: 10:00 AM - 05:00 PM</li>
                      <li>Wednesday-Sunday: Not set (closed)</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mb-1"><strong>Class Schedule:</strong> Weights Class runs Monday-Sunday at 8:00 AM</p>
                    <p className="text-sm text-muted-foreground mb-1"><strong>Result:</strong></p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Monday 8:00 AM ✅ Available (within 05:00 AM - 10:50 PM)</li>
                      <li>Tuesday 8:00 AM ❌ <s>Outside store hours</s> (before 10:00 AM open)</li>
                      <li>Wednesday 8:00 AM ❌ <s>Outside store hours</s> (no hours configured)</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 2: Public Holiday</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong></p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside mb-2">
                      <li>Location hours: Monday-Sunday 06:00 AM - 09:00 PM</li>
                      <li>Closed day: "Christmas Day" Dec 25, 2025</li>
                      <li>Class: Morning Yoga, Monday-Sunday at 07:00 AM</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mb-1"><strong>Result:</strong></p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Dec 24, 2025 at 07:00 AM ✅ Available</li>
                      <li>Dec 25, 2025 at 07:00 AM ❌ <s>Closed day</s> (Christmas)</li>
                      <li>Dec 26, 2025 at 07:00 AM ✅ Available</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 3: Repeating Annual Holiday (Yearly)</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong></p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside mb-2">
                      <li>Closed days: "Christmas Day" Dec 25, 2025, Repeats: Yearly</li>
                      <li>Class: Morning Class, daily at 09:00 AM</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mb-1"><strong>Result:</strong></p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Dec 25, 2025 at 09:00 AM ❌ <s>Closed day</s> (Christmas Day)</li>
                      <li>Dec 25, 2026 at 09:00 AM ❌ <s>Closed day</s> (Christmas Day - repeating)</li>
                      <li>Dec 25, 2027 at 09:00 AM ❌ <s>Closed day</s> (Christmas Day - repeating)</li>
                      <li>All other dates ✅ Available</li>
                    </ul>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/app/(app)/manage/locations/location.js</code> - Location form with hours/closed days</li>
                    <li><code>/app/(app)/shop/(other)/classes/useClass.js</code> - Booking validation logic</li>
                    <li><code>/app/(app)/shop/(other)/classes/productDetailClass.js</code> - UI with conflict display</li>
                  </ul>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
                <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
                  <li>Timezone support for multi-location organizations</li>
                  <li>Recurring closed days (e.g., "Every Sunday")</li>
                  <li>Holiday templates (auto-populate common holidays by region)</li>
                  <li>Temporary hour overrides (e.g., special event hours)</li>
                  <li>Email notifications when bookings are affected by hour changes</li>
                  <li>Bulk import closed days from CSV</li>
                  <li>Integration with external calendar systems (Google Calendar, Outlook)</li>
                </ul>
              </section>

              {/* Subscription Renewal Webhooks */}
              <section id="subscription-webhooks" className="mb-16 scroll-mt-20">
                <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
                  <Bell className="h-6 w-6 shrink-0" />
                  <h2 className="text-2xl font-semibold m-0">Subscription Renewal Webhooks</h2>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
                <p className="text-muted-foreground mb-4">
                  Automatically processes recurring subscription payments through Stripe webhooks. When a subscription renews (weekly, monthly, etc.), the system receives a webhook event from Stripe, creates a transaction record, updates membership billing dates, enforces billing limits, and sends a receipt email to the customer.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li><strong>Automatic Payment Processing:</strong> Processes subscription renewals without manual intervention</li>
                  <li><strong>Transaction Records:</strong> Creates detailed transaction records for each renewal payment</li>
                  <li><strong>Billing Date Updates:</strong> Automatically updates membership billing dates after each payment</li>
                  <li><strong>Billing Limit Enforcement:</strong> Automatically cancels subscriptions after reaching configured billing maximum</li>
                  <li><strong>Idempotency:</strong> Prevents duplicate transactions when Stripe sends multiple webhook events</li>
                  <li><strong>Receipt Emails:</strong> Sends professional receipt emails via Brevo for each renewal payment</li>
                  <li><strong>Stripe Connected Accounts:</strong> Full support for multi-tenant connected account architecture</li>
                  <li><strong>Comprehensive Logging:</strong> Detailed webhook logs written to <code className="text-sm bg-muted px-1.5 py-0.5 rounded">./tmp/stripe-webhooks.log</code></li>
                </ul>

                <h3 className="text-lg font-semibold mt-6 mb-3">Webhook Events Handled</h3>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-3">
                      <Badge variant="default" className="mt-0.5">invoice.paid</Badge>
                      <span className="text-muted-foreground">Subscription payment succeeded - Create transaction, update membership, send receipt</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="default" className="mt-0.5">invoice.payment_succeeded</Badge>
                      <span className="text-muted-foreground">Alternative payment success event</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="destructive" className="mt-0.5">invoice.payment_failed</Badge>
                      <span className="text-muted-foreground">Subscription payment failed - Log error</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="secondary" className="mt-0.5">customer.subscription.deleted</Badge>
                      <span className="text-muted-foreground">Subscription cancelled/expired - Log event</span>
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenarios</h3>

                <div className="space-y-6 mb-6">
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 1: Standard Renewal (Indefinite Subscription)</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Monthly $50 membership with no billing limit</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Initial purchase: Oct 1, 2025</li>
                      <li>First renewal: Nov 1, 2025</li>
                      <li><strong>Webhook received:</strong> <code className="text-xs bg-background px-1 py-0.5 rounded">invoice.paid</code></li>
                      <li><strong>System actions:</strong>
                        <ul className="ml-4 mt-1 space-y-0.5">
                          <li>✅ Creates transaction record ($50)</li>
                          <li>✅ Updates membership nextBillingDate to Dec 1</li>
                          <li>✅ Sends receipt email to customer</li>
                          <li>✅ Logs event to webhook log file</li>
                        </ul>
                      </li>
                      <li><strong>Subscription continues:</strong> Renews monthly indefinitely until cancelled</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 2: Limited Billing with Auto-Cancellation</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> 6-month term membership at $20/month (billing max = 6)</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Payment 1 (Oct 1): billingCount = 1/6</li>
                      <li>Payment 2 (Nov 1): billingCount = 2/6</li>
                      <li>Payment 3 (Dec 1): billingCount = 3/6</li>
                      <li>Payment 4 (Jan 1): billingCount = 4/6</li>
                      <li>Payment 5 (Feb 1): billingCount = 5/6</li>
                      <li>Payment 6 (Mar 1): billingCount = 6/6
                        <ul className="ml-4 mt-1 space-y-0.5">
                          <li>✅ Final payment processed</li>
                          <li>🛑 System sets <code className="text-xs bg-background px-1 py-0.5 rounded">cancel_at_period_end: true</code></li>
                          <li>📅 Membership remains active until Apr 1</li>
                          <li>❌ No payment on Apr 1 (subscription ended)</li>
                        </ul>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 3: Idempotency - Duplicate Webhook Prevention</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Stripe sends multiple webhook events for same invoice</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Webhook 1: <code className="text-xs bg-background px-1 py-0.5 rounded">invoice.paid</code> (Nov 1, 10:00 AM)</li>
                      <li><strong>First webhook processing:</strong>
                        <ul className="ml-4 mt-1 space-y-0.5">
                          <li>✅ Checks existing transactions for invoice ID</li>
                          <li>✅ No match found, proceeds with processing</li>
                          <li>✅ Creates transaction with invoice ID: <code className="text-xs bg-background px-1 py-0.5 rounded">in_123abc</code></li>
                        </ul>
                      </li>
                      <li>Webhook 2: <code className="text-xs bg-background px-1 py-0.5 rounded">invoice.payment_succeeded</code> (Nov 1, 10:01 AM)</li>
                      <li><strong>Second webhook processing:</strong>
                        <ul className="ml-4 mt-1 space-y-0.5">
                          <li>✅ Checks existing transactions for invoice ID</li>
                          <li>⚠️ Match found! Invoice <code className="text-xs bg-background px-1 py-0.5 rounded">in_123abc</code> already processed</li>
                          <li>⏭️ Skips processing, returns <code className="text-xs bg-background px-1 py-0.5 rounded">{'{ skipped: true, reason: "already_processed" }'}</code></li>
                        </ul>
                      </li>
                      <li><strong>Result:</strong> Exactly 1 transaction created (no duplicates)</li>
                    </ul>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Idempotency & Duplicate Prevention</h3>
                <p className="text-muted-foreground mb-4">
                  Stripe may send multiple webhook events for the same payment (<code className="text-sm bg-muted px-1.5 py-0.5 rounded">invoice.paid</code>, <code className="text-sm bg-muted px-1.5 py-0.5 rounded">invoice.payment_succeeded</code>, <code className="text-sm bg-muted px-1.5 py-0.5 rounded">invoice_payment.paid</code>). The system checks if an invoice has already been processed before creating a transaction, ensuring exactly one transaction per payment.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">Testing & Verification</h3>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold mb-2">Test Subscription Renewals with Test Clock</p>
                  <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`# 1. Create a subscription in POS with billing max = 2
# 2. Advance test clock to trigger renewal
node scripts/advance-test-clock.js <customerId>

# 3. Check webhook logs
tail -f tmp/stripe-webhooks.log

# 4. Verify in database
# - Transaction created with correct invoice ID
# - Membership billing dates updated
# - Billing count incremented
# - Subscription cancelled if max reached`}
                  </pre>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold mb-2">Webhook Handler</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/app/api/webhooks/stripe/route.js</code> - Main webhook endpoint</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Email & Payment</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/lib/email/receipt.js</code> - Receipt email template</li>
                    <li><code>/lib/payments/success.js</code> - Transaction utilities</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Testing Scripts</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/scripts/advance-test-clock.js</code> - Advance test clock</li>
                    <li><code>/scripts/debug-stripe-invoice.js</code> - Debug invoice structure</li>
                  </ul>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Verification Checklist</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-muted-foreground">Transaction created with status 'completed'</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-muted-foreground">Transaction has correct invoice ID</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-muted-foreground">No duplicate transactions for same invoice</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-muted-foreground">Membership billing dates updated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-muted-foreground">Billing count incremented in Stripe metadata</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-muted-foreground">Subscription cancelled if billing max reached</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-muted-foreground">Receipt email sent successfully</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-muted-foreground">Webhook event logged to file</span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
                <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
                  <li>Implement customer.subscription.deleted webhook handler</li>
                  <li>Update membership status to 'cancelled' when subscription deleted</li>
                  <li>Add retry logic for failed email sends</li>
                  <li>Customer notification for failed payments</li>
                  <li>Automated dunning emails (payment reminders)</li>
                  <li>Subscription renewal analytics dashboard</li>
                  <li>Webhook event replay functionality</li>
                  <li>Configurable webhook timeout settings</li>
                  <li>Support for metered billing and usage-based pricing</li>
                  <li>Automatic refund processing for disputes</li>
                  <li>Integration with accounting software (QuickBooks, Xero)</li>
                </ul>
              </section>

              {/* Membership Products */}
              <section id="membership-products" className="mb-16 scroll-mt-20">
                <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
                  <Package className="h-6 w-6 shrink-0" />
                  <h2 className="text-2xl font-semibold m-0">Membership Products</h2>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
                <p className="text-muted-foreground mb-4">
                  Create and configure membership subscription products with flexible pricing, billing frequencies, and automated payment processing through Stripe. Memberships support QR code check-ins, waivers, automatic billing, and comprehensive tracking.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li><strong>Flexible Pricing:</strong> Create multiple price tiers (e.g., Adult, Child, Student) for a single membership product</li>
                  <li><strong>Billing Frequencies:</strong> Support for weekly, monthly, quarterly, and annual billing cycles</li>
                  <li><strong>Billing Limits:</strong> Optional maximum number of payments (e.g., 6-month term membership)</li>
                  <li><strong>Automatic Discounts:</strong> Assign discounts that auto-apply during checkout when customer is connected</li>
                  <li><strong>Waiver Requirements:</strong> Require digital waiver acceptance before membership purchase</li>
                  <li><strong>QR Code Generation:</strong> Automatic QR codes for easy check-in at facility entrance</li>
                  <li><strong>Stripe Integration:</strong> Seamless subscription management with Stripe Connected Accounts</li>
                  <li><strong>Member Numbers:</strong> Automatic sequential member number assignment</li>
                  <li><strong>Terms & Conditions:</strong> Custom T&Cs displayed during checkout</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6 mb-3">Product Configuration</h3>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold mb-2">Basic Information</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Product name (e.g., "Premium Gym Membership")</li>
                    <li>Description (optional)</li>
                    <li>Terms & Conditions (custom HTML/text)</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Pricing Options</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Price name (e.g., "Adult", "Student", "Senior")</li>
                    <li>Amount (e.g., $70.00)</li>
                    <li>Billing frequency (weekly, monthly, quarterly, annual)</li>
                    <li>Billing max (optional - e.g., 6 for 6-month term)</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Additional Settings</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Waiver requirement (optional)</li>
                    <li>Auto-assign discounts (optional)</li>
                    <li>GST/Tax settings</li>
                  </ul>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenarios</h3>

                <div className="space-y-6 mb-6">
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 1: Basic Monthly Membership</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Simple monthly gym membership</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Product name: "Standard Gym Membership"</li>
                      <li>Price: $50/month</li>
                      <li>Billing frequency: Monthly</li>
                      <li>Billing max: None (indefinite)</li>
                      <li>Waiver required: Yes</li>
                      <li><strong>Checkout flow:</strong> Customer signs waiver → Enters payment → Receives QR code email</li>
                      <li><strong>Billing:</strong> Auto-charges $50 every month until cancelled</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 2: Multi-Tier Pricing with Discounts</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Family membership with multiple price tiers and early bird discount</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Product name: "Family Membership"</li>
                      <li>Prices:
                        <ul className="ml-4 mt-1 space-y-0.5">
                          <li>Adult: $70/month</li>
                          <li>Child (under 16): $30/month</li>
                          <li>Student (with ID): $50/month</li>
                        </ul>
                      </li>
                      <li>Auto-assign discount: "Early Bird 10%" (automatically applies during Jan-Feb signups)</li>
                      <li><strong>Example purchase:</strong> Adult + 2 Children = $70 + $30 + $30 = $130/month</li>
                      <li><strong>With early bird:</strong> $130 × 0.9 = $117/month</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 3: Fixed-Term Membership</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> 6-month summer membership program</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Product name: "Summer Membership (6 months)"</li>
                      <li>Price: $60/month</li>
                      <li>Billing frequency: Monthly</li>
                      <li>Billing max: 6 payments</li>
                      <li><strong>Payment schedule:</strong> 6 monthly payments of $60 (total $360)</li>
                      <li><strong>After payment 6:</strong> Subscription automatically cancelled at period end</li>
                      <li><strong>Customer option:</strong> Can purchase new membership after term ends</li>
                    </ul>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold mb-2">Product Management</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/app/(app)/manage/products/page.js</code> - Products list view</li>
                    <li><code>/app/(app)/manage/products/[id]/edit/page.js</code> - Product editor</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Checkout & Purchase</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/app/(app)/shop/(membership)/subscriptions/[id]/page.js</code> - Membership checkout</li>
                    <li><code>/app/api/payments/subscription/create/route.js</code> - Subscription creation API</li>
                    <li><code>/app/api/payments/subscription/complete/route.js</code> - Payment completion</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Models</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/models/Product.js</code> - Product schema</li>
                    <li><code>/models/Membership.js</code> - Membership subscription schema</li>
                  </ul>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
                <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
                  <li>Family membership packages (link multiple memberships)</li>
                  <li>Membership tier upgrades/downgrades</li>
                  <li>Trial periods (7-day free trial)</li>
                  <li>Proration when upgrading mid-cycle</li>
                  <li>Membership transfer between customers</li>
                  <li>Custom fields for membership data collection</li>
                  <li>Membership benefits/perks tracking</li>
                  <li>Integration with access control systems</li>
                </ul>
              </section>

              {/* Shop Items */}
              <section id="shop-items" className="mb-16 scroll-mt-20">
                <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
                  <ShoppingCart className="h-6 w-6 shrink-0" />
                  <h2 className="text-2xl font-semibold m-0">Shop Items</h2>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
                <p className="text-muted-foreground mb-4">
                  Create and manage retail products, food & beverage items, and merchandise with flexible organization using folders, colors, and icons. Shop items support stock management, bump screen integration for kitchen orders, and automated inventory tracking.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li><strong>Folder Organization:</strong> Group items into customizable folders (e.g., "Coffee", "Smoothies", "Merchandise")</li>
                  <li><strong>Visual Customization:</strong> Set custom colors and icons for easy identification on POS screen</li>
                  <li><strong>Stock Management:</strong> Track quantity, set par levels, and receive low-stock alerts</li>
                  <li><strong>Bump Screen Integration:</strong> Send orders to kitchen/preparation area bump screen</li>
                  <li><strong>Multiple Prices:</strong> Support for multiple pricing tiers (e.g., Small, Medium, Large)</li>
                  <li><strong>GST/Tax Configuration:</strong> Configure tax settings per product</li>
                  <li><strong>Quick Checkout:</strong> Optimized for fast point-of-sale transactions</li>
                  <li><strong>Customer Optional:</strong> Can be sold without customer assignment</li>
                  <li><strong>Email Receipts:</strong> Optional email receipts (off by default for quick sales)</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6 mb-3">Product Configuration</h3>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold mb-2">Basic Information</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Product name (e.g., "Cappuccino")</li>
                    <li>Description (optional)</li>
                    <li>Folder assignment (e.g., "Coffee" folder)</li>
                    <li>Color (for POS button background)</li>
                    <li>Icon (optional)</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Pricing</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Single price or multiple sizes (e.g., Small $4, Large $6)</li>
                    <li>GST/Tax inclusion settings</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Inventory</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Current quantity (stock on hand)</li>
                    <li>Par level (minimum quantity before alert)</li>
                    <li>Auto-decrement on sale (optional)</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Operational Settings</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Send to bump screen (yes/no)</li>
                    <li>Require customer name if bump screen enabled</li>
                    <li>Accounting category</li>
                  </ul>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenarios</h3>

                <div className="space-y-6 mb-6">
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 1: Coffee Shop Setup</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Organizing coffee products with bump screen</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Folder: "Coffee" (brown color)</li>
                      <li>Products:
                        <ul className="ml-4 mt-1 space-y-0.5">
                          <li>Cappuccino - 2 sizes (Small $4.50, Large $5.50)</li>
                          <li>Latte - 2 sizes (Small $4.50, Large $5.50)</li>
                          <li>Flat White - Single size ($5.00)</li>
                        </ul>
                      </li>
                      <li>Settings: Send to bump screen ✓, Require customer name ✓</li>
                      <li><strong>Checkout flow:</strong> Staff taps "Cappuccino" → Selects "Large" → Enters customer name "John" → Sale</li>
                      <li><strong>Result:</strong> Order appears on kitchen bump screen, receipt prints, customer notified when ready</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 2: Merchandise with Stock Tracking</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> T-shirt sales with low-stock alerts</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Folder: "Merchandise" (blue color)</li>
                      <li>Product: "Gym T-Shirt" - $25.00</li>
                      <li>Current stock: 15 units</li>
                      <li>Par level: 5 units (reorder threshold)</li>
                      <li>Settings: Bump screen ✗, Customer optional ✓</li>
                      <li><strong>Sales activity:</strong> 11 t-shirts sold (stock now 4 units)</li>
                      <li><strong>Alert triggered:</strong> Red notification bell appears (stock below par)</li>
                      <li><strong>Manager action:</strong> Views stock screen, places supplier order for more inventory</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 3: Quick Sale Without Customer</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Fast protein bar sale at front desk</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Product: "Protein Bar" - $3.50</li>
                      <li>Folder: "Snacks" (green color)</li>
                      <li>Settings: Bump screen ✗, Customer optional ✓</li>
                      <li><strong>Checkout:</strong> Staff taps "Protein Bar" → Qty auto-set to 1 → Tap "Card" → Payment processed</li>
                      <li><strong>Duration:</strong> ~5 seconds (no customer lookup, no email receipt)</li>
                      <li><strong>Receipt:</strong> Only printed receipt (no email sent)</li>
                    </ul>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold mb-2">Product Management</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/app/(app)/manage/products/page.js</code> - Products list</li>
                    <li><code>/app/(app)/manage/stock/page.js</code> - Stock/quantity management</li>
                    <li><code>/app/(app)/manage/folders/page.js</code> - Folder management</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Checkout</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/app/(app)/shop/(shop)/page.js</code> - Shop items POS screen</li>
                    <li><code>/app/api/checkout/route.js</code> - Checkout processing</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Bump Screen</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/app/(app)/bump/page.js</code> - Kitchen bump screen</li>
                    <li><code>/models/Order.js</code> - Order schema</li>
                  </ul>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
                <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
                  <li>Product variants (size, color, flavor)</li>
                  <li>Combo/bundle products</li>
                  <li>Automatic supplier reordering when below par</li>
                  <li>Product images for POS buttons</li>
                  <li>Barcode scanning for quick add</li>
                  <li>Product cost tracking for profit margins</li>
                  <li>Time-based pricing (happy hour discounts)</li>
                  <li>Product recommendations at checkout</li>
                </ul>
              </section>

              {/* Classes & Courses */}
              <section id="classes-courses" className="mb-16 scroll-mt-20">
                <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
                  <Calendar className="h-6 w-6 shrink-0" />
                  <h2 className="text-2xl font-semibold m-0">Classes & Courses</h2>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
                <p className="text-muted-foreground mb-4">
                  Create scheduled group activities, classes, and courses with capacity management, multiple time slots, location hours validation, QR code check-ins, and automated booking management. Perfect for fitness classes, training sessions, workshops, and multi-week programs.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li><strong>Flexible Scheduling:</strong> Create multiple recurring time slots per week (e.g., Mon/Wed/Fri at 6am, 12pm, 6pm)</li>
                  <li><strong>Capacity Management:</strong> Set maximum participants per class with automatic booking prevention when full</li>
                  <li><strong>Location Hours Integration:</strong> Automatically validates class times against location operating hours</li>
                  <li><strong>Visual Conflict Indicators:</strong> Strikethrough display for times that conflict with closed days/hours</li>
                  <li><strong>Multiple Price Tiers:</strong> Support for different pricing (Adult, Child, Drop-in, etc.)</li>
                  <li><strong>QR Code Check-in:</strong> Automatic QR codes for contactless class check-in</li>
                  <li><strong>Waiver Requirements:</strong> Optional digital waiver acceptance before booking</li>
                  <li><strong>Multi-Customer Booking:</strong> Purchase for multiple people in single transaction (e.g., parent booking for 2 children)</li>
                  <li><strong>Schedule Validation:</strong> Prevents overbooking and scheduling conflicts</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6 mb-3">Product Configuration</h3>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold mb-2">Basic Information</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Class name (e.g., "Yoga Flow")</li>
                    <li>Description</li>
                    <li>Location assignment</li>
                    <li>Terms & Conditions (optional)</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Schedule Configuration</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Days of week (select multiple: Mon, Tue, Wed, etc.)</li>
                    <li>Time slots (create multiple times per day)</li>
                    <li>Capacity per time slot (e.g., 20 people max)</li>
                    <li>Auto-validation against location hours/closed days</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Pricing</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Multiple price options (e.g., Adult $20, Child $12, Drop-in $25)</li>
                    <li>GST/Tax settings</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Additional Settings</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Waiver requirement</li>
                    <li>Auto-assign discounts</li>
                    <li>Check-in time window (e.g., 30 min before/after)</li>
                  </ul>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenarios</h3>

                <div className="space-y-6 mb-6">
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 1: Recurring Weekly Class</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Morning yoga class 3 times per week</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Class name: "Morning Yoga Flow"</li>
                      <li>Schedule: Monday, Wednesday, Friday at 7:00 AM</li>
                      <li>Capacity: 15 people per class</li>
                      <li>Price: Adult $20, Senior $15</li>
                      <li>Waiver required: Yes</li>
                      <li><strong>Booking:</strong> Customer purchases "Adult" ticket for next Friday 7am class</li>
                      <li><strong>Email sent:</strong> QR code + class details (date, time, location)</li>
                      <li><strong>Check-in:</strong> Scan QR code at entrance 6:30-7:30am window</li>
                      <li><strong>Capacity tracking:</strong> 14 spots remaining after booking</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 2: Multiple Daily Time Slots</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Popular HIIT class with 3 daily sessions</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Class name: "HIIT Bootcamp"</li>
                      <li>Schedule: Monday-Saturday at 6:00 AM, 12:00 PM, 6:00 PM</li>
                      <li>Capacity: 20 people per session</li>
                      <li>Prices: Adult $25, Student $18, Drop-in $30</li>
                      <li><strong>Customer preference:</strong> Regularly attends 6:00 AM Monday/Wednesday</li>
                      <li><strong>Booking pattern:</strong> Purchases 2 tickets per week (Monday + Wednesday mornings)</li>
                      <li><strong>Flexibility:</strong> Can book any time slot on any day based on availability</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 3: Location Hours Conflict Prevention</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Class schedule with holiday closures</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Class: "Kids Martial Arts"</li>
                      <li>Schedule: Monday-Friday at 4:00 PM</li>
                      <li>Location hours: Mon-Fri 6am-9pm, Closed Dec 25-26 (Christmas)</li>
                      <li><strong>Dec 24:</strong> 4:00 PM class ✅ Available (normal booking)</li>
                      <li><strong>Dec 25:</strong> 4:00 PM class ❌ <s>Outside store hours</s> (closed day badge, cannot book)</li>
                      <li><strong>Dec 26:</strong> 4:00 PM class ❌ <s>Outside store hours</s> (closed day badge, cannot book)</li>
                      <li><strong>Dec 27:</strong> 4:00 PM class ✅ Available (normal booking resumes)</li>
                      <li><strong>Customer experience:</strong> Sees visual indicators, cannot accidentally book closed days</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 4: Multi-Customer Booking</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Parent booking for 2 children</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Class: "Kids Swimming Lessons"</li>
                      <li>Schedule: Saturday at 10:00 AM</li>
                      <li>Capacity: 12 children</li>
                      <li>Price: $30 per child</li>
                      <li><strong>Booking process:</strong>
                        <ul className="ml-4 mt-1 space-y-0.5">
                          <li>1. Select "Kids Swimming" → Saturday 10am</li>
                          <li>2. Click "Add Customer" → Select child 1 (Emma)</li>
                          <li>3. Click "Add Customer" → Select child 2 (Jack)</li>
                          <li>4. Cart shows: 2 × $30 = $60</li>
                          <li>5. Process payment</li>
                        </ul>
                      </li>
                      <li><strong>Result:</strong> Both children receive separate QR codes, capacity reduced by 2 (10 spots left)</li>
                      <li><strong>Transaction:</strong> Parent's account linked as payer, children as participants</li>
                    </ul>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold mb-2">Product Management</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/app/(app)/manage/products/page.js</code> - Products list</li>
                    <li><code>/app/(app)/manage/products/[id]/edit/page.js</code> - Product editor</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Booking & Checkout</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/app/(app)/shop/(other)/classes/[id]/page.js</code> - Class booking page</li>
                    <li><code>/app/(app)/shop/(other)/classes/useClass.js</code> - Booking validation logic</li>
                    <li><code>/app/(app)/shop/(other)/classes/productDetailClass.js</code> - UI with conflict display</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Schedule Management</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/app/(app)/manage/schedules/page.js</code> - Schedule list view</li>
                    <li><code>/models/Schedule.js</code> - Schedule/booking schema</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Check-in</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/app/(app)/checkin/page.js</code> - QR check-in interface</li>
                    <li><code>/app/api/checkin/qr/route.js</code> - Check-in API</li>
                  </ul>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
                <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
                  <li>Waiting list for fully booked classes</li>
                  <li>Recurring class packages (e.g., 10-class punch card)</li>
                  <li>Instructor assignment per class</li>
                  <li>Class cancellation by staff with customer notifications</li>
                  <li>Customer self-service booking via mobile app</li>
                  <li>Class attendance reports and analytics</li>
                  <li>Drop-in vs pre-registered participant tracking</li>
                  <li>Class series/programs (multi-week courses with single purchase)</li>
                  <li>Private class bookings (1-on-1 sessions)</li>
                </ul>
              </section>

              {/* Discounts & Adjustments */}
              <section id="discounts-adjustments" className="mb-16 scroll-mt-20">
                <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
                  <Percent className="h-6 w-6 shrink-0" />
                  <h2 className="text-2xl font-semibold m-0">Discounts & Adjustments</h2>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
                <p className="text-muted-foreground mb-4">
                  Create and manage discounts, surcharges, and price adjustments that can be applied during checkout. Supports percentage and fixed-amount adjustments, product-specific rules, automatic application, and staff authorization controls.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li><strong>Flexible Types:</strong> Create discounts (reduce price) or surcharges (add to price)</li>
                  <li><strong>Value Options:</strong> Percentage-based (e.g., 10%) or fixed amount (e.g., $5 off)</li>
                  <li><strong>Max Value Cap:</strong> Set maximum dollar amount for percentage discounts (e.g., 10% off max $10)</li>
                  <li><strong>Multiple Adjustments:</strong> Different discount values per product category in single adjustment</li>
                  <li><strong>Automatic Assignment:</strong> Toggle auto-apply for customer-specific discounts during checkout</li>
                  <li><strong>Product Restrictions:</strong> "Must Have" products - require specific items for discount to apply</li>
                  <li><strong>Usage Limits:</strong> Total usage cap and per-customer usage limits</li>
                  <li><strong>Frequency Control:</strong> Limit how often customers can use (daily, weekly, monthly)</li>
                  <li><strong>Days of Week:</strong> Restrict discounts to specific days (e.g., weekends only)</li>
                  <li><strong>Discount Codes:</strong> Optional tracking codes for reporting and analytics</li>
                  <li><strong>Customer Requirement:</strong> Require customer connected to cart for discount to apply</li>
                  <li><strong>Membership Rules:</strong> Prevent application when membership is suspended</li>
                  <li><strong>Staff Authorization:</strong> Require MANAGER role for manual discount application</li>
                  <li><strong>Date Ranges:</strong> Set start/end dates or make recurring (no expiry)</li>
                  <li><strong>Status Control:</strong> Enable/disable adjustments without deleting them</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6 mb-3">Configuration</h3>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold mb-2">Adjustment Details</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Adjustment type: Discount or Surcharge</li>
                    <li>Name (display name shown to customers)</li>
                    <li>Code (optional - e.g., SUMMER10, for tracking/reporting)</li>
                    <li>Description (internal notes, not shown to customers)</li>
                    <li>Auto-assignment toggle (automatically apply when conditions met)</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Must Haves (Product/Category Restrictions)</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Select specific products/categories customer must purchase</li>
                    <li>Leave blank to apply to all products</li>
                    <li>Multiple selections allowed (e.g., "Memberships" OR "Coffee")</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Adjustments (Product-Specific Values)</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Add multiple adjustments with different values per product/category</li>
                    <li>For each adjustment:
                      <ul className="ml-4 mt-1 space-y-0.5">
                        <li>• Select product/category (e.g., "Coffees")</li>
                        <li>• Type: Percentage or Amount ($)</li>
                        <li>• Value: Discount/surcharge amount (e.g., 5% or $2.00)</li>
                        <li>• Max $ Value: Optional cap on percentage discounts (e.g., max $10 off)</li>
                      </ul>
                    </li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Limits</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Start date (when discount becomes active)</li>
                    <li>End date (when discount expires - leave blank for permanent)</li>
                    <li>Usage limit (total): Maximum number of times discount can be used across all customers</li>
                    <li>Per-customer limit: Maximum times a single customer can use this discount</li>
                    <li>Frequency: How often customer can use (Daily, Weekly, Monthly)
                      <ul className="ml-4 mt-1 space-y-0.5">
                        <li>• Frequency value: Number (e.g., "1" = once per day)</li>
                      </ul>
                    </li>
                    <li>Days of Week: Restrict discount to specific days (checkboxes for Mon-Sun)</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Additional Settings</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Require Customer: Toggle - discount only applies when customer is connected to cart</li>
                    <li>Active status: Enable/disable without deleting</li>
                  </ul>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenarios</h3>

                <div className="space-y-6 mb-6">
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 1: Seasonal Discount with Auto-Apply</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> 15% summer discount for all memberships (Jan-Feb)</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Name: "Summer Special"</li>
                      <li>Type: Discount</li>
                      <li>Value: 15%</li>
                      <li>Auto-assign: ON</li>
                      <li>Products: All membership products</li>
                      <li>Start: Jan 1, 2025</li>
                      <li>End: Feb 28, 2025</li>
                      <li><strong>Checkout behavior:</strong> Automatically applies to any membership purchase during Jan-Feb</li>
                      <li><strong>Customer sees:</strong> "Summer Special (15% off)" in cart</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 2: Product-Specific Manual Discount</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> $10 off coffee purchases (manual application only)</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Name: "Coffee Card Reward"</li>
                      <li>Type: Discount</li>
                      <li>Value: $10.00</li>
                      <li>Auto-assign: OFF</li>
                      <li>Products: Only "Cappuccino", "Latte", "Flat White"</li>
                      <li>No date restrictions (recurring)</li>
                      <li><strong>Staff workflow:</strong> Add coffee to cart → Select "Coffee Card Reward" from discounts dropdown</li>
                      <li><strong>Restriction:</strong> Can only apply to selected coffee products (not other items)</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 3: Credit Card Surcharge</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> 1.5% card processing fee</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Name: "Card Processing Fee"</li>
                      <li>Type: Surcharge</li>
                      <li>Value: 1.5%</li>
                      <li>Auto-assign: OFF (manually added at checkout)</li>
                      <li>Products: All products</li>
                      <li><strong>Staff workflow:</strong> Customer selects card payment → Staff adds surcharge manually</li>
                      <li><strong>Cart display:</strong> Subtotal $100 → Card Fee +$1.50 → Total $101.50</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 4: Manager Authorization Required</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Custom discount requiring manager approval</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Staff (non-manager) tries to apply manual 20% discount</li>
                      <li><strong>System response:</strong> "Manager authorization required"</li>
                      <li>Manager enters PIN to authorize discount</li>
                      <li><strong>Audit trail:</strong> Records which manager authorized the discount</li>
                      <li><strong>Result:</strong> Discount applied, transaction proceeds</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 5: Weekend Special with Usage Limits</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Weekend discount with frequency and usage restrictions</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Name: "Weekend Special"</li>
                      <li>Code: WEEKEND20</li>
                      <li>Type: Discount - 20% off</li>
                      <li>Must Have: Memberships</li>
                      <li>Days of Week: Saturday ✓, Sunday ✓ (all others unchecked)</li>
                      <li>Usage limit (total): 100 redemptions</li>
                      <li>Per-customer limit: 1 time per customer</li>
                      <li>Require Customer: ON</li>
                      <li><strong>Customer A experience (Saturday):</strong>
                        <ul className="ml-4 mt-1 space-y-0.5">
                          <li>Purchases membership with customer connected to cart</li>
                          <li>Discount auto-applies: 20% off</li>
                          <li>Usage count: 1/100 total, 1/1 for Customer A</li>
                        </ul>
                      </li>
                      <li><strong>Customer A tries again (Sunday):</strong>
                        <ul className="ml-4 mt-1 space-y-0.5">
                          <li>Discount does NOT apply</li>
                          <li>Reason: Already used once (per-customer limit reached)</li>
                        </ul>
                      </li>
                      <li><strong>Wednesday attempt:</strong> Discount doesn't apply (not weekend)</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 6: Multiple Product Adjustments with Max Cap</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Member coffee discount with different values per product</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Name: "Member Coffee 5"</li>
                      <li>Code: MEMBERCOFFEE5</li>
                      <li>Must Have: Customer must have active membership</li>
                      <li>Adjustments:
                        <ul className="ml-4 mt-1 space-y-0.5">
                          <li>Adjustment 1: Coffees - 5% off, Max $2</li>
                          <li>Adjustment 2: Smoothies - 10% off, Max $3</li>
                        </ul>
                      </li>
                      <li>Require Customer: ON</li>
                      <li><strong>Purchase scenario:</strong>
                        <ul className="ml-4 mt-1 space-y-0.5">
                          <li>Coffee ($5.00) → 5% = $0.25 off (under max) ✓</li>
                          <li>Smoothie ($8.00) → 10% = $0.80 off (under max) ✓</li>
                          <li>Large Coffee ($50.00) → 5% = $2.50, capped at $2.00 max</li>
                          <li>Total saved: $0.25 + $0.80 + $2.00 = $3.05</li>
                        </ul>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Flowchart section removed */}

                <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold mb-2">Management</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/app/(app)/manage/adjustments/page.js</code> - Adjustments list</li>
                    <li><code>/app/(app)/manage/adjustments/[id]/edit/page.js</code> - Adjustment editor</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Application Logic</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/lib/adjustments.js</code> - Discount/surcharge calculation logic</li>
                    <li><code>/app/api/adjustments/route.js</code> - API endpoints</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Models</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/models/Adjustment.js</code> - Adjustment schema</li>
                  </ul>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
                <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
                  <li>Tiered discounts (spend $50 get 10%, spend $100 get 20%)</li>
                  <li>BOGO (Buy One Get One) discount types</li>
                  <li>Coupon codes for customer self-service</li>
                  <li>Usage limits (maximum redemptions per discount)</li>
                  <li>Customer group restrictions (members only, VIP only)</li>
                  <li>Combinability rules (which discounts can stack)</li>
                  <li>Discount analytics and reporting</li>
                  <li>Scheduled automatic activation/deactivation</li>
                </ul>
              </section>

              {/* Waivers */}
              <section id="waivers" className="mb-16 scroll-mt-20">
                <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
                  <FileCheck className="h-6 w-6 shrink-0" />
                  <h2 className="text-2xl font-semibold m-0">Waivers</h2>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
                <p className="text-muted-foreground mb-4">
                  Create and manage digital liability waivers that customers must sign before purchasing specific products or memberships. Waivers collect customer information (name, DOB, gender, signature) and are stored with timestamps for legal compliance.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li><strong>Rich Text Editor:</strong> Create custom waiver text with HTML formatting</li>
                  <li><strong>Product Assignment:</strong> Attach waivers to memberships, classes, or any product type</li>
                  <li><strong>Required Fields:</strong> Collect name, date of birth, gender, and digital signature</li>
                  <li><strong>Digital Signature:</strong> Canvas-based signature capture on checkout</li>
                  <li><strong>Version Control:</strong> Track waiver text and when it was signed</li>
                  <li><strong>Parent/Child:</strong> Adults can sign waivers on behalf of minors</li>
                  <li><strong>Mandatory Blocking:</strong> Cannot proceed with purchase until waiver signed</li>
                  <li><strong>Audit Trail:</strong> Permanent record with signature, IP address, and timestamp</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6 mb-3">Configuration</h3>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold mb-2">Waiver Builder</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Waiver name (internal reference)</li>
                    <li>Waiver text (HTML editor with formatting)</li>
                    <li>Active status (enable/disable)</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Product Assignment</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Attach waiver to specific products in product editor</li>
                    <li>Toggle "Waiver Required" checkbox</li>
                    <li>Select waiver from dropdown</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Collected Data</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Full name</li>
                    <li>Date of birth</li>
                    <li>Gender</li>
                    <li>Digital signature (base64 image)</li>
                    <li>Signed timestamp</li>
                    <li>IP address</li>
                    <li>Waiver version</li>
                  </ul>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenarios</h3>

                <div className="space-y-6 mb-6">
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 1: Gym Membership Waiver</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Liability waiver required for all gym memberships</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Waiver name: "Gym Liability Release 2025"</li>
                      <li>Content: Standard liability clauses, risk acknowledgment</li>
                      <li>Assigned to: All membership products</li>
                      <li><strong>Checkout flow:</strong>
                        <ul className="ml-4 mt-1 space-y-0.5">
                          <li>1. Customer selects membership</li>
                          <li>2. Waiver screen appears before payment</li>
                          <li>3. Customer reads waiver text</li>
                          <li>4. Enters name, DOB, gender</li>
                          <li>5. Signs on canvas with finger/mouse</li>
                          <li>6. Clicks "I Agree" to proceed</li>
                        </ul>
                      </li>
                      <li><strong>Storage:</strong> Waiver saved in customer record with signature image</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 2: Class-Specific Waiver</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> High-intensity class requires separate waiver</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Waiver name: "HIIT Training Medical Clearance"</li>
                      <li>Content: Medical conditions disclosure, emergency contact</li>
                      <li>Assigned to: "HIIT Bootcamp" class product only</li>
                      <li><strong>Customer experience:</strong> Needs waiver for HIIT class but not for yoga</li>
                      <li><strong>Reuse:</strong> Once signed, waiver valid for all future HIIT bookings</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 3: Parent Signing for Child</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Parent purchasing kids martial arts class</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Product: "Kids Martial Arts" (waiver required)</li>
                      <li>Booking: Parent selects child from customer list</li>
                      <li><strong>Waiver screen:</strong>
                        <ul className="ml-4 mt-1 space-y-0.5">
                          <li>Participant name: Emma Smith (child)</li>
                          <li>Participant DOB: 05/12/2015</li>
                          <li>Signing as: Parent/Guardian</li>
                          <li>Guardian signature: Parent signs</li>
                        </ul>
                      </li>
                      <li><strong>Record:</strong> Waiver stored under child's account, signed by parent</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 4: Waiver Verification & Audit</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Verifying waiver compliance</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Location: Customer detail page → Waivers section</li>
                      <li><strong>View details:</strong>
                        <ul className="ml-4 mt-1 space-y-0.5">
                          <li>Waiver name and version</li>
                          <li>Date signed: Oct 15, 2025 at 2:45 PM</li>
                          <li>Signature image</li>
                          <li>Customer data (name, DOB, gender)</li>
                          <li>IP address: 192.168.1.100</li>
                        </ul>
                      </li>
                      <li><strong>Use case:</strong> Legal defense, insurance claims, compliance audits</li>
                    </ul>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold mb-2">Waiver Builder</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/app/(app)/manage/waivers/page.js</code> - Waivers list</li>
                    <li><code>/app/(app)/manage/waivers/builder/page.js</code> - Waiver text editor</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Checkout Integration</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/app/(app)/shop/components/WaiverModal.js</code> - Waiver signature screen</li>
                    <li><code>/app/api/waivers/sign/route.js</code> - Waiver submission API</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Models</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/models/Waiver.js</code> - Waiver template schema</li>
                    <li><code>/models/Customer.js</code> - Stores signed waivers in customer.waivers array</li>
                  </ul>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
                <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
                  <li>Email waiver copy to customer after signing</li>
                  <li>PDF export of signed waivers</li>
                  <li>Waiver expiry dates (re-sign annually)</li>
                  <li>Multi-page waivers with checkbox per section</li>
                  <li>Waiver templates library (gym, martial arts, yoga)</li>
                  <li>Electronic signature verification</li>
                  <li>Custom fields (emergency contact, medical conditions)</li>
                  <li>Witness signature option</li>
                </ul>
              </section>

              {/* Folders */}
              <section id="folders" className="mb-16 scroll-mt-20">
                <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
                  <Folder className="h-6 w-6 shrink-0" />
                  <h2 className="text-2xl font-semibold m-0">Folders</h2>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
                <p className="text-muted-foreground mb-4">
                  Organize shop items into visual folders with customizable colors for quick navigation on the POS screen. Folders create a breadcrumb navigation experience, allowing staff to drill down into categories during checkout.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li><strong>Color Customization:</strong> Assign unique colors to each folder for visual identification</li>
                  <li><strong>Breadcrumb Navigation:</strong> Tap folder → View items → Tap back to return</li>
                  <li><strong>Quick Search:</strong> Search folders by name in management interface</li>
                  <li><strong>Unlimited Items:</strong> Add any number of shop items to a folder</li>
                  <li><strong>Easy Reorganization:</strong> Move products between folders via product editor</li>
                  <li><strong>POS Optimization:</strong> Large touch-friendly folder buttons on checkout screen</li>
                  <li><strong>No Nesting:</strong> Simple single-level folder structure (no subfolders)</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6 mb-3">Configuration</h3>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold mb-2">Creating Folders</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Navigate to Manage → Folders</li>
                    <li>Click "New Folder"</li>
                    <li>Enter folder name (e.g., "Coffee", "Smoothies", "Merchandise")</li>
                    <li>Select color from color picker</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Assigning Products</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Edit shop item product</li>
                    <li>Select folder from dropdown</li>
                    <li>Product now appears in that folder on POS screen</li>
                  </ul>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenarios</h3>

                <div className="space-y-6 mb-6">
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 1: Cafe Organization</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Organizing cafe products by category</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Folders created:
                        <ul className="ml-4 mt-1 space-y-0.5">
                          <li>"Coffee" (brown color) - 8 products</li>
                          <li>"Smoothies" (pink color) - 6 products</li>
                          <li>"Food" (green color) - 12 products</li>
                          <li>"Snacks" (yellow color) - 10 products</li>
                        </ul>
                      </li>
                      <li><strong>POS screen:</strong> Shows 4 large colored folders</li>
                      <li><strong>Staff workflow:</strong> Tap "Coffee" → Shows 8 coffee products → Tap "Cappuccino" → Add to cart</li>
                      <li><strong>Breadcrumb:</strong> "Shop / Coffee" displayed at top</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 2: Gym Pro Shop</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Retail merchandise organization</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Folders:
                        <ul className="ml-4 mt-1 space-y-0.5">
                          <li>"Apparel" (blue) - T-shirts, shorts, hoodies</li>
                          <li>"Accessories" (purple) - Water bottles, towels, bags</li>
                          <li>"Supplements" (orange) - Protein, pre-workout, vitamins</li>
                          <li>"Equipment" (red) - Resistance bands, jump ropes, gloves</li>
                        </ul>
                      </li>
                      <li><strong>Customer:</strong> "Can I buy a protein shake?"</li>
                      <li><strong>Staff:</strong> Taps "Supplements" → Finds protein products → Adds to cart</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 3: Folder Management</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Reorganizing products</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li><strong>Task:</strong> Move "Iced Coffee" from "Coffee" to new "Cold Drinks" folder</li>
                      <li><strong>Steps:</strong>
                        <ul className="ml-4 mt-1 space-y-0.5">
                          <li>1. Create "Cold Drinks" folder (light blue color)</li>
                          <li>2. Edit "Iced Coffee" product</li>
                          <li>3. Change folder dropdown from "Coffee" to "Cold Drinks"</li>
                          <li>4. Save changes</li>
                        </ul>
                      </li>
                      <li><strong>Result:</strong> "Iced Coffee" now appears in "Cold Drinks" folder on POS</li>
                    </ul>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold mb-2">Management</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/app/(app)/manage/folders/page.js</code> - Folders list and CRUD</li>
                    <li><code>/app/api/folders/route.js</code> - API endpoints</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">POS Display</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/app/(app)/shop/(shop)/page.js</code> - Shop POS screen with folder navigation</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Models</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/models/Folder.js</code> - Folder schema</li>
                    <li><code>/models/Product.js</code> - Products reference folder ID</li>
                  </ul>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
                <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
                  <li>Nested folders (subfolders for deeper organization)</li>
                  <li>Folder icons in addition to colors</li>
                  <li>Drag-and-drop folder reordering</li>
                  <li>Folder-level permissions (restrict access per role)</li>
                  <li>Recently used folders (quick access)</li>
                  <li>Folder usage analytics</li>
                  <li>Bulk product assignment to folders</li>
                  <li>Folder templates for common business types</li>
                </ul>
              </section>

              {/* Customer Management */}
              <section id="customer-management" className="mb-16 scroll-mt-20">
                <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
                  <Users className="h-6 w-6 shrink-0" />
                  <h2 className="text-2xl font-semibold m-0">Customer Management</h2>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
                <p className="text-muted-foreground mb-4">
                  Comprehensive customer database with profiles, transaction history, membership tracking, dependents management, and QR code generation. Enables quick customer lookup during checkout and detailed account management.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li><strong>Customer Profiles:</strong> Store name, email, phone, address, DOB, gender</li>
                  <li><strong>Quick Lookup:</strong> Search by name, email, phone, or member number during checkout</li>
                  <li><strong>Member Numbers:</strong> Automatic sequential number assignment for identification</li>
                  <li><strong>Dependents:</strong> Link family members (parent-child relationships)</li>
                  <li><strong>Membership Tracking:</strong> View active/cancelled/expired memberships</li>
                  <li><strong>Transaction History:</strong> Complete purchase history with filtering</li>
                  <li><strong>QR Codes:</strong> View/download QR codes for check-ins</li>
                  <li><strong>Credits:</strong> Manually assign gift card credits with expiry dates</li>
                  <li><strong>Waiver Status:</strong> See which waivers have been signed</li>
                  <li><strong>Notes:</strong> Add internal notes visible only to staff</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6 mb-3">Customer Detail Page Sections</h3>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold mb-2">Basic Information Card</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Profile photo/avatar</li>
                    <li>Member ID, DOB, Gender</li>
                    <li>Email, phone, address</li>
                    <li>Waiver signed badge</li>
                    <li>Member since date</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Memberships Section</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Active memberships with status badges</li>
                    <li>Membership actions (pause, cancel, view QR)</li>
                    <li>Next billing date</li>
                    <li>Cancellation warnings if scheduled</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Dependents Section</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>List of linked children/dependents</li>
                    <li>Quick link to dependent profiles</li>
                    <li>Add new dependent button</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Transaction History</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Paginated table of all purchases</li>
                    <li>Filter by date range, product type</li>
                    <li>View transaction details</li>
                    <li>Process refunds</li>
                  </ul>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenarios</h3>

                <div className="space-y-6 mb-6">
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 1: New Customer Creation During Checkout</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Walk-in customer purchasing class</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Staff adds "Yoga Class" to cart</li>
                      <li>Clicks "Add Customer" → "Create New"</li>
                      <li>Enters: Name, email, phone (minimum required)</li>
                      <li>Optional: Address, DOB, gender</li>
                      <li>System auto-assigns member number: #365115</li>
                      <li><strong>Result:</strong> Customer added to cart, proceeds to payment</li>
                      <li><strong>After purchase:</strong> Customer receives email with QR code</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 2: Quick Customer Lookup</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Regular customer at front desk</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Customer: "I'd like to buy a protein shake"</li>
                      <li>Staff: "What's your name?"</li>
                      <li>Customer: "John Smith"</li>
                      <li>Staff searches "john" in customer lookup</li>
                      <li><strong>Results:</strong> 3 matches shown with photos/member numbers</li>
                      <li>Staff selects correct John Smith (#365042)</li>
                      <li><strong>Cart updates:</strong> Customer name shown, eligible discounts auto-apply</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 3: Family/Dependents Management</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Parent with 2 children accounts</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Parent account: Sarah Johnson (#365001)</li>
                      <li>Dependents: Emma Johnson (#365002), Jack Johnson (#365003)</li>
                      <li><strong>Booking kids class:</strong>
                        <ul className="ml-4 mt-1 space-y-0.5">
                          <li>Select "Kids Swimming" product</li>
                          <li>Add customer → Search "Johnson"</li>
                          <li>Select Emma, then add Jack</li>
                          <li>Cart: 2 × Kids Swimming ($30 each) = $60</li>
                          <li>Payment linked to parent Sarah's account</li>
                        </ul>
                      </li>
                      <li><strong>Transaction record:</strong> Payer = Sarah, Participants = Emma + Jack</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 4: Manual Credit Assignment</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Customer complains about service issue</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Manager navigates to customer detail page</li>
                      <li>Clicks "Add Credit"</li>
                      <li>Enters: Amount $50, Expiry date (30 days), Reason "Service recovery"</li>
                      <li><strong>Result:</strong> $50 credit added to customer account</li>
                      <li><strong>Next purchase:</strong> Credit automatically applied at checkout</li>
                      <li><strong>Expiry:</strong> After 30 days, unused credit becomes invalid</li>
                    </ul>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold mb-2">Management</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/app/(app)/manage/customers/page.js</code> - Customer list view</li>
                    <li><code>/app/(app)/manage/customers/[id]/page.js</code> - Customer detail page</li>
                    <li><code>/app/api/customers/route.js</code> - CRUD API endpoints</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Checkout Integration</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/app/(app)/shop/components/CustomerLookup.js</code> - Search modal</li>
                    <li><code>/app/api/customers/search/route.js</code> - Search API</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Models</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/models/Customer.js</code> - Customer schema</li>
                  </ul>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
                <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
                  <li>Customer mobile app for self-service</li>
                  <li>Birthday tracking with automated rewards</li>
                  <li>Customer groups/segments for targeted marketing</li>
                  <li>Loyalty points/rewards program</li>
                  <li>Customer merge (combine duplicate accounts)</li>
                  <li>Export customer list to CSV</li>
                  <li>Custom fields for business-specific data</li>
                  <li>Email marketing integration</li>
                  <li>SMS notifications for appointments/renewals</li>
                </ul>
              </section>

              {/* Transaction Management */}
              <section id="transactions" className="mb-16 scroll-mt-20">
                <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
                  <Receipt className="h-6 w-6 shrink-0" />
                  <h2 className="text-2xl font-semibold m-0">Transaction Management</h2>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
                <p className="text-muted-foreground mb-4">
                  Complete transaction history with search, filtering, detailed views, and refund processing. Every purchase creates a permanent transaction record with cart details, payment method, customer info, and audit trail.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li><strong>Transaction List View:</strong> Paginated table with sorting and filtering</li>
                  <li><strong>Search:</strong> Find transactions by customer name, transaction ID, or amount</li>
                  <li><strong>Date Range Filter:</strong> View transactions within specific date ranges</li>
                  <li><strong>Payment Method Filter:</strong> Filter by cash, card, or other payment types</li>
                  <li><strong>Detailed View:</strong> Complete transaction breakdown with line items</li>
                  <li><strong>Refund Processing:</strong> Full and partial refunds with reason tracking</li>
                  <li><strong>Receipt Regeneration:</strong> Resend email receipts to customers</li>
                  <li><strong>Stripe Integration:</strong> Direct link to Stripe dashboard for card payments</li>
                  <li><strong>Audit Trail:</strong> Employee who processed sale, timestamp, location</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6 mb-3">Transaction Record Structure</h3>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold mb-2">Header Information</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Transaction ID (unique identifier)</li>
                    <li>Customer name and ID</li>
                    <li>Date/time of purchase</li>
                    <li>Total amount</li>
                    <li>Status (completed, refunded, partially refunded)</li>
                    <li>Payment method (cash, card, stripe)</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Cart Details</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Line items with product names, prices, quantities</li>
                    <li>Applied discounts with amounts</li>
                    <li>Applied surcharges</li>
                    <li>Subtotal, tax, total breakdown</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Metadata</p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Employee who processed sale</li>
                    <li>Location/terminal</li>
                    <li>Stripe payment intent ID (if card payment)</li>
                    <li>Refund history (if applicable)</li>
                  </ul>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenarios</h3>

                <div className="space-y-6 mb-6">
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 1: Transaction Search & View</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Customer requests receipt from last week</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Staff navigates to Manage → Transactions</li>
                      <li>Searches "John Smith"</li>
                      <li><strong>Results:</strong> 3 transactions found</li>
                      <li>Filters by date range: Last 7 days</li>
                      <li><strong>Match found:</strong> Oct 15, 2025 - $23.50</li>
                      <li>Clicks to view transaction details</li>
                      <li><strong>Details shown:</strong>
                        <ul className="ml-4 mt-1 space-y-0.5">
                          <li>2× Cappuccino (Large) @ $5.50 = $11.00</li>
                          <li>1× Muffin @ $4.50</li>
                          <li>Subtotal: $15.50</li>
                          <li>GST (10%): $1.55</li>
                          <li>Card Processing Fee (1.5%): $0.23</li>
                          <li>Total: $17.28</li>
                        </ul>
                      </li>
                      <li>Clicks "Resend Receipt" → Email sent to customer</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 2: Full Refund Processing</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Customer unhappy with class, requests refund</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Transaction: "Morning Yoga" - $20.00 (paid by card)</li>
                      <li>Staff opens transaction detail page</li>
                      <li>Clicks "Process Refund"</li>
                      <li><strong>Refund modal:</strong>
                        <ul className="ml-4 mt-1 space-y-0.5">
                          <li>Refund type: Full refund</li>
                          <li>Amount: $20.00 (auto-filled)</li>
                          <li>Reason: "Customer dissatisfied with class"</li>
                          <li>Requires manager authorization</li>
                        </ul>
                      </li>
                      <li>Manager enters PIN to authorize</li>
                      <li><strong>System actions:</strong>
                        <ul className="ml-4 mt-1 space-y-0.5">
                          <li>Stripe refund processed automatically</li>
                          <li>Transaction status updated to "refunded"</li>
                          <li>Refund record added with timestamp + employee</li>
                          <li>Customer class booking cancelled</li>
                        </ul>
                      </li>
                      <li><strong>Result:</strong> $20 returned to customer's card in 5-10 business days</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 3: Partial Refund</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Customer received wrong item, keeping partial order</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Transaction: 3 items totaling $45.00</li>
                      <li>Issue: One item was wrong ($15.00)</li>
                      <li><strong>Refund process:</strong>
                        <ul className="ml-4 mt-1 space-y-0.5">
                          <li>Type: Partial refund</li>
                          <li>Amount: $15.00</li>
                          <li>Reason: "Incorrect item provided"</li>
                        </ul>
                      </li>
                      <li><strong>Result:</strong>
                        <ul className="ml-4 mt-1 space-y-0.5">
                          <li>$15.00 refunded to customer</li>
                          <li>Transaction status: "partially refunded"</li>
                          <li>New balance: $30.00 (original $45 - $15 refund)</li>
                        </ul>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Scenario 4: End-of-Day Reconciliation</h4>
                    <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Manager reviewing daily sales</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Navigate to Transactions</li>
                      <li>Filter: Date = Today, Status = Completed</li>
                      <li><strong>Summary view:</strong>
                        <ul className="ml-4 mt-1 space-y-0.5">
                          <li>Total transactions: 127</li>
                          <li>Card payments: $3,245.50 (89 transactions)</li>
                          <li>Cash payments: $892.00 (38 transactions)</li>
                          <li>Total sales: $4,137.50</li>
                          <li>Total refunds: -$125.00 (3 refunds)</li>
                          <li>Net revenue: $4,012.50</li>
                        </ul>
                      </li>
                      <li>Export to CSV for accounting</li>
                      <li><strong>Cash drawer:</strong> Count physical cash, should equal $892.00</li>
                    </ul>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold mb-2">Management</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/app/(app)/manage/transactions/page.js</code> - Transaction list view</li>
                    <li><code>/app/(app)/manage/transactions/[id]/page.js</code> - Transaction detail page</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">API Routes</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/app/api/transactions/route.js</code> - List/search API</li>
                    <li><code>/app/api/transactions/[id]/refund/route.js</code> - Refund processing</li>
                    <li><code>/app/api/checkout/route.js</code> - Transaction creation</li>
                  </ul>
                  <p className="text-sm font-semibold mt-3 mb-2">Models</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>/models/Transaction.js</code> - Transaction schema</li>
                  </ul>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
                <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
                  <li>Advanced reporting and analytics dashboard</li>
                  <li>Export transactions to accounting software (QuickBooks, Xero)</li>
                  <li>Transaction notes/comments for staff communication</li>
                  <li>Void transaction functionality</li>
                  <li>Transaction editing (pre-settlement)</li>
                  <li>Tip adjustment for card payments</li>
                  <li>Receipt customization per transaction</li>
                  <li>Transaction splitting (divide bill)</li>
                  <li>Gift receipt generation</li>
                </ul>
              </section>

            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
