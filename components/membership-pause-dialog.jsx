'use client'

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar as CalendarIcon, Info } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function MembershipPauseDialog({
  open,
  onOpenChange,
  membership,
  customer,
  onPause,
  maxDays = 30
}) {
  const [suspensionDays, setSuspensionDays] = useState(7);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [remainingDays, setRemainingDays] = useState(null);
  const [loadingRemaining, setLoadingRemaining] = useState(false);
  const [membershipInfo, setMembershipInfo] = useState(null);
  const [pauseStartDate, setPauseStartDate] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (open && membership) {
      fetchRemainingDays();
      // Reset to immediate pause by default
      setPauseStartDate(null);
      setShowCalendar(false);
    }
  }, [open, membership]);

  const fetchRemainingDays = async () => {
    setLoadingRemaining(true);
    try {
      const response = await fetch(`/api/memberships/${membership._id}/suspension-info`);
      if (response.ok) {
        const data = await response.json();
        setRemainingDays(data.remainingDays);
        setMembershipInfo(data.membership);
        // Set default suspension days to minimum of 7 or remaining days
        setSuspensionDays(Math.min(7, data.remainingDays));
      }
    } catch (error) {
      console.error('Error fetching remaining days:', error);
    } finally {
      setLoadingRemaining(false);
    }
  };

  const handlePause = async () => {
    if (!suspensionDays || suspensionDays <= 0) {
      toast.error('Please enter a valid number of days');
      return;
    }

    if (remainingDays !== null && suspensionDays > remainingDays) {
      toast.error(`Cannot exceed ${remainingDays} remaining suspension days`);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/memberships/${membership._id}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suspensionDays,
          note,
          customerId: customer._id,
          pauseStartDate: pauseStartDate ? dayjs(pauseStartDate).format('YYYY-MM-DD') : null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to pause membership');
      }

      const data = await response.json();

      // Show success with warning if Stripe wasn't updated
      if (data.note) {
        toast.warning(`Membership paused for ${suspensionDays} days. Note: ${data.note}`);
      } else {
        toast.success(`Membership paused for ${suspensionDays} days`);
      }

      // Reset form
      setSuspensionDays(7);
      setNote('');

      // Call callback if provided
      if (onPause) {
        onPause(data);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error pausing membership:', error);
      toast.error(error.message || 'Failed to pause membership');
    } finally {
      setLoading(false);
    }
  };

  const calculateResumeDate = () => {
    const startDate = pauseStartDate ? dayjs(pauseStartDate) : dayjs();
    const resumeDate = startDate.add(suspensionDays, 'day');
    return resumeDate.format('dddd, MMMM D, YYYY');
  };

  const getMinDate = () => {
    // Tomorrow is the minimum date for scheduled pauses
    return dayjs().add(1, 'day').toDate();
  };

  const getMaxDate = () => {
    // Maximum is next billing date minus 1 day
    if (membershipInfo?.nextBillingDate) {
      return dayjs(membershipInfo.nextBillingDate).subtract(1, 'day').toDate();
    }
    return dayjs().add(30, 'day').toDate();
  };

  const effectiveMaxDays = remainingDays !== null ? Math.min(maxDays, remainingDays) : maxDays;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Pause Membership</DialogTitle>
          <DialogDescription>
            Temporarily suspend {customer?.name}'s membership. The member will receive a prorated credit for the paused period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Membership Info */}
          <div className="bg-muted/50 p-3 rounded-lg space-y-1">
            <p className="text-sm font-medium">{membership?.product?.name}</p>
            <p className="text-xs text-muted-foreground">
              ${membership?.amount}/{membership?.unit === 'month' ? 'month' : membership?.unit}
            </p>
          </div>


          {/* Pause Start Date Selection */}
          <div className="space-y-2">
            <Label>When to Pause</Label>
            <div className="flex flex-col space-y-2">
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant={!showCalendar ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setShowCalendar(false);
                    setPauseStartDate(null);
                  }}
                  disabled={loading}
                  className="cursor-pointer"
                >
                  Pause Immediately
                </Button>
                <Button
                  type="button"
                  variant={showCalendar ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowCalendar(true)}
                  disabled={loading}
                  className="cursor-pointer"
                >
                  Schedule for Later
                </Button>
              </div>

              {showCalendar && (
                <div className="border rounded-lg p-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal cursor-pointer",
                          !pauseStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {pauseStartDate ? (
                          format(pauseStartDate, "PPP")
                        ) : (
                          "Select pause start date"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={pauseStartDate}
                        onSelect={setPauseStartDate}
                        disabled={(date) => {
                          // Disable past dates and today
                          if (date <= new Date()) return true;
                          // Disable dates after next billing date
                          if (membershipInfo?.nextBillingDate) {
                            const nextBilling = new Date(membershipInfo.nextBillingDate);
                            return date >= nextBilling;
                          }
                          return false;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {pauseStartDate && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Pause will start on {format(pauseStartDate, "MMMM d, yyyy")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Suspension Days Input */}
          <div className="space-y-2">
            <Label htmlFor="suspension-days">Number of Days to Pause</Label>
            <div className="flex items-center space-x-2">
              <NumberInput
                id="suspension-days"
                min={1}
                max={effectiveMaxDays}
                value={suspensionDays}
                onChange={(value) => setSuspensionDays(value)}
                disabled={loading || remainingDays === 0}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                days (max {effectiveMaxDays})
              </span>
            </div>
          </div>

          {/* Resume Date Preview */}
          {suspensionDays > 0 && (
            <div className="flex items-center space-x-2 text-sm">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Will resume on:</span>
              <span className="font-medium">{calculateResumeDate()}</span>
            </div>
          )}

          {/* Note Field */}
          <div className="space-y-2">
            <Label htmlFor="note">Note (Optional)</Label>
            <Textarea
              id="note"
              placeholder="Reason for suspension..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={loading || remainingDays === 0}
              rows={3}
            />
          </div>

          {/* Credit Preview */}
          {suspensionDays > 0 && (membershipInfo || membership) && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-3 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>Credit Amount:</strong> Approximately ${(() => {
                  const mem = membershipInfo || membership;
                  if (!mem?.amount) return '0.00';

                  // Calculate billing period in days
                  let daysInPeriod = 30;
                  if (mem.unit === 'year') daysInPeriod = 365;
                  else if (mem.unit === 'week') daysInPeriod = 7;

                  const dailyRate = mem.amount / daysInPeriod;

                  // Calculate days until next billing from pause start date
                  const nextBilling = dayjs(mem.nextBillingDate);
                  const startDate = pauseStartDate ? dayjs(pauseStartDate) : dayjs();
                  const daysUntilNextBilling = Math.max(0, nextBilling.diff(startDate, 'day'));

                  // Credit is limited to the current billing period
                  const creditDays = Math.min(suspensionDays, daysUntilNextBilling);
                  return (dailyRate * creditDays).toFixed(2);
                })()}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {(() => {
                  const mem = membershipInfo || membership;
                  const nextBilling = dayjs(mem?.nextBillingDate);
                  const startDate = pauseStartDate ? dayjs(pauseStartDate) : dayjs();
                  const daysUntilNextBilling = Math.max(0, nextBilling.diff(startDate, 'day'));

                  if (suspensionDays > daysUntilNextBilling) {
                    return <>Credit is limited to the current billing period ({daysUntilNextBilling} days). Suspension will skip future billing cycles.</>;
                  } else {
                    return <>This credit will be applied to the next invoice.</>;
                  }
                })()}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSuspensionDays(7);
              setNote('');
            }}
            disabled={loading}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePause}
            disabled={loading || loadingRemaining || !suspensionDays || suspensionDays <= 0 || remainingDays === 0}
            className="cursor-pointer"
          >
            {loading ? 'Pausing...' : `Pause for ${suspensionDays} Days`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}