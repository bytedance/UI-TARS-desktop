import React from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { useDarkMode } from '../../hooks/useDarkMode';

export interface SelectProps<T = any> {
  value: T;
  onChange: (value: T) => void;
  children: React.ReactNode;
  disabled?: boolean;
  displayEmpty?: boolean;
  renderValue?: (value: T) => React.ReactNode;
  size?: 'small' | 'medium';
  MenuProps?: {
    PaperProps?: {
      style?: React.CSSProperties;
      sx?: any;
    };
    anchorOrigin?: {
      vertical: 'top' | 'bottom';
      horizontal: 'left' | 'right' | 'center';
    };
    transformOrigin?: {
      vertical: 'top' | 'bottom';
      horizontal: 'left' | 'right' | 'center';
    };
  };
  sx?: React.CSSProperties;
  className?: string;
}

export interface MenuItemProps {
  value: any;
  children: React.ReactNode;
  disabled?: boolean;
}

export interface FormControlProps {
  children: React.ReactNode;
  size?: 'small' | 'medium';
  disabled?: boolean;
}

// Context to pass data between Select and MenuItem
const SelectContext = React.createContext<{
  selectedValue: any;
  onSelect: (value: any) => void;
  isDarkMode: boolean;
} | null>(null);

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  children,
  disabled = false,
  displayEmpty = false,
  renderValue,
  size = 'medium',
  MenuProps,
  sx,
  className,
}) => {
  const isDarkMode = useDarkMode();

  // Extract MenuItem children to get options
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

  const selectedOption = options.find(opt => opt.value === value);

  const buttonStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minHeight: size === 'small' ? '32px' : '40px',
    padding: size === 'small' ? '4px 32px 4px 12px' : '8px 32px 8px 16px',
    backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(248, 250, 252, 0.8)',
    border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(203, 213, 225, 0.6)',
    borderRadius: '8px',
    fontSize: size === 'small' ? '0.875rem' : '1rem',
    color: isDarkMode ? '#f9fafb' : '#111827',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'all 150ms ease-in-out',
    outline: 'none',
    backdropFilter: 'blur(8px)',
    ...sx,
  };

  const arrowStyle: React.CSSProperties = {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '16px',
    height: '16px',
    color: isDarkMode ? '#9ca3af' : '#6b7280',
    transition: 'transform 150ms ease-in-out',
  };

  const menuStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 50000, // Increased z-index to ensure it's above other elements
    marginTop: '4px',
    width: '100%',
    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
    border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(203, 213, 225, 0.6)',
    borderRadius: '8px',
    boxShadow: isDarkMode
      ? '0 20px 40px -10px rgba(0, 0, 0, 0.4), 0 10px 20px -5px rgba(0, 0, 0, 0.2)'
      : '0 20px 40px -10px rgba(0, 0, 0, 0.15), 0 10px 20px -5px rgba(0, 0, 0, 0.08)',
    maxHeight: MenuProps?.PaperProps?.style?.maxHeight || '360px',
    overflowY: 'auto',
    ...MenuProps?.PaperProps?.style,
  };

  return (
    <SelectContext.Provider value={{ selectedValue: value, onSelect: onChange, isDarkMode }}>
      <Listbox value={value} onChange={onChange} disabled={disabled}>
        <div className={className} style={{ position: 'relative' }}>
          <Listbox.Button style={buttonStyle}>
            <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {renderValue ? renderValue(value) : (selectedOption?.label || (displayEmpty ? 'Select...' : ''))}
            </span>
            <svg style={arrowStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Listbox.Button>
          
          <Transition
            as={React.Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options style={menuStyle}>
              {options.map((option, index) => (
                <Listbox.Option
                  key={`${option.value}-${index}`}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {({ active, selected, disabled: optionDisabled }) => {
                    const optionStyle: React.CSSProperties = {
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 16px',
                      cursor: optionDisabled ? 'not-allowed' : 'pointer',
                      backgroundColor: active
                        ? isDarkMode
                          ? 'rgba(59, 130, 246, 0.1)'
                          : 'rgba(59, 130, 246, 0.05)'
                        : 'transparent',
                      color: optionDisabled
                        ? isDarkMode
                          ? '#6b7280'
                          : '#9ca3af'
                        : selected
                          ? isDarkMode
                            ? '#60a5fa'
                            : '#2563eb'
                          : isDarkMode
                            ? '#f9fafb'
                            : '#111827',
                      fontWeight: selected ? 500 : 400,
                      opacity: optionDisabled ? 0.5 : 1,
                    };

                    return (
                      <div style={optionStyle}>
                        {option.label}
                      </div>
                    );
                  }}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </SelectContext.Provider>
  );
};

export const MenuItem: React.FC<MenuItemProps> = ({ children }) => {
  // This is a placeholder component that gets processed by Select
  // The actual rendering is handled by Listbox.Option in Select component
  return <>{children}</>;
};

export const FormControl: React.FC<FormControlProps> = ({ children, size, disabled }) => {
  // Simple wrapper that passes props down
  return (
    <div style={{ display: 'inline-block' }}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { size, disabled, ...child.props });
        }
        return child;
      })}
    </div>
  );
};

// Legacy Menu component for compatibility (not used in new Select)
export interface MenuProps {
  children: React.ReactNode;
  open?: boolean;
  onClose?: () => void;
  anchorEl?: Element | null;
}

export const Menu: React.FC<MenuProps> = ({ children }) => {
  // Placeholder for compatibility - not implemented as it's not used in our codebase
  return <div>{children}</div>;
};
