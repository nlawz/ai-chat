import { motion } from 'framer-motion';
import { ExaIcon } from './icons';

export const Greeting = () => {
  return (
    <>
      {/* Background Exa Icon - positioned relative to entire viewport */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none opacity-10 z-0">
        <ExaIcon size={200} />
      </div>
      
      <div
        key="overview"
        className="max-w-3xl mx-auto md:mt-20 px-8 size-full flex flex-col justify-center relative z-10"
      >
        {/* Greeting Content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.5 }}
          className="text-2xl font-semibold"
        >
          Hello there!
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.6 }}
          className="text-2xl text-zinc-500"
        >
          How can I help you today?
        </motion.div>
      </div>
    </>
  );
};
