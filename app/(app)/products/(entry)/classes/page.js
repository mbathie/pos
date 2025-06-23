'use client'

import Products from './Products'
import { useEffect } from 'react';
import { useImmer } from 'use-immer';
import { generateObjectId } from '@/lib/utils';

const _products = [
  // once off class
  {
    _id: generateObjectId(),
    name: 'Fun Class',
    categoryId: 0,
    type: "class", // type = class | course
    duration: { name: 1, unit: 'hour' }, 
    capacity: 30,
    prices: [
      { name: 'adult', value: 25.00, _id: generateObjectId(),
      }
    ],
    times: [
      {
        _id: generateObjectId(),
        start: '2018-04-05T13:20', repeatInterval: undefined, repeatCnt: 0,
        end: '1/1/25 09:00',
        except: [ 'Saturday', 'Sunday' ]
      }
    ]
  },
  // a drop in class that runs daily indefinitely
  {
    _id: generateObjectId(),
    name: 'Yoga Class',
    categoryId: 0,
    type: "class", // type = class | course
    duration: { name: 1, unit: 'hour' },
    capacity: 25,
    prices: [
      { _id: generateObjectId(), name: 'adult', value: 25.00 }
    ],
    times: [
      {
        _id: generateObjectId(),
        start: '2018-04-04T16:00:00.000Z', repeat: 'd', repeatCnt: undefined,
        except: 'sun',
        end: undefined // repeats daily indefinitely (closed sunday)
      }
    ]
  },
    // a drop in class that for a limited time at select times
    {
      _id: generateObjectId(),

      name: 'Special Classes',
      categoryId: 0,
      type: "class", // type = class | course
      duration: { name: 1, unit: 'hour' },
      capacity: 25,
      prices: [
        { _id: generateObjectId(), name: 'adult', value: 25.00 }
      ],
      times: [
        { _id: generateObjectId(), start: '2018-04-04T16:00:00.000Z' },
      ]
    },
  // a weights course, sign up for the whole course $250 - runs 10 weeks
  // {
  //   _id: 4,
  //   name: 'Weights Course',
  //   categoryId: 0,
  //   type: "course",
  //   duration: { name: 1, unit: 'hour' },
  //   capacity: 20,
  //   prices: [
  //     { name: 'adult', value: 250.00, _id: 1 } // price for the whole course
  //   ],
  //   times: [
  //     {
  //       start: '2018-04-04T16:00:00.000Z', repeatInterval: 'w', repeatCnt: 10,
  //       repeatEnd: false
  //     } // 10 week course 10:30am repeats 10 times on a w = weekly basis
  //   ]
  // }
]

export default function Page() {
  const [products, setProducts] = useImmer([]);
  const categoryName = "class";


  const getProducts = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${categoryName}/products`);
    if (res.ok) {
      const data = await res.json();
      setProducts(data.products);
    }
  };

  useEffect(() => {
    getProducts();
  }, [])

  const units = ['hour', 'day']

  return (
    <div className='px-4 pb-4'>
      <Products
        products={products}
        setProducts={setProducts}
        // units={units}
        // title="Casual entry products"
        categoryName={categoryName}
      />
    </div>
  );
}