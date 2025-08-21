export function useClass({product, setProduct}) {

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
      const end = endDate && !noEndDate ? new Date(endDate) : twoMonthsLater;
      
      // Generate all possible class dates
      const classDates = [];
      const current = new Date(start);
      
      while (current <= end && classDates.length < 100) { // Limit to 100 dates for performance
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

  return { setTimesClass, setTimesCourse }
}