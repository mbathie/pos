'use client'
import { useEffect, useState } from "react";
import { useParams, useRouter } from 'next/navigation'
import Class from './class'

export default function Page({ params }) {
  const { id } = useParams();
  const [ schedule, setSchedule ] = useState(null)
  const [ loading, setLoading ] = useState(true)

  useEffect(() => {
    async function getData() {
      setLoading(true)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/schedules/${id}`);
      const data = await res.json()
      setSchedule(data)
      setLoading(false)
    }
    getData()
  },[id])

  if (loading) {
    return (
      <div className="px-4">
        <div className="text-center py-8 text-muted-foreground">Loading schedule...</div>
      </div>
    )
  }

  return (
    <div className="px-4">
      {schedule && <Class schedule={schedule} setSchedule={setSchedule}/>}
    </div>
  );
}