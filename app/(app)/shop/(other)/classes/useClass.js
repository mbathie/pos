export function useClass({product, setProduct}) {

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

  const setTimesCourse = async (_product) => {
    const res = await fetch(`/api/products/${_product._id}/schedules/remaining`);
    const schedule = res.ok ? await res.json() : {}

    setProduct(draft => {
      draft.available = schedule.available;
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

  const setTimesClass = async (_product) => {
    const res = await fetch(`/api/products/${_product._id}/schedules`);
    const schedule = res.ok ? await res.json() : [];

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

            const iso = nextDate.toISOString();
            const match = schedule.classes.find(s => s.datetime === iso);
            const available = match?.available ?? _product.capacity;

            return {
              label: nextDate.toLocaleString('en-AU', {
                weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
              }),
              value: iso,
              available,
              disabled: available >= (_product.capacity ?? 0)
            };
          }).filter(Boolean);
        }) || [];
      });
    });
  };

  return { setQty, onSelectTime, setTimesClass, setTimesCourse }
}