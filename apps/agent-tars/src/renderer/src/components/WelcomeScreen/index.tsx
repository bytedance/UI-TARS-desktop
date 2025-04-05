import { FC } from 'react';
import {
  FiExternalLink,
  FiBook,
  FiGithub,
  FiMessageCircle,
  FiGrid,
  FiFileText,
  FiTwitter,
} from 'react-icons/fi';
import Logo from '../../assets/logo.png';
import { motion } from 'framer-motion';
import styles from './WelcomeScreen.module.scss';

// Use this interface later.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface WelcomeScreenProps {}

export const WelcomeScreen: FC<WelcomeScreenProps> = () => {
  return (
    <div
      className={`w-full max-w-3xl mx-auto px-4 pt-[20vh] ${styles.welcomeGradient}`}
    >
      <motion.div
        className="flex flex-col items-center text-center mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.05 }}
          transition={{ duration: 0.5 }}
          className="mb-4"
        >
          <img
            src={Logo}
            alt="Agent TARS Logo"
            className={`w-20 h-20 ${styles.logoShadow}`}
          />
        </motion.div>

        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
          Agent TARS
        </h1>

        <p className="text-base text-gray-600 dark:text-gray-300 max-w-xl mb-6">
          An open-source multimodal AI agent. <br />
          Offering seamless integration with a wide range of real-world tools.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <motion.a
            href="https://agent-tars.com/doc/quick-start"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-white bg-primary hover:bg-primary-600 px-4 py-2 rounded-full transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiBook size={18} />
            <span>Get Started</span>
            <FiExternalLink size={14} />
          </motion.a>

          <motion.a
            href="https://github.com/bytedance/UI-TARS-desktop"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-gray-800 dark:bg-gray-700 text-white hover:bg-gray-700 dark:hover:bg-gray-600 px-4 py-2 rounded-full transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiGithub size={18} />
            <span>GitHub</span>
            <FiExternalLink size={14} />
          </motion.a>
        </div>

        {/* Additional Links Section */}
        <div className="flex flex-wrap gap-3 justify-center mt-6">
          <motion.a
            href="https://agent-tars.com/blog"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary-300 px-2 py-1 rounded ${styles.cardHoverEffect}`}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <FiFileText size={14} />
            <span>Blog</span>
          </motion.a>

          <motion.a
            href="https://agent-tars.com/showcase"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary-300 px-2 py-1 rounded ${styles.cardHoverEffect}`}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <FiGrid size={14} />
            <span>Showcase</span>
          </motion.a>

          <motion.a
            href="https://x.com/agent_tars"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary-300 px-2 py-1 rounded ${styles.cardHoverEffect}`}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <FiTwitter size={14} />
            <span>Twitter</span>
          </motion.a>

          <motion.a
            href="https://discord.gg/HnKcSBgTVx"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary-300 px-2 py-1 rounded ${styles.cardHoverEffect}`}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <FiMessageCircle size={14} />
            <span>Discord</span>
          </motion.a>
        </div>
      </motion.div>
    </div>
  );
};
