import { useState, useEffect, useRef } from "react"
import ReactCrop from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css';
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

import { Loader, Plus } from 'lucide-react';


export default function IconSelect({
  updateProduct, pIdx, query, open, setOpen
}) {

  const [icons, setIcons] = useState([])
  const [search, setSearch] = useState("")
  // const [isOpen, setIsOpen] = useState(false)

  const [selectedImage, setSelectedImage] = useState(null);
  const [crop, setCrop] = useState({ unit: '%', width: 50, x: 25, y: 25 });
  const imgRef = useRef(null);

  useEffect(() => {
    if (open) {
      setSearch(query);
      getIcons(query);
    }
  }, [open]);

  const getIcons = async (query) => {
    console.log(query)
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
      <DialogContent className="sm:max-w-[500px] fixed top-[400px] left-1/2 -translate-x-1/2 h-[600px] overflow-hidden-">
        <div className="flex flex-col h-full">
          <DialogHeader className="mb-2">
            <DialogTitle>Select Icon</DialogTitle>
            <DialogDescription>
              Choose from our icon library or upload your own image
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="icon" className="flex flex-col h-full w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="icon">Icon</TabsTrigger>
              <TabsTrigger value="image">Image</TabsTrigger>
            </TabsList>

            <TabsContent value="icon" className="h-full overflow-auto">
              <div className="flex flex-col gap-2">
                <div className='flex space-x-2'>
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} />
                  <Button onClick={() => getIcons(search)}>Search</Button>
                </div>

                {icons?.length == 0 &&
                  <div className="animate-spin flex items-center justify-center p-10 mt-5">
                    <Loader />
                  </div>
                }

                {icons?.length > 0 &&
                  <div className='flex gap-2 bg-white p-4 rounded-lg flex-wrap justify-center'>
                    {icons.map((i, idx) => {
                      return (
                        <div key={idx}>
                          <Button
                            className="h-18 w-18"
                            onClick={async () => {
                              setOpen(false);
                              updateProduct({ pIdx, key: 'thumbnail', value: i.thumbnail_url })
                            }}
                          >
                            <img src={i.thumbnail_url} />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                }
              </div>
            </TabsContent>

            <TabsContent value="image" className="h-full overflow-auto">
              <div className="p-4 text-muted-foreground flex flex-col items-center">
                {!selectedImage && (
                  <label
                    htmlFor="image-upload"
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setSelectedImage(reader.result);
                      reader.readAsDataURL(file);
                    }}
                    className="p-4 aspect-square border border-dashed border-muted-foreground rounded-lg flex items-center justify-center text-sm text-muted-foreground cursor-pointer"
                  >
                    <div className="flex text-center flex-col items-center justify-center gap-2">
                      <Plus className="w-6 h-6" />
                      <span>Select file<br />or drag</span>
                    </div>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => setSelectedImage(reader.result);
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                )}

                {selectedImage && (
                  <>
                    <ReactCrop
                      crop={crop}
                      onChange={(c) => setCrop(c)}
                      aspect={1}
                    >
                      <img
                        ref={imgRef}
                        src={selectedImage}
                        onLoad={(e) => {
                          const { width, height } = e.currentTarget;
                          setCrop({
                            unit: '%',
                            width: 50,
                            aspect: 1,
                            x: 25,
                            y: 25,
                          });
                        }}
                      />
                    </ReactCrop>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedImage(null)}
                      >
                        Select New
                      </Button>
                      <Button
                        onClick={() => {
                          if (!imgRef.current) return;
                          const canvas = document.createElement('canvas');
                          const image = imgRef.current;
                          const scaleX = image.naturalWidth / image.width;
                          const scaleY = image.naturalHeight / image.height;
                          canvas.width = crop.width;
                          canvas.height = crop.height;
                          const ctx = canvas.getContext('2d');
                          ctx.drawImage(
                            image,
                            crop.x * scaleX,
                            crop.y * scaleY,
                            crop.width * scaleX,
                            crop.height * scaleY,
                            0,
                            0,
                            crop.width,
                            crop.height
                          );
                          const base64Image = canvas.toDataURL('image/jpeg');
                          updateProduct({ pIdx, key: 'thumbnail', value: base64Image });
                          setOpen(false);
                        }}
                      >
                        Set Thumbnail
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}