export function useClass({setProduct}) {

  const setQty = async ({ type, vIdx, priceIdx }) => {
    setProduct(draft => {
      const variation = draft.variations?.[vIdx];
      const price = variation?.prices?.[priceIdx];
      if (!price) return;

      if (type === '+') {
        price.qty = (price.qty ?? 0) + 1;
      } else if (type === '-') {
        price.qty = Math.max(0, (price.qty ?? 0) - 1);
      }
    });
  }

  const onSelectTime = ({ vIdx, tcValues }) => {
    setProduct(draft => {
      const variation = draft.variations?.[vIdx];
      if (!variation) return;

      // Clear all current selections
      variation.timesCalc?.forEach(t => t.selected = false);

      // Set selected = true for all matching tcValues
      tcValues.forEach(tcValue => {
        const time = variation.timesCalc?.find(t => t.value === tcValue);
        if (time) time.selected = true;
      });
    });
  };

  const setTimesCourse = () => {
    setProduct(draft => {
      const now = new Date();

      draft.variations?.forEach(variation => {
        const time = variation.times?.[0];
        if (!time) return;

        const start = new Date(time.start);
        const repeat = time.repeatAlways ? 100 : (time.repeatCnt || 1);
        const interval = time.repeatInterval || 0;

        variation.timesCalc = [...Array(repeat)].map((_, i) => {
          const nextDate = new Date(start);
          nextDate.setDate(start.getDate() + i * interval);

          return {
            label: nextDate.toLocaleString('en-AU', {
              weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
            }),
            value: nextDate.toISOString(),
            selected: true
          };
        }).filter(Boolean);
      });
    });
  };

  const setTimesClass = () => {
    setProduct(draft => {
      const now = new Date();
      const twoMonthsLater = new Date();
      twoMonthsLater.setMonth(twoMonthsLater.getMonth() + 2);

      draft.variations?.forEach(variation => {
        variation.timesCalc = variation.times?.flatMap((time) => {
          const start = new Date(time.start);
          const repeat = time.repeatAlways ? 100 : (time.repeatCnt || 1);
          const interval = time.repeatInterval || 0;

          return [...Array(repeat)].map((_, i) => {
            const nextDate = new Date(start);
            nextDate.setDate(start.getDate() + i * interval);
            if (nextDate < now || nextDate > twoMonthsLater) return null;

            return {
              label: nextDate.toLocaleString('en-AU', {
                weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
              }),
              value: nextDate.toISOString()
            };
          }).filter(Boolean);
        }) || [];
      });
    });
  }

  return { setQty, onSelectTime, setTimesClass, setTimesCourse }
}