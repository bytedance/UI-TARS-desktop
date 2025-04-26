import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@renderer/components/ui/button';

const MotionButton = motion(Button);

interface SuggestionProps {
  suggestions: string[];
  onSelect?: (suggestion: string) => void;
}

const Prompts = ({ suggestions, onSelect }: SuggestionProps) => {
  return (
    <div className="flex flex-col gap-3">
      {suggestions.map((suggestion, index) => (
        <MotionButton
          key={index}
          variant="ghost"
          className="w-fit text-sm text-muted-foreground hover:text-foreground"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: index * 0.1,
            ease: 'easeOut',
          }}
          onClick={() => onSelect?.(suggestion)}
        >
          {suggestion}
          <ArrowRight className="ml-2 h-4 w-4" />
        </MotionButton>
      ))}
    </div>
  );
};

export default Prompts;
