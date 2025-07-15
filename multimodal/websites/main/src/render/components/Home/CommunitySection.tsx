import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@nextui-org/react';
import { HiCode } from 'react-icons/hi';

export const CommunitySection: React.FC = () => {
  return (
    <section className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h2 className="text-4xl font-bold mb-8 text-white">Join Our Community</h2>
          <p className="text-gray-500 mb-8 max-w-2xl mx-auto">
            Agent TARS is open source and welcomes contributions from developers worldwide
          </p>
          <Button
            as="a"
            href="https://github.com/bytedance/UI-TARS-desktop"
            target="_blank"
            className="bg-white text-black hover:bg-gray-200"
            startContent={<HiCode />}
          >
            Contribute Now
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
