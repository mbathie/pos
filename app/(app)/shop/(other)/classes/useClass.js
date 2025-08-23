import { format } from 'date-fns'

export function useClass({product, setProduct}) {

  // Get all dates that have classes in the next 6 months
  const getAvailableDates = (schedule) => {
    if (!schedule?.startDate || !schedule?.times?.length || !schedule?.daysOfWeek) {
      return [];
    }

    const dates = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const sixMonthsLater = new Date();
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    
    const start = new Date(schedule.startDate);
    const current = new Date(Math.max(start, now));
    
    while (current <= sixMonthsLater) {
      const dayOfWeek = current.getDay();
      // Convert Sunday = 0 to our format where Monday = 0
      const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      
      if (schedule.daysOfWeek[adjustedDayOfWeek]) {
        dates.push(format(current, 'yyyy-MM-dd'));
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  // Get available times for a specific date
  const getTimesForDate = (date, schedule) => {
    if (!date || !schedule?.times?.length) {
      return [];
    }

    const times = [];
    const dayOfWeek = date.getDay();
    // Convert Sunday = 0 to our format where Monday = 0
    const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    // Check if this day has classes
    if (!schedule.daysOfWeek?.[adjustedDayOfWeek]) {
      return [];
    }

    // Add all times for this day
    schedule.times.forEach(timeItem => {
      const timeStr = typeof timeItem === 'string' ? timeItem : timeItem?.time;
      const timeLabel = typeof timeItem === 'object' ? timeItem?.label : '';
      
      if (timeStr) {
        const [hours, minutes] = timeStr.split(':');
        const classDateTime = new Date(date);
        classDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        times.push({
          datetime: classDateTime.toISOString(),
          time: format(classDateTime, 'h:mm a'),
          label: timeLabel,
          available: product?.capacity || 5 // TODO: Get actual availability from schedule
        });
      }
    });
    
    return times.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  };

  const setTimesCourse = async (_product) => {
    const res = await fetch(`/api/products/${_product._id}/schedules/remaining`);
    const schedule = res.ok ? await res.json() : {}

    setProduct(draft => {
      draft.available = schedule.available;
      // For courses, we might want to handle this differently
      // But for now, keeping the available field update
    });
  };

  const setTimesClass = async (_product) => {
    const res = await fetch(`/api/products/${_product._id}/schedules`);
    const scheduleData = res.ok ? await res.json() : [];

    setProduct(draft => {
      const now = new Date();
      const twoMonthsLater = new Date();
      twoMonthsLater.setMonth(twoMonthsLater.getMonth() + 2);

      const { startDate, endDate, noEndDate, daysOfWeek, times } = draft.schedule || {};
      
      if (!startDate || !times?.length) {
        draft.timesCalc = [];
        return;
      }

      const start = new Date(startDate);
      // Always use 2 months from now as the end date for generating class times
      // This ensures we always show 2 months worth of classes in the dropdown
      const end = twoMonthsLater;
      
      // Generate all possible class dates
      const classDates = [];
      // Start from today or the configured start date, whichever is later
      const current = new Date(Math.max(start, now));
      
      while (current <= end && classDates.length < 500) { // Limit to 500 dates for 2 months of classes
        const dayOfWeek = current.getDay();
        // Convert Sunday = 0 to our format where Monday = 0
        const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        
        if (daysOfWeek?.[adjustedDayOfWeek]) {
          // For each selected day, add all the times
          times.forEach(timeItem => {
            // Handle both string format and object format
            const timeStr = typeof timeItem === 'string' ? timeItem : timeItem?.time;
            const timeLabel = typeof timeItem === 'object' ? timeItem?.label : '';
            
            if (timeStr) {
              const [hours, minutes] = timeStr.split(':');
              const classDateTime = new Date(current);
              classDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
              
              if (classDateTime >= now && classDateTime <= end) {
                const iso = classDateTime.toISOString();
                const match = scheduleData.classes?.find(s => s.datetime === iso);
                const available = match?.available ?? _product.capacity;
                
                // Format the label without the time label (it will be shown separately)
                const dateTimeLabel = classDateTime.toLocaleString('en-AU', {
                  weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
                });
                
                classDates.push({
                  label: dateTimeLabel,
                  value: iso,
                  available,
                  disabled: available <= 0,
                  timeLabel: timeLabel // Store the label to be shown separately
                });
              }
            }
          });
        }
        
        current.setDate(current.getDate() + 1);
      }
      
      draft.timesCalc = classDates.sort((a, b) => new Date(a.value) - new Date(b.value));
    });
  };

  return { setTimesClass, setTimesCourse, getAvailableDates, getTimesForDate }
}