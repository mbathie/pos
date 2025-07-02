'use client'
import React, { useState, useRef, useEffect } from 'react';
import colors from 'tailwindcss/colors';

const tailwindColors = [
  'red', 'orange', 'amber', 'yellow', 'lime',
  'green', 'emerald', 'teal', 'cyan', 'sky',
  'blue', 'indigo', 'violet', 'purple', 'fuchsia',
  'pink', 'rose', 'slate', 'gray', 'zinc',
  'neutral', 'stone'
];

const shades = [100,200,300,400,500,600,700,800,900];

export default function Colours({ initColor, onChange }) {
  const [selected, setSelected] = useState(initColor || "emerald-400");
  const selectedRef = useRef(null);

  useEffect(() => {
    setSelected(initColor || 'emerald-400');
  }, [initColor]);

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'auto', block: 'center' });
    }
  }, [selected]);

  return (
    <div className="overflow-auto rounded-lg">
      <div className="min-w-max">
        <div className="flex flex-col">
          {tailwindColors.map((color) => (
            <div key={color} className="flex">
              {shades.map((shade) => (
                <div
                  key={shade}
                  ref={selected === `${color}-${shade}` ? selectedRef : null}
                  onClick={() => {
                    const colorKey = `${color}-${shade}`;
                    console.log(colorKey);
                    setSelected(colorKey);
                    onChange(colorKey);
                  }}
                  className={`w-8 h-8 cursor-pointer ${selected === `${color}-${shade}` ? 'border border-black' : ''}`}
                  style={{ backgroundColor: colors[color]?.[shade] }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}