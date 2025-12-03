'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, ChevronDown, FileText } from 'lucide-react';

// Import all features from content folder
import {
  operationalFeatures,
  productFeatures,
  systemFeatures,
  allFeatures,
  featureComponents,
} from './content';

export default function FeaturesPage() {
  const [activeSection, setActiveSection] = useState('membership-pause');
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [isSystemOpen, setIsSystemOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const sections = allFeatures.map(f => document.getElementById(f.id));
      const scrollPosition = window.scrollY + 100;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(allFeatures[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  };

  const NavButton = ({ feature, indented = false }) => {
    const Icon = feature.Icon;
    return (
      <Button
        variant="ghost"
        className={`w-full justify-start text-left h-auto py-2 px-3 cursor-pointer ${indented ? 'pl-9' : ''} ${
          activeSection === feature.id
            ? 'bg-accent text-accent-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        onClick={() => scrollToSection(feature.id)}
      >
        <Icon className="h-4 w-4 mr-2 shrink-0" />
        <span className="flex-1 text-sm">{feature.title}</span>
        {activeSection === feature.id && (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-8xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6" />
            <h1 className="text-xl font-semibold">POS System Features</h1>
          </div>
        </div>
      </div>

      <div className="max-w-8xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar - Table of Contents */}
          <aside className="w-90 shrink-0 sticky top-20 self-start hidden lg:block">
            <Card>
              <CardContent className="p-4">
                <h2 className="font-semibold mb-4 text-sm uppercase text-muted-foreground">
                  Table of Contents
                </h2>
                <ScrollArea className="h-[calc(100vh-12rem)]">
                  <nav className="space-y-1">
                    {/* Operational Features */}
                    {operationalFeatures.map((feature) => (
                      <NavButton key={feature.id} feature={feature} />
                    ))}

                    {/* Product Setup - Collapsible */}
                    <Collapsible open={isProductsOpen} onOpenChange={setIsProductsOpen}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-left h-auto py-2 px-3 cursor-pointer text-muted-foreground hover:text-foreground font-medium"
                        >
                          {isProductsOpen ? (
                            <ChevronDown className="h-4 w-4 mr-2 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 mr-2 shrink-0" />
                          )}
                          <span className="flex-1 text-sm">Product Setup</span>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-1">
                        {productFeatures.map((feature) => (
                          <NavButton key={feature.id} feature={feature} indented />
                        ))}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* System Management - Collapsible */}
                    <Collapsible open={isSystemOpen} onOpenChange={setIsSystemOpen}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-left h-auto py-2 px-3 cursor-pointer text-muted-foreground hover:text-foreground font-medium"
                        >
                          {isSystemOpen ? (
                            <ChevronDown className="h-4 w-4 mr-2 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 mr-2 shrink-0" />
                          )}
                          <span className="flex-1 text-sm">System Management</span>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-1">
                        {systemFeatures.map((feature) => (
                          <NavButton key={feature.id} feature={feature} indented />
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  </nav>
                </ScrollArea>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="flex-1 max-w-4xl">
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              {/* Render all feature components */}
              {allFeatures.map((feature) => {
                const FeatureComponent = featureComponents[feature.id];
                return FeatureComponent ? <FeatureComponent key={feature.id} /> : null;
              })}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
