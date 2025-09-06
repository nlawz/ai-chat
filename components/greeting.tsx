import { motion } from 'framer-motion';
import { ExaIcon } from './icons';
import { useSidebar } from './ui/sidebar';

export const Greeting = () => {
  const { state } = useSidebar();
  
  return (
    <div
      key="overview"
      className="max-w-3xl mx-auto px-8 size-full flex flex-col relative"
    >
       {/* Exa Icon centered lower on screen */}
      <div 
        className="fixed inset-0 flex items-center justify-center pointer-events-none opacity-10 transition-[left] duration-200 ease-linear"
        style={{
          left: state === 'expanded' ? '16rem' : '0'
        }}
      >
        <ExaIcon size={200} />
      </div>
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
      
     
    </div>
  );
};