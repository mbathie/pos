'use client';
import { Card, CardContent } from '@/components/ui/card'
import { generateObjectId } from '@/lib/utils';

import { Plus } from 'lucide-react'

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

import DateTimePicker from './_notused_DateTimePicker';
// import Time from './Time';
// import { MultiSelect } from "./MultiSelect";

import { getLastClassDate } from '@/lib/classes'

export default function Times({ product, setProducts }) {

  const updateProductTime = (timeIndex, changes) => {
    setProducts(draft => {
      const prod = draft.find(p => p._id === product._id);
      if (!prod) return;
  
      if (timeIndex === -1) {
        const now = new Date();
        const rounded = new Date(Math.round(now.getTime() / (1000 * 60 * 5)) * (1000 * 60 * 5));
        prod.times.push({
          _id: generateObjectId(),
          start: rounded.toISOString(),
          repeatInterval: undefined,
          repeatCnt: 0,
          repeatEnd: false,
          ...changes
        });
      } else if (prod.times[timeIndex]) {
        prod.times[timeIndex] = {
          ...prod.times[timeIndex],
          ...changes,
        };
      }
    });
  };

  const hourlyOptions = Array.from({ length: 24 }, (_, i) => {
    const label = String(i).padStart(2, '0');
    return { value: label, label };
  });

  const dailyOptions = [
    { value: "1", label: "Monday" }, { value: "2", label: "Tuesday" }, { value: "3", label: "Wednesday" },
    { value: "4", label: "Thursday" }, { value: "5", label: "Friday" }, { value: "6", label: "Saturday" },
    { value: "0", label: "Sunday" },
  ]

  // Removed unused getOptions helper

  return (
    <div>
      <div className='flex mb-1'>
        <Label className="w-38">Times</Label>
      </div>
      <div className='flex flex-col gap-4 justify-center text-sm'>
        {product.times.map((t, i) => {
          return (
            <Card key={t._id}>
              <CardContent>
                <div className='flex flex-col gap-2'>


                  <div className="flex gap-2">
                    <div>
                      <div className='text-sm text-muted-foreground'>starts</div>
                      <div className='flex flex-row items-center space-x-2'>
                        <DateTimePicker value={t.start} onChange={(newDate) => updateProductTime(i, { start: newDate })} />
                      </div>
                    </div>

                    <div>
                      <div className='text-sm text-muted-foreground'>repeats every</div>
                      <div className='flex flex-row items-center space-x-2 relative'>
                        <Input
                          type="number"
                          className="w-28"
                          value={t.repeatInterval || 0}
                          placeholder="7"
                          onChange={(e) => updateProductTime(i, { repeatInterval: Number(e.target.value) })}
                        />
                        <div className="absolute right-10 text-muted-foreground">
                          days
                        </div>
                      </div>
                    </div>

                    <div className="-ml-2">
                      <div className='text-sm text-muted-foreground'>times</div>
                      <div className='flex flex-row items-center space-x-2 relative'>
                        <Input
                          type="number"
                          className="w-28"
                          placeholder="10"
                          value={t.repeatCnt || 0}
                          onChange={(e) => updateProductTime(i, { repeatCnt: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>
                  

                  <div>
                    <div className='text-muted-foreground'>last class {getLastClassDate(t)}</div>
                    
                  </div>


                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Button variant="outline" className="mt-4" onClick={() => updateProductTime(-1, {})}>
        <Plus /> New Time
      </Button>

    </div>
  );
}
