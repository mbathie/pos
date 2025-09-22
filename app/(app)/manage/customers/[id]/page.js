'use client'
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, Mail, Phone, CreditCard, Calendar, MapPin, Receipt, Users, DollarSign, Plus, ExternalLink, MoreVertical, Pause, Play, X } from "lucide-react";
import TransactionsTable from '@/components/transactions-table';
import { CustomerAvatar } from '@/components/customer-avatar';
import { useGlobals } from '@/lib/globals';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { MembershipPauseDialog } from '@/components/membership-pause-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

dayjs.extend(relativeTime);

export default function CustomerDetailPage({ params }) {
  const router = useRouter();
  const { employee } = useGlobals();
  const [customer, setCustomer] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [parentMemberships, setParentMemberships] = useState([]);
  const [dependentMemberships, setDependentMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState(null);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditNote, setCreditNote] = useState('');
  const [creditLoading, setCreditLoading] = useState(false);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState(null);
  const [org, setOrg] = useState(null);

  // Handle async params in Next.js 15+
  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setCustomerId(resolvedParams.id);
    };
    getParams();
  }, [params]);

  useEffect(() => {
    if (customerId) {
      fetchCustomer();
      fetchMemberships();
      fetchOrgSettings();
    }
  }, [customerId]);

  const fetchCustomer = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/customers/${customerId}`);
      if (response.ok) {
        const customerData = await response.json();
        setCustomer(customerData);
      } else {
        console.error('Failed to fetch customer');
        // Redirect back to customers list if customer not found
        router.push('/manage/customers');
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
      router.push('/manage/customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberships = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}/memberships`);
      if (response.ok) {
        const membershipData = await response.json();
        const allMemberships = membershipData.memberships || [];
        setMemberships(allMemberships);

        // Separate parent memberships (where customer is the actual member)
        // from dependent memberships (where customer is the guardian)
        const parentMems = allMemberships.filter(m => !m.dependent);
        const dependentMems = allMemberships.filter(m => m.dependent);

        setParentMemberships(parentMems);
        setDependentMemberships(dependentMems);
      } else {
        console.error('Failed to fetch memberships');
      }
    } catch (error) {
      console.error('Error fetching memberships:', error);
    }
  };

  const fetchOrgSettings = async () => {
    try {
      const response = await fetch('/api/orgs');
      if (response.ok) {
        const data = await response.json();
        setOrg(data.org);
      }
    } catch (error) {
      console.error('Error fetching org settings:', error);
    }
  };

  const formatPhone = (phone) => {
    if (!phone) return 'Not provided';
    // Format phone number as (xxx) xxx-xxxx
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'cancelled':
        return 'destructive';
      case 'expired':
        return 'secondary';
      case 'suspended':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatBillingPeriod = (variation, unit) => {
    if (variation === "1" && unit === "month") return "Monthly";
    if (variation === "1" && unit === "year") return "Yearly";
    return `${variation} ${unit}${parseInt(variation) > 1 ? 's' : ''}`;
  };

  const handleCancelScheduledPause = async (membership) => {
    if (!confirm('Cancel the scheduled pause for this membership?')) {
      return;
    }

    try {
      const response = await fetch(`/api/memberships/${membership._id}/cancel-scheduled-pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        toast.success('Scheduled pause cancelled');
        fetchMemberships();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to cancel scheduled pause');
      }
    } catch (error) {
      console.error('Error cancelling scheduled pause:', error);
      toast.error('Failed to cancel scheduled pause');
    }
  };

  const handleResumeMembership = async (membership) => {
    try {
      const response = await fetch(`/api/memberships/${membership._id}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const result = await response.json();

        if (result.creditAdjustment) {
          toast.success(`Membership resumed early. Credit adjusted by $${result.creditAdjustment.amount.toFixed(2)}`);
        } else {
          toast.success('Membership resumed successfully');
        }

        fetchMemberships();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to resume membership');
      }
    } catch (error) {
      console.error('Error resuming membership:', error);
      toast.error('Failed to resume membership');
    }
  };

  const handleAddCredit = async () => {
    if (!creditAmount || parseFloat(creditAmount) <= 0) return;
    
    setCreditLoading(true);
    try {
      const response = await fetch(`/api/customers/${customerId}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(creditAmount),
          note: creditNote
        })
      });
      
      if (response.ok) {
        const updatedCustomer = await response.json();
        setCustomer(updatedCustomer);
        setCreditDialogOpen(false);
        setCreditAmount('');
        setCreditNote('');
      } else {
        console.error('Failed to add credit');
      }
    } catch (error) {
      console.error('Error adding credit:', error);
    } finally {
      setCreditLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-4">
        <div className="text-center py-8 text-muted-foreground">
          Loading customer details...
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="mx-4">
        <div className="text-center py-8 text-muted-foreground">
          Customer not found.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 h-[calc(100vh-65px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/manage/customers')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        
        <div className="text-sm text-muted-foreground">
          Member since {dayjs(customer.createdAt).format('MMMM YYYY')}
        </div>
      </div>

      {/* Customer Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 flex-shrink-0">
        {/* Combined Basic & Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-start gap-3">
              <CustomerAvatar 
                customer={customer} 
                size="xl" 
                shape="square"
              />
              <div className="flex flex-col gap-1">
                <span className="">{customer.name || 'Unnamed Customer'}</span>
                {customer.waiver?.agree && (
                  <Badge variant="outline" className="text-xs text-primary border-primary w-fit">
                    Waiver Signed
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-x-6 gap-y-4">
              {/* Row 1 */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Member ID</label>
                <p className="text-sm font-mono">{customer.memberId || 'Not assigned'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Date of Birth</label>
                <p className="text-sm">
                  {customer.dob ? dayjs(customer.dob).format('DD/MM/YYYY') : 'Not provided'}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Gender</label>
                <p className="text-sm capitalize">{customer.gender || 'Not specified'}</p>
              </div>
              
              {/* Row 2 */}
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Mail className="size-3" />
                  Email
                </label>
                <p className="text-sm truncate" title={customer.email}>{customer.email || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Phone className="size-3" />
                  Phone
                </label>
                <p className="text-sm">{formatPhone(customer.phone)}</p>
              </div>
              
              {/* Row 3 - Address spans full width if present */}
              {customer.address && (
                <div className="col-span-3">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <MapPin className="size-3" />
                    Address
                  </label>
                  <p className="text-sm">
                    {[customer.address.address1, 
                      [customer.address.city, customer.address.state, customer.address.postcode].filter(Boolean).join(', ')]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Membership Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-5" />
              Membership Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {parentMemberships.length > 0 ? (
              <div className="space-y-3">
                {parentMemberships.map((membership, index) => (
                  <div key={membership._id || index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{membership.product?.name || 'Unknown Product'}</p>
                        <p className="text-xs text-muted-foreground">
                          {membership.priceName} • {formatBillingPeriod(membership.variation, membership.unit)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-1">
                          <Badge variant={getStatusBadgeVariant(membership.status)} className="capitalize">
                            {membership.status}
                          </Badge>
                          {membership.scheduledPauseDate && membership.status === 'active' && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Pause: {dayjs(membership.scheduledPauseDate).format('DD/MM')}
                              <button
                                onClick={() => handleCancelScheduledPause(membership)}
                                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                                title="Cancel scheduled pause"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )}
                        </div>
                        {membership.status === 'active' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedMembership(membership);
                                  setPauseDialogOpen(true);
                                }}
                                className="cursor-pointer"
                              >
                                <Pause className="mr-2 h-4 w-4" />
                                Pause Membership
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {membership.status === 'suspended' && membership.suspendedUntil && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleResumeMembership(membership)}
                                className="cursor-pointer"
                              >
                                <Play className="mr-2 h-4 w-4" />
                                Resume Membership
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Started</label>
                        <p className="text-sm">{dayjs(membership.subscriptionStartDate).format('DD/MM/YYYY')}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          {membership.status === 'suspended' ? 'Resumes' :
                           membership.scheduledPauseDate ? 'Pause Starts' : 'Next Billing'}
                        </label>
                        <p className="text-sm">
                          {(() => {
                            if (membership.status === 'suspended') {
                              // Check for suspension info in the membership itself
                              if (membership.suspendedUntil) {
                                return dayjs(membership.suspendedUntil).format('DD/MM/YYYY');
                              }
                            } else if (membership.scheduledPauseDate) {
                              // Show scheduled pause date
                              return dayjs(membership.scheduledPauseDate).format('DD/MM/YYYY');
                            }
                            // Check for latest suspension in suspensions array
                            const latestSuspension = membership.suspensions?.slice(-1)[0];
                            if (latestSuspension?.resumesAt) {
                              return dayjs(latestSuspension.resumesAt).format('DD/MM/YYYY');
                            }
                            return dayjs(membership.nextBillingDate).format('DD/MM/YYYY');
                          })()}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Amount</label>
                      <p className="text-sm font-medium">${membership.amount}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <CreditCard className="size-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No active memberships</p>
                <p className="text-xs text-muted-foreground">Customer has no current membership subscriptions</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dependents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              Dependents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customer.dependents && customer.dependents.length > 0 ? (
              <div className="space-y-3">
                {customer.dependents.map((dependent, index) => {
                  // Find membership for this dependent
                  const dependentMembership = dependentMemberships.find(m => 
                    m.dependent?._id === dependent._id
                  );
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CustomerAvatar 
                            customer={dependent} 
                            size="sm" 
                          />
                          <div>
                            <p className="font-medium text-sm">{dependent.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{dependent.gender || 'Not specified'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {dependent.dob && (
                            <Badge variant="outline" className="text-xs">
                              {(() => {
                                const age = dayjs().diff(dayjs(dependent.dob), 'year');
                                return `${age} year${age !== 1 ? 's' : ''} old`;
                              })()}
                            </Badge>
                          )}
                          {dependentMembership && (
                            <Badge variant={getStatusBadgeVariant(dependentMembership.status)} className="text-xs capitalize">
                              {dependentMembership.status} Member
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {dependent.dob && (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Date of Birth</label>
                          <p className="text-sm">{dayjs(dependent.dob).format('DD/MM/YYYY')}</p>
                        </div>
                      )}
                      
                      {dependentMembership && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium">{dependentMembership.product?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              ${dependentMembership.amount}/{dependentMembership.unit === 'month' ? 'mo' : dependentMembership.unit === 'year' ? 'yr' : dependentMembership.unit}
                            </p>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">Next billing</p>
                            <p className="text-xs">{dayjs(dependentMembership.nextBillingDate).format('DD/MM/YYYY')}</p>
                          </div>
                        </div>
                      )}
                      {index < customer.dependents.length - 1 && <div className="border-b mt-3" />}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <Users className="size-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No dependents</p>
                <p className="text-xs text-muted-foreground">This customer has no registered dependents</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Credit Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between items-start">
              <div className="flex items-center gap-2">
                <DollarSign className="size-5" />
                <span>Credit</span>
                <span className="">${(customer.credits?.balance || 0).toFixed(2)}</span>
              </div>
              {(employee?.role === 'ADMIN' || employee?.role === 'MANAGER') && (
                <Button 
                  size="sm" 
                  onClick={() => setCreditDialogOpen(true)}
                  className="cursor-pointer"
                >
                  <Plus className="size-4 mr-1" />
                  Add Credit
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Credit History */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Recent Activity</p>
              {customer.credits?.credits?.length > 0 || customer.credits?.debits?.length > 0 ? (
                <div className="max-h-48 overflow-y-auto">
                  {/* Combine and sort credits and debits by date */}
                  {[
                    ...(customer.credits?.credits || []).map(c => ({ ...c, type: 'credit' })),
                    ...(customer.credits?.debits || []).map(d => ({ ...d, type: 'debit' }))
                  ]
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 10)
                    .map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {item.type === 'credit' ? '+' : '-'}${item.amount.toFixed(2)}
                          </span>
                          {/* {item.note && (
                            <span className="text-xs text-muted-foreground italic">
                              {item.note}
                            </span>
                          )} */}
                          {item.transaction && (
                            <ExternalLink 
                              className="size-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" 
                              onClick={() => router.push(`/manage/transactions/${item.transaction}`)}
                            />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground text-right flex gap-1">
                          <div>{dayjs(item.date).fromNow()}..</div>
                          <div>{dayjs(item.date).format('DD/MM/YYYY')}</div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No credit history</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Receipt className="size-5" />
            Transaction History
          </h2>
          {/* <p className="text-sm text-muted-foreground">
            All transactions for this customer
          </p> */}
        </div>
        
        <TransactionsTable 
          customerId={customerId} 
          showFilters={false}
          className="flex-1 pb-4"
        />
      </div>
      
      {/* Add Credit Dialog */}
      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Credit</DialogTitle>
            <DialogDescription>
              Add credit to {customer?.name}'s account. This will be immediately available for use.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Add a note about this credit..."
                value={creditNote}
                onChange={(e) => setCreditNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setCreditDialogOpen(false);
                setCreditAmount('');
                setCreditNote('');
              }}
              disabled={creditLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddCredit}
              disabled={!creditAmount || parseFloat(creditAmount) <= 0 || creditLoading}
            >
              {creditLoading ? 'Adding...' : 'Add Credit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pause Membership Dialog */}
      {selectedMembership && (
        <MembershipPauseDialog
          open={pauseDialogOpen}
          onOpenChange={setPauseDialogOpen}
          membership={selectedMembership}
          customer={customer}
          maxDays={org?.membershipSuspensionDaysPerYear || 30}
          onPause={() => {
            fetchMemberships();
            fetchCustomer();
          }}
        />
      )}
    </div>
  );
}