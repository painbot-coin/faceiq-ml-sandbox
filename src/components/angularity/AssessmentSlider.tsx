'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReliableSlider } from './hooks/useReliableSlider';
import { Stamp } from './config/assessments';

interface AssessmentSliderProps {
  frame: number;
  onChange: (frame: number) => void;
  stamps: Stamp[];
  score: number;
  minScore?: number;
  maxScore?: number;
  disabled?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export const AssessmentSlider = ({
  frame,
  onChange,
  stamps,
  score,
  minScore = 0,
  maxScore = 10,
  disabled = false,
  onDragStart,
  onDragEnd,
}: AssessmentSliderProps) => {
  const {
    trackRef,
    thumbRef,
    isDragging,
    thumbPercent,
    handlers,
  } = useReliableSlider({
    min: 0,
    max: 39,
    value: frame,
    onChange,
    onDragStart,
    onDragEnd,
  });

  const segments = useMemo(() => {
    const segmentCount = stamps.length - 1;
    return stamps.slice(0, -1).map((stamp, i) => {
      const startFrame = stamp.frame;
      const endFrame = stamps[i + 1].frame;
      const startPercent = (startFrame / 39) * 100;
      const endPercent = (endFrame / 39) * 100;
      const width = endPercent - startPercent;
      const isActive = frame >= startFrame && frame < endFrame;
      const isPast = frame >= endFrame;
      const isLast = i === segmentCount - 1;
      const isActiveInLast = isLast && frame >= startFrame;

      return {
        startPercent,
        width,
        isActive: isActive || isActiveInLast,
        isPast,
        score: stamp.score,
      };
    });
  }, [stamps, frame]);

  const activeSegmentIndex = segments.findIndex(s => s.isActive);

  return (
    <div className="relative w-full min-[1000px]:w-96 lg:w-[480px]">
      <div
        ref={trackRef as React.RefObject<HTMLDivElement>}
        className={`relative h-10 flex items-center ${
          disabled ? 'opacity-50 pointer-events-none' : ''
        }`}
        style={{
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        {...handlers}
        tabIndex={0}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={39}
        aria-valuenow={frame}
        aria-label="Assessment slider"
      >
        {/* Rail - ultra thin */}
        <div
          className="absolute inset-x-0 h-[2px]"
          style={{
            background: 'rgba(114, 131, 140, 0.2)',
          }}
        />

        {/* Segments - structural zones */}
        {segments.map((segment, i) => (
          <motion.div
            key={i}
            className="absolute h-[2px]"
            style={{
              left: `${segment.startPercent}%`,
              width: `${segment.width}%`,
            }}
            animate={{
              backgroundColor: segment.isActive
                ? 'rgba(90, 105, 115, 0.9)'
                : segment.isPast
                  ? 'rgba(114, 131, 140, 0.7)'
                  : 'rgba(114, 131, 140, 0.15)',
            }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          />
        ))}

        {/* Micro-etchings - segment dividers */}
        {stamps.map((stamp, i) => {
          const position = (stamp.frame / 39) * 100;
          const isAtThumb = Math.abs(thumbPercent - position) < 5;
          const isFirst = i === 0;
          const isLast = i === stamps.length - 1;

          return (
            <motion.div
              key={stamp.score}
              className="absolute"
              style={{
                left: `${position}%`,
                transform: 'translateX(-50%)',
              }}
              animate={{
                height: isAtThumb ? 14 : (isFirst || isLast ? 12 : 10),
                width: 2,
                backgroundColor: isAtThumb
                  ? 'rgba(90, 105, 115, 0.9)'
                  : 'rgba(114, 131, 140, 0.4)',
              }}
              transition={{ duration: 0.15 }}
            />
          );
        })}

        {/* Active segment glow */}
        <AnimatePresence>
          {isDragging && activeSegmentIndex >= 0 && (
            <motion.div
              className="absolute h-[6px] pointer-events-none"
              style={{
                left: `${segments[activeSegmentIndex].startPercent}%`,
                width: `${segments[activeSegmentIndex].width}%`,
                filter: 'blur(4px)',
              }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: 0.5,
                backgroundColor: 'rgba(114, 131, 140, 0.6)',
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </AnimatePresence>

        {/* Knob with score indicator */}
        <div
          ref={thumbRef as React.RefObject<HTMLDivElement>}
          className="absolute top-1/2"
          style={{
            left: `${thumbPercent}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="relative flex flex-col items-center">
            {/* Score indicator - follows knob */}
            <AnimatePresence>
              {isDragging && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.9 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  className="absolute -top-16 flex flex-col items-center"
                >
                  <div
                    className="px-4 py-2 flex items-baseline gap-0.5 rounded-2xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid rgba(114, 131, 140, 0.15)',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                    }}
                  >
                    <motion.span
                      key={score.toFixed(1)}
                      className="text-2xl font-medium tabular-nums tracking-tight"
                      style={{ color: '#4a5a65' }}
                      initial={{ opacity: 0.5 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.08 }}
                    >
                      {score.toFixed(1)}
                    </motion.span>
                    <span
                      className="text-sm font-normal tabular-nums"
                      style={{ color: 'rgba(114, 131, 140, 0.5)' }}
                    >
                      /{maxScore}
                    </span>
                  </div>
                  {/* Connector */}
                  <div
                    className="w-[1px] h-2"
                    style={{ background: 'rgba(255, 255, 255, 0.4)' }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Knob with expanded hit area */}
            <div className="relative cursor-pointer flex items-center justify-center"
              style={{
                width: isDragging ? 24 : 14,
                height: isDragging ? 36 : 14,
              }}
            >
              <motion.div
                initial={false}
                animate={{
                  width: isDragging ? 3 : 14,
                  height: isDragging ? 28 : 14,
                  backgroundColor: isDragging
                    ? 'rgba(70, 85, 95, 0.95)'
                    : 'rgba(114, 131, 140, 0.8)',
                  borderRadius: isDragging ? 1.5 : 7,
                }}
                transition={{
                  duration: 0.25,
                  ease: [0.23, 1, 0.32, 1],
                }}
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
