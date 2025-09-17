import React from 'react';
import { Listbox } from '@headlessui/react';
import { useDarkMode } from '../../hooks/useDarkMode';

export interface SelectProps<T = any> {
  value: T;
  onChange: (event: { target: { value: T } }) => void;
  children: React.ReactNode;
  disabled?: boolean;
  displayEmpty?: boolean;
  renderValue?: (value: T) => React.ReactNode;
  size?: 'small' | 'medium';
  MenuProps?: any; // Keep for compatibility
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

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  children,
  disabled = false,
  displayEmpty = false,
  renderValue,
  size = 'medium',
  sx,
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

  const selectedOption = options.find(opt => opt.value === value);
  const handleChange = (newValue: any) => onChange({ target: { value: newValue } });

  return (
    <div className={className} style={{ position: 'relative' }}>
      <Listbox value={value} onChange={handleChange} disabled={disabled}>
        <Listbox.Button
          style={{
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
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            ...sx,
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {renderValue ? renderValue(value) : (selectedOption?.label || (displayEmpty ? 'Select...' : ''))}
          </span>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Listbox.Button>
        
        <Listbox.Options
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 50,
            marginTop: '4px',
            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
            border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(203, 213, 225, 0.6)',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            maxHeight: '240px',
            overflowY: 'auto',
          }}
        >
          {options.map((option, index) => (
            <Listbox.Option key={`${option.value}-${index}`} value={option.value} disabled={option.disabled}>
              {({ active, selected }) => (
                <div
                  style={{
                    padding: '8px 16px',
                    backgroundColor: active ? (isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)') : 'transparent',
                    color: selected ? (isDarkMode ? '#60a5fa' : '#2563eb') : (isDarkMode ? '#f9fafb' : '#111827'),
                    fontWeight: selected ? 500 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {option.label}
                </div>
              )}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </Listbox>
    </div>
  );
};

export const MenuItem: React.FC<MenuItemProps> = ({ children }) => {
  return <>{children}</>;
};

export const FormControl: React.FC<FormControlProps> = ({ children, size, disabled }) => {
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


