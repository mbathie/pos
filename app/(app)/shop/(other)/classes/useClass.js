import dayjs from 'dayjs'

export function useClass({product, setProduct}) {

  // Get all dates that have classes in the next 6 months
  const getAvailableDates = (schedule) => {
    if (!schedule?.startDate || !schedule?.daysOfWeek?.length) {
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
      
      // Check if this day has any selected times in the new structure
      const dayConfig = schedule.daysOfWeek.find(d => d.dayIndex === adjustedDayOfWeek);
      if (dayConfig && dayConfig.times?.some(t => t.selected)) {
        dates.push(dayjs(current).format('YYYY-MM-DD'));
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  // Get available times for a specific date
  const getTimesForDate = async (date, schedule) => {
    if (!date || !schedule?.daysOfWeek?.length) {
      return [];
    }

    const times = [];
    const dayOfWeek = date.getDay();
    // Convert Sunday = 0 to our format where Monday = 0
    const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    // Find the day configuration for this day
    const dayConfig = schedule.daysOfWeek.find(d => d.dayIndex === adjustedDayOfWeek);
    
    // Check if this day has any selected times
    if (!dayConfig || !dayConfig.times?.some(t => t.selected)) {
      return [];
    }

    // Fetch actual schedule data to get availability
    const res = await fetch(`/api/products/${product._id}/schedules`);
    const scheduleData = res.ok ? await res.json() : { classes: [] };

    // Get current time for filtering
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    
    // Check if the selected date is today
    const selectedDateStr = dayjs(date).format('YYYY-MM-DD');
    const todayStr = dayjs(now).format('YYYY-MM-DD');
    const isToday = selectedDateStr === todayStr;

    // Add all selected times for this day
    dayConfig.times.forEach(timeItem => {
      if (!timeItem.selected) return; // Skip unselected times
      
      const timeStr = timeItem.time;
      const timeLabel = timeItem.label || '';
      
      if (timeStr) {
        const [hours, minutes] = timeStr.split(':');
        const classDateTime = new Date(date);
        classDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // If it's today, filter out times that are more than 30 minutes in the past
        if (isToday && classDateTime < thirtyMinutesAgo) {
          return; // Skip this time
        }
        
        const iso = classDateTime.toISOString();
        // Find matching scheduled class to get actual availability
        const match = scheduleData.classes?.find(s => {
          const scheduleDate = new Date(s.datetime).toISOString();
          return scheduleDate === iso;
        });
        const available = match?.available ?? product?.capacity ?? 5;
        
        times.push({
          datetime: iso,
          time: dayjs(classDateTime).format('h:mm A'),
          label: timeLabel,
          available: available
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

      const { startDate, endDate, noEndDate, daysOfWeek } = draft.schedule || {};
      
      if (!startDate || !daysOfWeek?.length) {
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
        
        // Find the day configuration for this day
        const dayConfig = daysOfWeek.find(d => d.dayIndex === adjustedDayOfWeek);
        
        if (dayConfig && dayConfig.times?.length) {
          // For each selected time on this day
          dayConfig.times.forEach(timeItem => {
            if (!timeItem.selected) return; // Skip unselected times
            
            const timeStr = timeItem.time;
            const timeLabel = timeItem.label || '';
            
            if (timeStr) {
              const [hours, minutes] = timeStr.split(':');
              const classDateTime = new Date(current);
              classDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
              
              if (classDateTime >= now && classDateTime <= end) {
                const iso = classDateTime.toISOString();
                const match = scheduleData.classes?.find(s => {
                  // Compare datetime strings after converting both to ISO format
                  const scheduleDate = new Date(s.datetime).toISOString();
                  return scheduleDate === iso;
                });
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

  const setQty = ({ type, vIdx, priceIdx }) => {
    setProduct(draft => {
      // For courses, prices are at the root level
      const price = draft.prices?.[priceIdx];
      if (!price) return;

      if (type === '+') {
        price.qty = (price.qty ?? 0) + 1;
      } else if (type === '-') {
        price.qty = Math.max(0, (price.qty ?? 0) - 1);
      }

      // Update total product quantity
      let totalQty = 0;
      draft.prices?.forEach(p => {
        totalQty += p.qty || 0;
      });
      draft.qty = totalQty;
    });
  };

  return { setTimesClass, setTimesCourse, getAvailableDates, getTimesForDate, setQty }
}