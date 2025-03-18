import { motion } from 'framer-motion';
import { useWindowSize } from 'usehooks-ts';

interface AnimatedButtonProps {
  type?: 'button' | 'submit';
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

export default function AnimatedButton({
  type = 'button',
  onClick,
  className = '',
  children,
}: AnimatedButtonProps) {
  const { width } = useWindowSize();
  const isMobile = width ? width < 768 : false;

  return (
    <motion.button
      type={type}
      onClick={onClick}
      className={`absolute right-2 top-1 px-4 py-2 bg-[#FF3B00] hover:bg-[#FF2200] text-white font-medium transition-colors rounded ${className} group`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 17,
      }}
    >
      <span className="flex items-center gap-1 font-ppsupply">
        {children}
        {!isMobile && (
          <>
            <span className="text-sm opacity-50 group-hover:opacity-100 transition-opacity">
              ⌘+
            </span>
            <div className="w-3 h-3 rounded-full opacity-50 group-hover:opacity-100 transition-opacity">
              <svg viewBox="0 0 18 19">
                <path
                  d="M2.40088 13.2758H13.6766C15.2909 13.2758 16.5995 11.9672 16.5995 10.353V1M5.121 9.55976L1.40088 13.2799L5.121 17"
                  stroke="currentColor"
                  fill="none"
                  strokeWidth="1.5"
                  strokeLinecap="square"
                  strokeLinejoin="bevel"
                />
              </svg>
            </div>
          </>
        )}
      </span>
    </motion.button>
  );
}
