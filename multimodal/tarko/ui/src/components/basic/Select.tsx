import React from 'react';
import { createPortal } from 'react-dom';
import { Listbox } from '@headlessui/react';
import { HiChevronDown } from 'react-icons/hi2';
import { useDarkMode } from '../../hooks/useDarkMode';

export interface SelectProps<T = any> {
  value: T;
  onChange: (event: { target: { value: T } }) => void;
  children: React.ReactNode;
  disabled?: boolean;
  displayEmpty?: boolean;
  renderValue?: (value: T) => React.ReactNode;
  className?: string;
}

export interface MenuItemProps {
  value: any;
  children: React.ReactNode;
  disabled?: boolean;
}

export interface FormControlProps {
  children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  children,
  disabled = false,
  displayEmpty = false,
  renderValue,
  className,
}) => {
  const isDarkMode = useDarkMode();

  // Extract options from children
  const options: Array<{ value: any; label: React.ReactNode; disabled?: boolean }> = [];
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === MenuItem) {
      options.push({
        value: child.props.value,
        label: child.props.children,
        disabled: child.props.disabled,
      });
    }
  });

  const selectedOption = options.find((opt) => opt.value === value);
  const handleChange = (newValue: any) => onChange({ target: { value: newValue } });

  const [buttonRect, setButtonRect] = React.useState<DOMRect | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const updateButtonRect = React.useCallback(() => {
    if (buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect());
    }
  }, []);

  return (
    <div className={className} style={{ position: 'relative' }}>
      <Listbox value={value} onChange={handleChange} disabled={disabled}>
        {({ open }) => {
          React.useEffect(() => {
            if (open) {
              updateButtonRect();
              const handleScroll = () => updateButtonRect();
              const handleResize = () => updateButtonRect();
              window.addEventListener('scroll', handleScroll, true);
              window.addEventListener('resize', handleResize);
              return () => {
                window.removeEventListener('scroll', handleScroll, true);
                window.removeEventListener('resize', handleResize);
              };
            }
          }, [open, updateButtonRect]);

          return (
            <>
              <Listbox.Button
                ref={buttonRef}
                style={{
                  width: '100%',
                  minHeight: '28px',
                  padding: '3px 10px',
                  backgroundColor: isDarkMode
                    ? 'rgba(55, 65, 81, 0.3)'
                    : 'rgba(248, 250, 252, 0.8)',
                  border: isDarkMode
                    ? '1px solid rgba(75, 85, 99, 0.3)'
                    : '1px solid rgba(203, 213, 225, 0.6)',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  color: isDarkMode ? '#f9fafb' : '#111827',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.6 : 1,
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {renderValue
                    ? renderValue(value)
                    : selectedOption?.label || (displayEmpty ? 'Select...' : '')}
                </span>
                <HiChevronDown
                  size={12}
                  style={{
                    transition: 'transform 0.2s ease-in-out',
                    transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                    opacity: disabled ? 0.4 : 0.6,
                    marginLeft: '8px',
                    flexShrink: 0,
                  }}
                />
              </Listbox.Button>

              {open &&
                buttonRect &&
                createPortal(
                  <Listbox.Options
                    style={{
                      position: 'fixed',
                      top: buttonRect.bottom + 8,
                      left: buttonRect.left,
                      minWidth: buttonRect.width,
                      zIndex: 50000,
                      backgroundColor: isDarkMode
                        ? 'rgba(31, 41, 55, 0.98)'
                        : 'rgba(255, 255, 255, 0.98)',
                      backdropFilter: 'blur(20px)',
                      border: isDarkMode
                        ? '1px solid rgba(75, 85, 99, 0.4)'
                        : '1px solid rgba(229, 231, 235, 0.6)',
                      borderRadius: '16px',
                      boxShadow: isDarkMode
                        ? '0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 8px 16px -4px rgba(0, 0, 0, 0.3)'
                        : '0 20px 40px -10px rgba(0, 0, 0, 0.15), 0 8px 16px -4px rgba(0, 0, 0, 0.08)',
                      maxHeight: '360px',
                      maxWidth: '400px',
                      overflowY: 'auto',
                      padding: '8px',
                    }}
                  >
                    {options.map((option, index) => (
                      <Listbox.Option
                        key={`${option.value}-${index}`}
                        value={option.value}
                        disabled={option.disabled}
                      >
                        {({ active, selected }) => (
                          <div
                            style={{
                              padding: '8px 16px',
                              borderRadius: '8px',
                              margin: '3px 0',
                              minHeight: '40px',
                              display: 'flex',
                              alignItems: 'center',
                              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                              backgroundColor: active
                                ? isDarkMode
                                  ? 'rgba(99, 102, 241, 0.15)'
                                  : 'rgba(99, 102, 241, 0.08)'
                                : 'transparent',
                              color: selected
                                ? isDarkMode
                                  ? '#a5b4fc'
                                  : '#6366f1'
                                : isDarkMode
                                  ? '#f9fafb'
                                  : '#111827',
                              fontWeight: selected ? 500 : 400,
                              cursor: 'pointer',
                              transform: active ? 'translateX(2px)' : 'translateX(0)',
                            }}
                          >
                            {option.label}
                          </div>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>,
                  document.body,
                )}
            </>
          );
        }}
      </Listbox>
    </div>
  );
};

export const MenuItem: React.FC<MenuItemProps> = ({ children }) => {
  return <>{children}</>;
};

export const FormControl: React.FC<FormControlProps> = ({ children }) => {
  return <div style={{ display: 'inline-block' }}>{children}</div>;
};
