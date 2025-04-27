import { useState, useEffect } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

import { Loader } from 'lucide-react';


export default function IconSelect({
  setProducts, productIdx, query, open, setOpen,
  product, updateProduct
}) {

  const [icons, setIcons] = useState([])
  const [search, setSearch] = useState("")
  // const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setSearch(query)
    getIcons(query)
  },[])

  const getIcons = async (query) => {
    const res = await fetch(`/api/icons?q=${encodeURIComponent(query)}&limit=10`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
    const data = await res.json();
    setIcons(data.icons)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* <Button variant="outline">Select Icon {query}</Button> */}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Select Icon</DialogTitle>
          <DialogDescription>
            Select an icon from below, or search for a different one.
          </DialogDescription>
        </DialogHeader>

        <div className='flex space-x-2'>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button onClick={() => getIcons(search)}>Search</Button>
        </div>

        {icons.length == 0 &&
          <div className="animate-spin flex items-center justify-center p-10 mt-5">
            <Loader />
          </div>
        }

        {icons.length > 0 &&
          <div className='flex space-x-2 space-y-2 bg-white p-4 rounded-lg flex-wrap justify-center'>
            {icons.map((i,idx) => {
              return (
                <div key={idx}>
                  <Button 
                    className="h-18 w-18"
                    onClick={async () => {
                      setOpen(false);
                      await setProducts((_p) => {
                        _p[productIdx].data.thumbnail = i.thumbnail_url
                        updateProduct(_p[productIdx], productIdx)
                      })
                    }}
                  >
                    <img src={i.thumbnail_url} />
                  </Button>
                </div>
              )
            })}
          </div>
        }



        {/* <DialogFooter>
          <Button type="submit">Save changes</Button>
        </DialogFooter> */}
      </DialogContent>
    </Dialog>
  )
}