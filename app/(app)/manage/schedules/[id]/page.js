'use client'
import { useEffect, useState } from "react";
import { useParams, useRouter } from 'next/navigation'
import Class from './class'

export default function Page({ params }) {
  const { id } = useParams();
  const [ schedule, setSchedule ] = useState({})

  useEffect(() => {
    async function getData() {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/schedules/${id}`);
      const data = await res.json()
      setSchedule(data)
    }
    getData()
  },[])

  return (
    <div className="px-4">
      {/* {schedule?.product.type} */}
      {schedule?.product?.type == 'class' &&
        <Class schedule={schedule} setSchedule={setSchedule}/>
      }
      {/* <h1 className="text-lg font-semibold">Schedule ID: {id}</h1> */}


    </div>
  );
}