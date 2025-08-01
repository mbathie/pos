'use client'
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, Mail, Phone, IdCard, Calendar, MapPin, Receipt } from "lucide-react";
import TransactionsTable from '@/components/transactions-table';
import dayjs from 'dayjs';

export default function CustomerDetailPage({ params }) {
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState(null);

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

  const getInitials = (name) => {
    if (!name) return 'UN';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
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
        
        {/* <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-medium">
            {getInitials(customer.name)}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{customer.name || 'Unnamed Customer'}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Member since {dayjs(customer.createdAt).format('MMMM YYYY')}</span>
              {customer.waiver?.agree && (
                <Badge variant="outline" className="text-xs">
                  Waiver Signed
                </Badge>
              )}
            </div>
          </div>
        </div> */}
      </div>

      {/* Customer Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 flex-shrink-0">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-sm">{customer.name || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Member ID</label>
                <p className="text-sm font-mono">{customer.memberId || 'Not assigned'}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Gender</label>
                <p className="text-sm capitalize">{customer.gender || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                <p className="text-sm">
                  {customer.dob ? dayjs(customer.dob).format('DD/MM/YYYY') : 'Not provided'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="size-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Mail className="size-4" />
                Email
              </label>
              <p className="text-sm">{customer.email || 'Not provided'}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Phone className="size-4" />
                Phone
              </label>
              <p className="text-sm">{formatPhone(customer.phone)}</p>
            </div>
            
            {customer.address && (
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="size-4" />
                  Address
                </label>
                <div className="text-sm space-y-1">
                  {customer.address.address1 && <p>{customer.address.address1}</p>}
                  {(customer.address.city || customer.address.state || customer.address.postcode) && (
                    <p>
                      {[customer.address.city, customer.address.state, customer.address.postcode]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="size-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Joined</label>
                <p className="text-sm">{dayjs(customer.createdAt).format('DD/MM/YYYY h:mm A')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="text-sm">{dayjs(customer.updatedAt).format('DD/MM/YYYY h:mm A')}</p>
              </div>
            </div>
            
            {customer.waiver && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Waiver Status</label>
                <div className="flex items-center gap-2 mt-1">
                  {customer.waiver.agree ? (
                    <>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Signed
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        on {dayjs(customer.waiver.signed).format('DD/MM/YYYY')}
                      </span>
                    </>
                  ) : (
                    <Badge variant="outline" className="text-red-600 border-red-600">
                      Not Signed
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IdCard className="size-5" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Customer ID</label>
              <p className="text-sm font-mono">{customer._id}</p>
            </div>
            
            {customer.assigned !== undefined && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Assignment Status</label>
                <p className="text-sm">
                  {customer.assigned ? 'Assigned to session' : 'Available for assignment'}
                </p>
              </div>
            )}
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
          className="flex-1"
        />
      </div>
    </div>
  );
}