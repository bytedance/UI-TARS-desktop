import { FiAlertTriangle } from 'react-icons/fi';
import { motion } from 'framer-motion';
import './index.css';

export const DeprecationBanner = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="deprecation-warnning w-full bg-yellow-500 dark:bg-yellow-600 py-2 px-4 flex items-center justify-center text-black dark:text-white z-50 sticky shadow-md"
    >
      <FiAlertTriangle className="mr-2" size={20} />
      <span className="font-medium">Deprecation Warning: </span>
      <span className="mx-1">
        This desktop app has been deprecated, Please use Agent TARS CLI,{' '}
      </span>
      <a
        href="https://agent-tars.com/beta"
        target="_blank"
        rel="noopener noreferrer"
        className="deprecation-warnning-link underline font-semibold hover:text-yellow-800 dark:hover:text-yellow-200"
      >
        see release blog
      </a>
    </motion.div>
  );
};
