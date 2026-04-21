"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Tickets } from "lucide-react";

import { Button } from "@/components/ui/button";

type TicketSwipeShellProps = {
  previousHref: string | null;
  nextHref: string | null;
  currentIndex: number;
  total: number;
  labels: {
    title: string;
    subtitle: string;
    previous: string;
    next: string;
    counter: string;
  };
  children: React.ReactNode;
};

export function TicketSwipeShell({
  previousHref,
  nextHref,
  currentIndex,
  total,
  labels,
  children,
}: TicketSwipeShellProps) {
  const router = useRouter();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  function goTo(href: string | null) {
    if (!href) {
      return;
    }

    router.push(href, { scroll: false });
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX.current === null || touchStartY.current === null) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;

    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(deltaX) < 60 || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0) {
      goTo(nextHref);
      return;
    }

    goTo(previousHref);
  }

  const counter = labels.counter
    .replace("{current}", String(currentIndex + 1))
    .replace("{total}", String(total));

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="mb-6 rounded-[28px] border border-[#dc2626]/12 bg-white/84 p-4 shadow-[0_22px_60px_-46px_rgba(23,23,23,0.35)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#b91c1c]">
              <Tickets className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.24em]">{labels.title}</p>
            </div>
            <p className="text-sm leading-6 text-neutral-600">{labels.subtitle}</p>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <p className="text-sm font-medium text-[#111111]">{counter}</p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={!previousHref}
                onClick={() => goTo(previousHref)}
                aria-label={labels.previous}
                className="rounded-full border-[#111111] bg-white text-[#111111] hover:bg-neutral-100 disabled:opacity-35"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={!nextHref}
                onClick={() => goTo(nextHref)}
                aria-label={labels.next}
                className="rounded-full border-[#dc2626] bg-[#fff1f2] text-[#b91c1c] hover:bg-[#fee2e2] disabled:opacity-35"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
