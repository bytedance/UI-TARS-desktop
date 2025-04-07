import { useState, FC } from 'react';
import { Input, type InputProps } from '@nextui-org/react';
import { EyeSlashFilledIcon } from '@renderer/components/icons/EyeSlashFilledIcon';
import { EyeFilledIcon } from '@renderer/components/icons/EyeFilledIcon';

export const PasswordInput: FC<Omit<InputProps, 'type' | 'endContent'>> = (
  props,
) => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => setIsVisible(!isVisible);

  return (
    <Input
      type={isVisible ? 'text' : 'password'}
      endContent={
        <button
          aria-label="toggle password visibility"
          className="focus:outline-none"
          type="button"
          onClick={toggleVisibility}
        >
          {isVisible ? (
            <EyeSlashFilledIcon className="text-2xl text-default-400 pointer-events-none" />
          ) : (
            <EyeFilledIcon className="text-2xl text-default-400 pointer-events-none" />
          )}
        </button>
      }
      {...props}
    />
  );
};
