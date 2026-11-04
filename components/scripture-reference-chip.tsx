"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent
} from "react";
import { createPortal } from "react-dom";
import type { ReferencePreview } from "@/lib/reference-previews";

type PreviewPosition = {
  left: number;
  top: number;
  placement: "above" | "below";
};

export function ScriptureReferenceChip({
  className,
  reference,
  preview
}: {
  className: "reference-chip" | "word-reference-chip";
  reference: string;
  preview: ReferencePreview;
}) {
  const href = getLocalTitusReferenceHref(reference);
  const tooltipId = `reference-preview-${useId().replace(/:/g, "")}`;
  const triggerRef = useRef<HTMLAnchorElement | HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchArmedRef = useRef(false);
  const suppressNextClickRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<PreviewPosition | null>(null);

  const cancelScheduledClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openPreview = useCallback(() => {
    cancelScheduledClose();
    setIsOpen(true);
  }, [cancelScheduledClose]);

  const closePreview = useCallback((resetTouch = true) => {
    cancelScheduledClose();
    if (resetTouch) touchArmedRef.current = false;
    setIsOpen(false);
    setPosition(null);
  }, [cancelScheduledClose]);

  const scheduleClose = useCallback(() => {
    cancelScheduledClose();
    closeTimerRef.current = setTimeout(() => closePreview(), 140);
  }, [cancelScheduledClose, closePreview]);

  useEffect(() => () => cancelScheduledClose(), [cancelScheduledClose]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    let animationFrame = 0;

    function updatePosition() {
      const trigger = triggerRef.current;
      const tooltip = tooltipRef.current;
      if (!trigger || !tooltip) return;

      const triggerRect = trigger.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const margin = 12;
      const gap = 10;
      const spaceAbove = triggerRect.top - margin - gap;
      const spaceBelow = viewportHeight - triggerRect.bottom - margin - gap;
      const placement = spaceAbove >= Math.min(tooltipRect.height, 220) || spaceAbove >= spaceBelow
        ? "above"
        : "below";
      const left = Math.min(
        Math.max(margin, triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2),
        Math.max(margin, viewportWidth - tooltipRect.width - margin)
      );
      const idealTop = placement === "above"
        ? triggerRect.top - tooltipRect.height - gap
        : triggerRect.bottom + gap;
      const top = Math.min(
        Math.max(margin, idealTop),
        Math.max(margin, viewportHeight - tooltipRect.height - margin)
      );

      setPosition({ left, top, placement });
    }

    function schedulePositionUpdate() {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updatePosition);
    }

    schedulePositionUpdate();
    window.addEventListener("resize", schedulePositionUpdate);
    document.addEventListener("scroll", schedulePositionUpdate, true);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", schedulePositionUpdate);
      document.removeEventListener("scroll", schedulePositionUpdate, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleOutsidePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || tooltipRef.current?.contains(target)) return;
      closePreview();
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [closePreview, isOpen]);

  function handlePointerEnter(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" || event.pointerType === "pen") openPreview();
  }

  function handlePointerLeave(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" || event.pointerType === "pen") scheduleClose();
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse") return;

    cancelScheduledClose();
    if (href) {
      if (!touchArmedRef.current) {
        touchArmedRef.current = true;
        suppressNextClickRef.current = true;
        setIsOpen(true);
      }
      return;
    }

    if (touchArmedRef.current && isOpen) {
      touchArmedRef.current = false;
      closePreview(false);
    } else {
      touchArmedRef.current = true;
      setIsOpen(true);
    }
  }

  function handleClick(event: React.MouseEvent<HTMLElement>) {
    if (suppressNextClickRef.current) {
      event.preventDefault();
      suppressNextClickRef.current = false;
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    closePreview();
  }

  const sharedProps = {
    className,
    "aria-describedby": isOpen ? tooltipId : undefined,
    onPointerEnter: handlePointerEnter,
    onPointerLeave: handlePointerLeave,
    onPointerDown: handlePointerDown,
    onFocus: openPreview,
    onBlur: scheduleClose,
    onClick: handleClick,
    onKeyDown: handleKeyDown
  };

  return (
    <span className="scripture-reference-preview">
      {href ? (
        <a {...sharedProps} href={href} ref={(element) => { triggerRef.current = element; }}>
          {reference}
        </a>
      ) : (
        <button {...sharedProps} ref={(element) => { triggerRef.current = element; }} type="button">
          {reference}
        </button>
      )}
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="reference-preview-popup"
              data-placement={position?.placement}
              data-ready={position ? "true" : "false"}
              id={tooltipId}
              onPointerEnter={handlePointerEnter}
              onPointerLeave={handlePointerLeave}
              ref={tooltipRef}
              role="tooltip"
              style={{
                left: position?.left ?? -10000,
                top: position?.top ?? -10000
              }}
            >
              <div className="reference-preview-heading">{preview.reference}</div>
              <div className="reference-preview-verses">
                {preview.verses.map((verse) => (
                  <p key={`${preview.reference}-${verse.number}`}>
                    <span>{verse.number}</span>
                    {verse.text}
                  </p>
                ))}
              </div>
              {preview.continuesThrough ? (
                <p className="reference-preview-continuation">
                  Continues through verse {preview.continuesThrough}.
                </p>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </span>
  );
}

function getLocalTitusReferenceHref(reference: string) {
  const match = reference.trim().match(/^(Titus)\s+(\d+):(\d+)(?:-\d+)?$/i);
  if (!match) return null;

  const bookSlug = match[1].toLowerCase().replace(/\s+/g, "-");
  return `/${bookSlug}/${match[2]}/#v${match[3]}`;
}
