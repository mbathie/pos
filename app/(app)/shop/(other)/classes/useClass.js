import dayjs from 'dayjs'
import { useGlobals } from '@/lib/globals'

// Helper function to check if a date/time falls within location hours
const isWithinLocationHours = (dateTime, location) => {
  if (!location?.storeHours) return true; // If no store hours, allow all times

  const dayOfWeek = dateTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const storeHour = location.storeHours.find(h => h.d === dayOfWeek);

  if (!storeHour || !storeHour.open || !storeHour.close) {
    return false; // Store is closed on this day
  }

  const classTime = dateTime.getHours() * 60 + dateTime.getMinutes();
  const [openHour, openMin] = storeHour.open.split(':').map(Number);
  const [closeHour, closeMin] = storeHour.close.split(':').map(Number);
  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;

  return classTime >= openTime && classTime <= closeTime;
}

// Helper function to check if a date is a closed day
// Returns the closed day object if found, null otherwise
const getClosedDay = (date, location) => {
  if (!location?.closedDays || location.closedDays.length === 0) return null;

  const checkDate = dayjs(date);
  const dateStr = checkDate.format('YYYY-MM-DD');

  return location.closedDays.find(closedDay => {
    const startDate = closedDay.startDate;
    const endDate = closedDay.endDate;
    const repeats = closedDay.repeats || 'none';

    if (!startDate || !endDate) return false;

    const start = dayjs(startDate);
    const end = dayjs(endDate);

    // Check if date falls within the original occurrence
    if (dateStr >= startDate && dateStr <= endDate) {
      return true;
    }

    // If it doesn't repeat, no need to check further
    if (repeats === 'none') {
      return false;
    }

    // For repeating patterns, check if this date matches a repetition
    const durationDays = end.diff(start, 'days');

    switch (repeats) {
      case 'daily':
        // Check if date is after start and duration matches
        return checkDate.isAfter(start) && checkDate.diff(start, 'days') % 1 === 0;

      case 'weekly':
        // Check if same day of week and at least 1 week after
        if (checkDate.day() !== start.day()) return false;
        const weeksSince = checkDate.diff(start, 'weeks');
        if (weeksSince < 1) return false;
        // Check if within the duration window for this repetition
        const daysSinceLastOccurrence = checkDate.diff(start.add(weeksSince * 7, 'days'), 'days');
        return daysSinceLastOccurrence >= 0 && daysSinceLastOccurrence <= durationDays;

      case 'fortnightly':
        // Check if same day of week and at least 2 weeks after
        if (checkDate.day() !== start.day()) return false;
        const fortnightsSince = checkDate.diff(start, 'weeks') / 2;
        if (fortnightsSince < 1 || fortnightsSince % 1 !== 0) return false;
        const daysFromFortnight = checkDate.diff(start.add(Math.floor(fortnightsSince) * 14, 'days'), 'days');
        return daysFromFortnight >= 0 && daysFromFortnight <= durationDays;

      case 'monthly':
        // Check if same day of month
        if (checkDate.date() !== start.date()) return false;
        const monthsSince = checkDate.diff(start, 'months');
        if (monthsSince < 1) return false;
        // Check if within the duration window
        const monthBase = start.add(monthsSince, 'months');
        const daysFromMonth = checkDate.diff(monthBase, 'days');
        return daysFromMonth >= 0 && daysFromMonth <= durationDays;

      case 'quarterly':
        // Check if same day of month, 3 months apart
        if (checkDate.date() !== start.date()) return false;
        const quartersSince = checkDate.diff(start, 'months') / 3;
        if (quartersSince < 1 || quartersSince % 1 !== 0) return false;
        const quarterBase = start.add(Math.floor(quartersSince) * 3, 'months');
        const daysFromQuarter = checkDate.diff(quarterBase, 'days');
        return daysFromQuarter >= 0 && daysFromQuarter <= durationDays;

      case 'yearly':
        // Check if same day and month
        if (checkDate.month() !== start.month() || checkDate.date() !== start.date()) return false;
        const yearsSince = checkDate.diff(start, 'years');
        if (yearsSince < 1) return false;
        const yearBase = start.add(yearsSince, 'years');
        const daysFromYear = checkDate.diff(yearBase, 'days');
        return daysFromYear >= 0 && daysFromYear <= durationDays;

      default:
        return false;
    }
  });
}

export function useClass({product, setProduct}) {
  const { location: globalLocation } = useGlobals();

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

    // Fetch fresh location data to ensure we have latest store hours and closed days
    let location = globalLocation;
    if (globalLocation?._id) {
      try {
        const locationRes = await fetch(`/api/locations/${globalLocation._id}`);
        if (locationRes.ok) {
          location = await locationRes.json();
        }
      } catch (error) {
        console.error('Error fetching location:', error);
        // Fall back to global location if fetch fails
      }
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

    // Check if this date is a closed day
    const closedDay = getClosedDay(date, location);
    const dateIsClosedDay = Boolean(closedDay);

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

        // Check if this time conflicts with location hours or closed days
        const withinHours = isWithinLocationHours(classDateTime, location);
        const isConflict = dateIsClosedDay || !withinHours;

        times.push({
          datetime: iso,
          time: dayjs(classDateTime).format('h:mm A'),
          label: timeLabel,
          available: available,
          conflict: isConflict,
          conflictReason: dateIsClosedDay ? (closedDay?.name || 'Closed day') : !withinHours ? 'Outside store hours' : null
        });
      }
    });

    return times.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  };

  const setTimesCourse = async (_product) => {
    const res = await fetch(`/api/products/${_product._id}/schedules/remaining`);
    const schedule = res.ok ? await res.json() : {}

    setProduct(draft => {
      if (!draft) return;

      draft.available = schedule.available;
      // For courses, we might want to handle this differently
      // But for now, keeping the available field update
    });
  };

  const setTimesClass = async (_product) => {
    const res = await fetch(`/api/products/${_product._id}/schedules`);
    const scheduleData = res.ok ? await res.json() : [];

    setProduct(draft => {
      if (!draft) return;

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
      if (!draft) return;

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