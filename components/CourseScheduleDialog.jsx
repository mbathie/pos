import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from 'lucide-react';
import dayjs from 'dayjs';

export default function CourseScheduleDialog({ open, onOpenChange, course }) {
  if (!course?.schedule) return null;

  const { schedule } = course;
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Helper function to format time to 12-hour format
  const formatTime12Hour = (timeStr) => {
    if (!timeStr) return 'No time set';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  // Get the days that have classes scheduled
  const getScheduledDays = () => {
    const scheduledDays = [];
    
    if (!schedule.daysOfWeek || !Array.isArray(schedule.daysOfWeek)) {
      return scheduledDays;
    }

    // Process each day configuration
    schedule.daysOfWeek.forEach(dayConfig => {
      // Skip if not an object or if it's the "All" template (dayIndex === -1)
      if (!dayConfig || typeof dayConfig !== 'object' || dayConfig.dayIndex === -1) {
        return;
      }
      
      // Check if this is a valid day index (0-6)
      if (dayConfig.dayIndex >= 0 && dayConfig.dayIndex < 7) {
        // Get times that are selected for this day
        const dayTimes = [];
        
        if (dayConfig.times && Array.isArray(dayConfig.times)) {
          dayConfig.times.forEach(timeSlot => {
            // Only include times that are selected
            if (timeSlot.selected === true) {
              dayTimes.push({
                time: timeSlot.time || '',
                label: timeSlot.label || '',
                selected: true
              });
            }
          });
        }
        
        // Only add this day if it has selected times
        if (dayTimes.length > 0) {
          scheduledDays.push({
            dayName: dayNames[dayConfig.dayIndex],
            dayIndex: dayConfig.dayIndex,
            times: dayTimes
          });
        }
      }
    });
    
    return scheduledDays.sort((a, b) => a.dayIndex - b.dayIndex);
  };

  const scheduledDays = getScheduledDays();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {course.name} - Schedule Details
          </DialogTitle>
          <DialogDescription>
            Complete course schedule information
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Date Range */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Course Duration</h4>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Start:</span>
              <span>{schedule.startDate ? dayjs(schedule.startDate).format('MMMM D, YYYY') : 'Not set'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">End:</span>
              <span>
                {schedule.noEndDate 
                  ? 'Ongoing (No end date)' 
                  : schedule.endDate 
                    ? dayjs(schedule.endDate).format('MMMM D, YYYY')
                    : 'Not set'}
              </span>
            </div>
          </div>

          {/* Capacity Info - moved up */}
          {course.capacity && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Capacity</h4>
              <p className="text-sm text-muted-foreground">
                Maximum {course.capacity} participants per class
              </p>
            </div>
          )}

          {/* Weekly Schedule */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Weekly Schedule
            </h4>
            
            {scheduledDays.length > 0 ? (
              <div className="space-y-3">
                {scheduledDays.map((day) => (
                  <div key={day.dayIndex} className="space-y-2">
                    <h5 className="font-medium text-sm">{day.dayName}</h5>
                    <div className="flex flex-wrap gap-2">
                      {day.times.map((time, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {formatTime12Hour(time.time)}
                          {time.label && ` - ${time.label}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No schedule configured</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}