

                      <div className='flex flex-col space-y-4 pl-8'>
                        {p?.variations?.map((v, i) => (
                          <div key={`${v.id}-${i}`} className="border rounded-lg p-4 space-y-2">

                            <div className='flex'>
                            {/* <Label className="text-sm">Variation</Label> */}
                            {/* <Label className=" ml-auto -top-7 relative">{v?.variation?.name}</Label> */}
                            </div>

                            
                            <div className='flex space-x-2'>
                              <Input
                                type="text"
                                id={`${v.id}_${i}_variation`}
                                placeholder="Milk, Sugar, Extras"
                                value={v.name || ""}
                                className="w-full text-sm"
                                onChange={(e) => {
                                  setProducts((_p) => {
                                    // _p[pIdx].updated = true
                                    _p[pIdx].variations[i].variation.name = e.target.value
                                    _p[pIdx].variations[i].updated = true
                                  })
                                }}

                              />
                              {v.updated &&
                                <Button onClick={() => updateProduct(p,pIdx)}>Save</Button>
                              }
                            </div>

                            {/* {v.productId &&
                              <Separator className="h-[1px] my-4 bg-muted"/>
                            } */}

                            {/* {v.productId && */}
                            <div className='flex space-x-2 mt-4'>
                              <Label className="text-sm">Variants</Label>
                              <Button 
                                variant="outline" className="text-xs"
                                onClick={() => {

                                  console.log(products[pIdx].variations[i])
                                  setProducts((_p) => {
                                    _p[pIdx].variations[i].variation.variants = _p[pIdx].variations[i].variation.variants || []
                                    _p[pIdx].variations[i].variation.variants.push({ new: true, name: "", amount: "" });
                                  })
                                }}
                              >
                                New Variant
                              </Button>
                            </div>
                            {/* } */}

                            {/* VARIANTS */}
                            {/* {v.productId && */}
                            <div className='flex flex-wrap space-x-2 space-y-2'>
                              {variants?.map((vv,vvidx) => {

                                if (vv.new) {
                                  return (
                                    <div key={vvidx} className='flex w-54 rounded-r-none'>
                                      <Input
                                        className="rounded-r-none border-r-none"
                                        value={vv.name}
                                        placeholder="Oat"
                                        onChange={(e) => {
                                          setProducts((_p) => {
                                            _p[pIdx].variations[i].variation.variants[vvidx].name = e.target.value
                                          })
                                        }}
                                      />
                                      <Input
                                        className="rounded-l-none border-l-none"
                                        value={vv.amount}
                                        placeholder="$0.50"
                                        onChange={(e) => {
                                          setProducts((_p) => {
                                            _p[pIdx].variations[i].variation.variants[vvidx].amount = e.target.value
                                          })
                                        }}
                                      />
                                      <Button
                                        className="ml-2"
                                        onClick={() => {
                                          updateProduct(p,pIdx)
                                        }}
                                      >
                                        Save
                                      </Button>
                                    </div>
                                  )
                                }

                                let matchedVariant = {
                                  ...vv, enabled: false,
                                  variationId: v.variationId,
                                  variantId: vv.id,
                                  variant: {
                                    name: vv.name,
                                    amount: vv.amount
                                  }
                                }
                                let matchedVariantIdx = 0
                                {v?.variation.variants?.map((vvp,vvpIdx) => {
                                  if (vv.id == vvp.variantId) {
                                    matchedVariant = vvp
                                    matchedVariantIdx = vvpIdx
                                  }
                                })}



                                return (
                                  <div key={vvidx}>

                                    <Button 
                                      variant={matchedVariant.enabled ? '' : 'outline'}
                                      onClick={() => {

                                        setProducts((_p) => {
                                          
                                          if (!matchedVariant.variant) {// isn't linked
                                            _p[pIdx].variations[i].variation.variants = [{...matchedVariant, enabled: true}]
                                          }
                                          else // linked, just toggling enabled
                                            _p[pIdx].variations[i].variation.variants[matchedVariantIdx].enabled = !matchedVariant.enabled

                                          updateProduct(_p[pIdx], pIdx)

                                        })

                                      }}
                                    >
                                      {matchedVariant.variant.name} ${matchedVariant.variant.amount ? matchedVariant.variant.amount.toFixed(2) : ""}
                                      {/* {vv.variant.name} ${vv.variant.amount ? vv.variant.amount.toFixed(2) : ""} */}
                                    </Button>
                                  </div>
                                )  


                              })
                              }

                              {/* handle new variant */}
                              
                              {/* {v.variation.variants?.map((vv, vvIdx) => {
                                console.log(vv)
                                if (vv.new)
                                  return (
                                    <div key={vvIdx} className='flex'>
                                      <Input 
                                        value={vv.name} 
                                        onChange={(e) => {
                                          setProducts((_p) => {
                                            _p[pIdx].variations[i].variation.variants[vvIdx].name = e.target.value
                                          })
                                        }}
                                        placeholder="oat" 
                                        className="text-sm w-24 rounded-r-none border-r-0" 
                                      /> 
                                      <Input 
                                        value={vv.amount || ""} 
                                        onChange={(e) => {
                                          setProducts((_p) => {
                                            _p[pIdx].variations[i].variation.variants[vvIdx].amount = e.target.value
                                          })
                                        }}
                                        placeholder="0.75" 
                                        className="text-sm w-24 rounded-l-none" 
                                      /> 
                                      <Button 
                                        className="ml-2"
                                        onClick={() => {
                                          updateProduct(p,pIdx)

                                        }}
                                      >
                                        Save
                                      </Button>
                                    </div>

                                  )
                              })} */}


                            </div>
                            {/* } */}



                          </div>

                        ))}

                      </div>