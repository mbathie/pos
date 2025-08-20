import { useState, useEffect, useRef } from "react"
import ReactCrop from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css';
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader, Plus } from 'lucide-react';

export default function CategoryIconSelect({
  onIconSelected, query, open, setOpen
}) {
  const [icons, setIcons] = useState([])
  const [search, setSearch] = useState("")
  const [selectedImage, setSelectedImage] = useState(null);
  const [crop, setCrop] = useState(null);
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);

  useEffect(() => {
    if (open) {
      setSearch(query);
      getIcons(query);
    }
  }, [open]);

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
      <DialogContent className="sm:max-w-[500px] fixed top-[400px] left-1/2 -translate-x-1/2 h-[600px] overflow-hidden-">
        <div className="flex flex-col h-full">
          <DialogHeader className="mb-2">
            <DialogTitle>Select Category Icon</DialogTitle>
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
                  <div className='flex gap-2 bg-accent p-4 rounded-lg flex-wrap justify-center'>
                    {icons.map((i, idx) => {
                      return (
                        <div key={idx}>
                          <Button
                            className="h-18 w-18"
                            onClick={async () => {
                              setOpen(false);
                              onIconSelected(i.thumbnail_url);
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
              <div className="p-4 text-muted-foreground flex flex-col items-center gap-4">
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
                  <div className="flex flex-col gap-4 w-full items-center">
                    <ReactCrop
                      crop={crop}
                      onChange={(c) => setCrop(c)}
                      onComplete={(c, percentCrop) => setCompletedCrop(percentCrop)}
                      aspect={1}
                      className="max-h-[350px]"
                    >
                      <img
                        ref={imgRef}
                        src={selectedImage}
                        className="max-w-full h-auto"
                        style={{ maxHeight: '350px', width: 'auto', display: 'block' }}
                        onLoad={(e) => {
                          const { width, height } = e.currentTarget;
                          // Calculate the maximum square that fits in the image
                          const minDimension = Math.min(width, height);
                          const maxSquarePercent = (minDimension / Math.max(width, height)) * 100;
                          
                          // Center the square crop
                          let initialCrop;
                          
                          if (width > height) {
                            // Landscape image - center horizontally
                            const xOffset = (100 - maxSquarePercent) / 2;
                            initialCrop = {
                              unit: '%',
                              width: maxSquarePercent,
                              height: 100,
                              x: xOffset,
                              y: 0,
                              aspect: 1,
                            };
                          } else if (height > width) {
                            // Portrait image - center vertically
                            const yOffset = (100 - maxSquarePercent) / 2;
                            initialCrop = {
                              unit: '%',
                              width: 100,
                              height: maxSquarePercent,
                              x: 0,
                              y: yOffset,
                              aspect: 1,
                            };
                          } else {
                            // Square image - use full image
                            initialCrop = {
                              unit: '%',
                              width: 100,
                              height: 100,
                              x: 0,
                              y: 0,
                              aspect: 1,
                            };
                          }
                          
                          setCrop(initialCrop);
                          setCompletedCrop(initialCrop);
                        }}
                        />
                    </ReactCrop>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedImage(null)}
                      >
                        Select New
                      </Button>
                      <Button
                        onClick={() => {
                          if (!imgRef.current || !completedCrop) return;
                          
                          const image = imgRef.current;
                          const canvas = document.createElement('canvas');
                          canvas.width = 200;
                          canvas.height = 200;
                          
                          const ctx = canvas.getContext('2d');
                          
                          // The completed crop is in percentages
                          const scaleX = image.naturalWidth / 100;
                          const scaleY = image.naturalHeight / 100;
                          
                          ctx.drawImage(
                            image,
                            completedCrop.x * scaleX,
                            completedCrop.y * scaleY,
                            completedCrop.width * scaleX,
                            completedCrop.height * scaleY,
                            0,
                            0,
                            200,
                            200
                          );
                          
                          const base64Image = canvas.toDataURL('image/jpeg', 0.9);
                          onIconSelected(base64Image);
                          setOpen(false);
                        }}
                      >
                        Set Icon
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}