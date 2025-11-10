'use client'

import { useEffect, useState } from "react";
import { useRouter, useParams } from 'next/navigation';
import { useGlobals } from '@/lib/globals';
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CompanyForm } from '@/components/company-form';
import { ChevronLeft, Building2 } from "lucide-react";

export default function CompanyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { employee } = useGlobals();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id || !employee?._id) {
      return;
    }

    const fetchCompany = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/companies/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setCompany(data.company);
        } else if (response.status === 404) {
          router.push('/manage/companies');
        } else {
          console.error('Failed to fetch company:', response.status);
        }
      } catch (error) {
        console.error('Error fetching company:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [params.id, employee?._id, router]);

  const handleSuccess = () => {
    router.push('/manage/companies');
  };

  const handleCancel = () => {
    router.push('/manage/companies');
  };

  if (!employee?._id) {
    return (
      <div className="h-[calc(100vh-65px)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-[calc(100vh-65px)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading company...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="h-[calc(100vh-65px)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Company not found</p>
          <Button
            variant="outline"
            className="mt-4 cursor-pointer"
            onClick={() => router.push('/manage/companies')}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Companies
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mr-auto px-4 pt-2 w-full h-full flex flex-col py-4">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <Button
          variant="ghost"
          className="mb-4 -ml-2 cursor-pointer"
          onClick={() => router.push('/manage/companies')}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Companies
        </Button>

        <div className="flex items-center gap-4 mb-2">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Building2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{company.name}</h1>
            <p className="text-sm text-muted-foreground">
              Company Details
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent>
            <CompanyForm
              initialData={company}
              onSuccess={handleSuccess}
              hideActions={true}
              formId="company-detail-form"
            />

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 mt-6">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <ActionButton
                  type="submit"
                  form="company-detail-form"
                  requireAreYouSure={false}
                  action={async () => {
                    // Form submission is handled by the form itself
                    return { success: true };
                  }}
                  className="cursor-pointer"
                >
                  Update Company
                </ActionButton>
              </div>

              <ActionButton
                variant="destructive"
                requireAreYouSure={true}
                areYouSureDescription="Are you sure you want to delete this company? This action cannot be undone."
                action={async () => {
                  try {
                    const response = await fetch(`/api/companies/${params.id}`, {
                      method: 'DELETE'
                    });

                    if (response.ok) {
                      router.push('/manage/companies');
                      return { success: true };
                    } else {
                      return { error: true, message: 'Failed to delete company' };
                    }
                  } catch (error) {
                    return { error: true, message: 'Error deleting company' };
                  }
                }}
                className="cursor-pointer"
              >
                Delete Company
              </ActionButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
