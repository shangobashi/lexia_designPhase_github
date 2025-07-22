import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  position?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'right',
  delay = 0.5,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    const id = setTimeout(() => {
      setIsVisible(true);
    }, delay * 1000);
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setIsVisible(false);
  };

  // Position styles
  const getPositionStyles = () => {
    switch (position) {
      case 'top':
        return { bottom: '100%', left: '50%', transform: 'translateX(-50%) translateY(-8px)' };
      case 'right':
        return { left: '100%', top: '50%', transform: 'translateY(-50%) translateX(8px)' };
      case 'bottom':
        return { top: '100%', left: '50%', transform: 'translateX(-50%) translateY(8px)' };
      case 'left':
        return { right: '100%', top: '50%', transform: 'translateY(-50%) translateX(-8px)' };
      default:
        return { left: '100%', top: '50%', transform: 'translateY(-50%) translateX(8px)' };
    }
  };

  // Animation variants
  const variants = {
    hidden: {
      opacity: 0,
      ...getPositionStyles(),
    },
    visible: {
      opacity: 1,
      ...getPositionStyles(),
    },
  };

  // Clone children to add event listeners
  const child = React.cloneElement(React.Children.only(children), {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    className: `${children.props.className || ''} relative`,
  });

  return (
    <>
      {child}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className="fixed z-50 px-2 py-1 text-xs font-medium text-white bg-black rounded pointer-events-none whitespace-nowrap"
            style={getPositionStyles() as React.CSSProperties}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={variants}
            transition={{ duration: 0.15 }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};