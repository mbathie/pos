'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, Key, UserPlus, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function CustomerPortalPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-20 w-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white">
            <Smartphone className="h-10 w-10" />
          </div>
          <CardTitle className="text-3xl">Customer Portal</CardTitle>
          <CardDescription className="text-lg mt-2">
            Manage your gym membership and account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-2 hover:border-blue-500 transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Smartphone className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Mobile App</CardTitle>
                    <CardDescription>Access on the go</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Download our mobile app to book classes, check in, and manage your membership.
                </p>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline">
                    App Store
                  </Button>
                  <Button size="sm" variant="outline">
                    Google Play
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-green-500 transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <UserPlus className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">New Member?</CardTitle>
                    <CardDescription>Join our gym today</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Sign up for a membership and get access to all our facilities and classes.
                </p>
                <Button size="sm" className="w-full">
                  Sign Up Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link href="/c/reset-password">
                <Button variant="outline" className="w-full">
                  <Key className="mr-2 h-4 w-4" />
                  Reset Password
                </Button>
              </Link>
              <Button variant="outline" className="w-full">
                Class Schedule
              </Button>
              <Button variant="outline" className="w-full">
                Membership Plans
              </Button>
              <Button variant="outline" className="w-full">
                Contact Support
              </Button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600">
              For the best experience, download our mobile app
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Available on iOS and Android devices
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}