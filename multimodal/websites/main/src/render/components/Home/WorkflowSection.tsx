import React from 'react';
import { motion } from 'framer-motion';
import { WorkflowNodes } from '../WorkflowNodes';

export const WorkflowSection: React.FC = () => {
  return (
    <section className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-0"
        >
          <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Agentic Workflow
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Experience the power of autonomous agent-driven workflow integration. Our intelligent
            agent continuously learns and adapts to optimize your development process.
          </p>
        </motion.div>

        <WorkflowNodes />
      </div>
    </section>
  );
};
