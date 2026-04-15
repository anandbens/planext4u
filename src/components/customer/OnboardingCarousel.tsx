import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  image_url: string;
  display_order: number;
}

interface OnboardingCarouselProps {
  onComplete: () => void;
}

export function OnboardingCarousel({ onComplete }: OnboardingCarouselProps) {
  const [slides, setSlides] = useState<OnboardingSlide[]>([]);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [touchStart, setTouchStart] = useState(0);

  useEffect(() => {
    supabase
      .from("onboarding_screens")
      .select("id, title, description, image_url, display_order")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        if (data && data.length > 0) setSlides(data);
      });
  }, []);

  const goNext = useCallback(() => {
    if (current >= slides.length - 1) {
      onComplete();
      return;
    }
    setDirection(1);
    setCurrent((c) => c + 1);
  }, [current, slides.length, onComplete]);

  const goPrev = useCallback(() => {
    if (current <= 0) return;
    setDirection(-1);
    setCurrent((c) => c - 1);
  }, [current]);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  // If no slides loaded, auto-complete onboarding
  useEffect(() => {
    if (slides.length === 0) {
      const timer = setTimeout(() => onComplete(), 100);
      return () => clearTimeout(timer);
    }
  }, [slides, onComplete]);

  if (slides.length === 0) return null;

  const slide = slides[current];
  const isLast = current === slides.length - 1;

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex flex-col bg-background"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Skip button */}
      {!isLast && (
        <div className="absolute top-4 right-4 z-10">
          <Button variant="ghost" size="sm" onClick={onComplete} className="text-muted-foreground">
            Skip
          </Button>
        </div>
      )}

      {/* Image area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden px-8 pt-16">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center gap-6 max-w-sm"
          >
            <img
              src={slide.image_url}
              alt={slide.title}
              className="w-64 h-64 md:w-80 md:h-80 object-contain rounded-2xl"
              loading="eager"
            />
            <h2 className="text-2xl font-bold text-foreground">{slide.title}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed px-4">
              {slide.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="pb-10 px-6 flex flex-col items-center gap-6">
        {/* Dots */}
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {/* Button */}
        <Button
          onClick={goNext}
          className="w-full max-w-xs h-12 rounded-xl text-base gap-2"
        >
          {isLast ? "Get Started" : "Next"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
