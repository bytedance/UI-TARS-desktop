import React from 'react';
import { motion } from 'framer-motion';
import { HiOutlineLightBulb } from 'react-icons/hi';
import { FaTools, FaDesktop } from 'react-icons/fa';
import { MdWorkspaces } from 'react-icons/md';

const features = [
  {
    icon: <HiOutlineLightBulb className="w-6 h-6" />,
    title: 'Advanced Browser Operations',
    description: 'Executes sophisticated tasks through an agent framework',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: <FaTools className="w-6 h-6" />,
    title: 'Comprehensive Tool Support',
    description: 'Integrates with search, file editing, and command line tools',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: <FaDesktop className="w-6 h-6" />,
    title: 'Enhanced Desktop App',
    description: 'Revamped UI with multimodal elements and session management',
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    icon: <MdWorkspaces className="w-6 h-6" />,
    title: 'Workflow Orchestration',
    description: 'Seamlessly connects GUI Agent tools and workflows',
    color: 'from-rose-500 to-rose-600',
  },
];

export const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Features
          </h2>
          <p className="text-xl text-gray-400">Discover the power of Agent TARS</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="group relative overflow-hidden rounded-2xl bg-white/5 p-6 hover:bg-white/[0.07] transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.07] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
                    {feature.icon}
                  </div>

                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold text-xl text-white/90 group-hover:text-white transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-white/60 group-hover:text-white/70 transition-colors duration-300 text-sm">
                      {feature.description}
                    </p>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                <div className="absolute top-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
