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
import { SvgIcon } from '@/components/ui/svg-icon';
import { cn } from '@/lib/utils';

/**
 * Unified Icon Select Component
 * 
 * @param {Function} onIconSelected - Callback when icon is selected (receives icon URL)
 * @param {Function} updateProduct - Legacy callback for product updates (optional)
 * @param {number} pIdx - Product index for updateProduct callback (optional)
 * @param {string} query - Initial search query
 * @param {boolean} open - Dialog open state
 * @param {Function} setOpen - Dialog open state setter
 * @param {string} title - Dialog title (optional, defaults to "Select Icon")
 * @param {number} aspectRatio - Aspect ratio for image cropping (optional, defaults to 1 for square)
 * @param {boolean} showIconLibrary - Show icon library tab (optional, defaults to true)
 * @param {boolean} showImageUpload - Show image upload tab (optional, defaults to true)
 */
export default function IconSelect({
  onIconSelected,
  updateProduct, // Legacy support for product icon selection
  pIdx, // Legacy support for product icon selection
  query = "",
  open,
  setOpen,
  title = "Select Icon",
  aspectRatio = 1, // Default to square
  showIconLibrary = true,
  showImageUpload = true
}) {
  const [icons, setIcons] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedImage, setSelectedImage] = useState(null);
  const [crop, setCrop] = useState(null);
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);

  useEffect(() => {
    if (open) {
      setSearch(query);
      if (query) {
        getIcons(query);
      }
    }
  }, [open, query]);

  const getIcons = async (searchQuery) => {
    if (!searchQuery) return;
    
    setLoading(true);
    setIcons(null); // Set to null to show loading state
    
    try {
      const res = await fetch(`/api/icons?q=${encodeURIComponent(searchQuery)}&limit=12`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json();
      setIcons(data.icons || [])
    } catch (error) {
      console.error('Error fetching icons:', error);
      setIcons([]);
    } finally {
      setLoading(false);
    }
  }

  const handleIconSelect = (iconUrl) => {
    setOpen(false);
    
    // Support both callback patterns
    if (onIconSelected) {
      onIconSelected(iconUrl);
    } else if (updateProduct && pIdx !== undefined) {
      // Legacy support for product updates
      updateProduct({ pIdx, key: 'thumbnail', value: iconUrl });
    }
  };

  const getCroppedImg = async () => {
    if (!imgRef.current || !completedCrop) return null;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    
    // Set canvas dimensions based on aspect ratio
    if (aspectRatio >= 1) {
      // Wider than tall (e.g., 3:1) or square
      canvas.width = 300 * aspectRatio;
      canvas.height = 300;
    } else {
      // Taller than wide
      canvas.width = 300;
      canvas.height = 300 / aspectRatio;
    }
    
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
      canvas.width,
      canvas.height
    );

    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleSaveCroppedImage = async () => {
    const croppedImageUrl = await getCroppedImg();
    if (croppedImageUrl) {
      handleIconSelect(croppedImageUrl);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden">
        <div className="flex flex-col h-full">
          <DialogHeader className="mb-2">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {showIconLibrary && showImageUpload 
                ? "Choose from our icon library or upload your own image"
                : showIconLibrary 
                ? "Choose from our icon library"
                : "Upload your own image"}
            </DialogDescription>
          </DialogHeader>

          {/* Show tabs only if both options are available */}
          {showIconLibrary && showImageUpload ? (
            <Tabs defaultValue="icon" className="flex flex-col h-full w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="icon">Icon Library</TabsTrigger>
                <TabsTrigger value="image">Upload Image</TabsTrigger>
              </TabsList>

            <TabsContent value="icon" className="mt-4 max-h-[50vh] overflow-auto">
              <div className="flex flex-col gap-4">
                <div className='flex gap-2'>
                  <Input 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        getIcons(search);
                      }
                    }}
                    placeholder="Search for icons..."
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => getIcons(search)}
                    className="px-6"
                    disabled={!search}
                  >
                    Search
                  </Button>
                </div>

                {/* Loading state */}
                {icons === null && search && (
                  <div className="flex items-center justify-center p-10">
                    <Loader className="animate-spin h-8 w-8 text-muted-foreground" />
                  </div>
                )}

                {/* No results */}
                {icons?.length === 0 && search && (
                  <div className="text-center p-10 text-muted-foreground">
                    <p>No icons found for "{search}"</p>
                    <p className="text-sm mt-2">Try different keywords</p>
                  </div>
                )}

                {/* Initial state */}
                {!search && icons?.length === 0 && (
                  <div className="text-center p-10 text-muted-foreground">
                    <p>Enter a search term to find icons</p>
                    <p className="text-sm mt-2">Try "coffee", "food", "drink", etc.</p>
                  </div>
                )}

                {/* Results */}
                {icons?.length > 0 && (
                  <div className='grid grid-cols-4 sm:grid-cols-5 gap-3 p-2'>
                    {icons.map((i) => (
                      <button
                        key={i.name}
                        onClick={() => handleIconSelect(i.thumbnail_url)}
                        className="cursor-pointer border-2 border-border hover:border-primary aspect-square rounded-lg flex items-center justify-center bg-background hover:bg-accent transition-colors"
                      >
                        <SvgIcon 
                          src={i.thumbnail_url} 
                          className="size-8 text-foreground" 
                          alt={i.name || 'icon'} 
                        />
                      </button>
                    ))}
                  </div>
                )}
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
                      aspect={aspectRatio}
                      className="max-h-[350px]"
                    >
                      <img
                        ref={imgRef}
                        src={selectedImage}
                        className="max-w-full h-auto"
                        style={{ maxHeight: '350px', width: 'auto', display: 'block' }}
                        alt="Crop preview"
                        onLoad={(e) => {
                          const { width, height } = e.currentTarget;
                          
                          // Calculate initial crop based on aspect ratio
                          let initialCrop;
                          
                          if (aspectRatio === 1) {
                            // Square crop
                            const minDimension = Math.min(width, height);
                            const maxSquarePercent = (minDimension / Math.max(width, height)) * 100;
                            
                            if (width > height) {
                              const xOffset = (100 - maxSquarePercent) / 2;
                              initialCrop = {
                                unit: '%',
                                width: maxSquarePercent,
                                height: 100,
                                x: xOffset,
                                y: 0,
                                aspect: aspectRatio,
                              };
                            } else if (height > width) {
                              const yOffset = (100 - maxSquarePercent) / 2;
                              initialCrop = {
                                unit: '%',
                                width: 100,
                                height: maxSquarePercent,
                                x: 0,
                                y: yOffset,
                                aspect: aspectRatio,
                              };
                            } else {
                              initialCrop = {
                                unit: '%',
                                width: 100,
                                height: 100,
                                x: 0,
                                y: 0,
                                aspect: aspectRatio,
                              };
                            }
                          } else {
                            // Non-square crop (e.g., 3:1 for logo)
                            const imageAspect = width / height;
                            
                            if (imageAspect > aspectRatio) {
                              // Image is wider than crop aspect
                              const cropWidth = (aspectRatio * height / width) * 100;
                              initialCrop = {
                                unit: '%',
                                width: cropWidth,
                                height: 100,
                                x: (100 - cropWidth) / 2,
                                y: 0,
                                aspect: aspectRatio,
                              };
                            } else {
                              // Image is taller than crop aspect
                              const cropHeight = (width / aspectRatio / height) * 100;
                              initialCrop = {
                                unit: '%',
                                width: 100,
                                height: cropHeight,
                                x: 0,
                                y: (100 - cropHeight) / 2,
                                aspect: aspectRatio,
                              };
                            }
                          }
                          
                          setCrop(initialCrop);
                          setCompletedCrop(initialCrop);
                        }}
                      />
                    </ReactCrop>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedImage(null);
                          setCrop(null);
                          setCompletedCrop(null);
                        }}
                      >
                        Change Image
                      </Button>
                      <Button onClick={handleSaveCroppedImage}>
                        Use This Image
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          ) : showIconLibrary ? (
            // Only icon library
            <div className="mt-4 max-h-[50vh] overflow-auto">
              <div className="flex flex-col gap-4">
                <div className='flex gap-2'>
                  <Input 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        getIcons(search);
                      }
                    }}
                    placeholder="Search for icons..."
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => getIcons(search)}
                    className="px-6"
                    disabled={!search}
                  >
                    Search
                  </Button>
                </div>

                {/* Loading state */}
                {icons === null && search && (
                  <div className="flex items-center justify-center p-10">
                    <Loader className="animate-spin h-8 w-8 text-muted-foreground" />
                  </div>
                )}

                {/* No results */}
                {icons?.length === 0 && search && (
                  <div className="text-center p-10 text-muted-foreground">
                    <p>No icons found for "{search}"</p>
                    <p className="text-sm mt-2">Try different keywords</p>
                  </div>
                )}

                {/* Initial state */}
                {!search && icons?.length === 0 && (
                  <div className="text-center p-10 text-muted-foreground">
                    <p>Enter a search term to find icons</p>
                    <p className="text-sm mt-2">Try "coffee", "food", "drink", etc.</p>
                  </div>
                )}

                {/* Results */}
                {icons?.length > 0 && (
                  <div className='grid grid-cols-4 sm:grid-cols-5 gap-3 p-2'>
                    {icons.map((i) => (
                      <button
                        key={i.name}
                        onClick={() => handleIconSelect(i.thumbnail_url)}
                        className="cursor-pointer border-2 border-border hover:border-primary aspect-square rounded-lg flex items-center justify-center bg-background hover:bg-accent transition-colors"
                      >
                        <SvgIcon 
                          src={i.thumbnail_url} 
                          className="size-8 text-foreground" 
                          alt={i.name || 'icon'} 
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : showImageUpload ? (
            // Only image upload
            <div className="h-full overflow-auto">
              <div className="p-4 text-muted-foreground flex flex-col items-center gap-4">
                {!selectedImage && (
                  <label
                    htmlFor="image-upload-only"
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
                      id="image-upload-only"
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
                      aspect={aspectRatio}
                      className="max-h-[350px]"
                    >
                      <img
                        ref={imgRef}
                        src={selectedImage}
                        className="max-w-full h-auto"
                        style={{ maxHeight: '350px', width: 'auto', display: 'block' }}
                        alt="Crop preview"
                        onLoad={(e) => {
                          const { width, height } = e.currentTarget;
                          
                          // Calculate initial crop based on aspect ratio
                          let initialCrop;
                          
                          if (aspectRatio === 1) {
                            // Square crop
                            const minDimension = Math.min(width, height);
                            const maxSquarePercent = (minDimension / Math.max(width, height)) * 100;
                            
                            if (width > height) {
                              const xOffset = (100 - maxSquarePercent) / 2;
                              initialCrop = {
                                unit: '%',
                                width: maxSquarePercent,
                                height: 100,
                                x: xOffset,
                                y: 0,
                                aspect: aspectRatio,
                              };
                            } else if (height > width) {
                              const yOffset = (100 - maxSquarePercent) / 2;
                              initialCrop = {
                                unit: '%',
                                width: 100,
                                height: maxSquarePercent,
                                x: 0,
                                y: yOffset,
                                aspect: aspectRatio,
                              };
                            } else {
                              initialCrop = {
                                unit: '%',
                                width: 100,
                                height: 100,
                                x: 0,
                                y: 0,
                                aspect: aspectRatio,
                              };
                            }
                          } else {
                            // Non-square crop (e.g., 3:1 for logo)
                            const imageAspect = width / height;
                            
                            if (imageAspect > aspectRatio) {
                              // Image is wider than crop aspect
                              const cropWidth = (aspectRatio * height / width) * 100;
                              initialCrop = {
                                unit: '%',
                                width: cropWidth,
                                height: 100,
                                x: (100 - cropWidth) / 2,
                                y: 0,
                                aspect: aspectRatio,
                              };
                            } else {
                              // Image is taller than crop aspect
                              const cropHeight = (width / aspectRatio / height) * 100;
                              initialCrop = {
                                unit: '%',
                                width: 100,
                                height: cropHeight,
                                x: 0,
                                y: (100 - cropHeight) / 2,
                                aspect: aspectRatio,
                              };
                            }
                          }
                          
                          setCrop(initialCrop);
                          setCompletedCrop(initialCrop);
                        }}
                      />
                    </ReactCrop>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedImage(null);
                          setCrop(null);
                          setCompletedCrop(null);
                        }}
                      >
                        Change Image
                      </Button>
                      <Button onClick={handleSaveCroppedImage}>
                        Use This Image
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}