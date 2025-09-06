import { motion } from 'framer-motion';
import { ExaIcon } from './icons';

export const Greeting = () => {
  return (
    <div
      key="overview"
      className="max-w-3xl mx-auto px-8 size-full flex flex-col relative"
    >
      {/* Greeting Content at top */}
      <div className="mt-20">
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
      
      {/* Exa Icon centered lower on screen */}
      <div className="flex-1 flex items-center justify-center pointer-events-none opacity-10 pt-24">
        <ExaIcon size={200} />
      </div>
    </div>
  );
};