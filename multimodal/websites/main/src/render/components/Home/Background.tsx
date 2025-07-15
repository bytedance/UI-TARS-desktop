import React from 'react';

export const Background: React.FC = () => {
  return (
    <div className="fixed inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_100%)]" />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.828-1.415 1.415L51.8 0h2.827zM5.373 0l-.83.828L5.96 2.243 8.2 0H5.374zM48.97 0l3.657 3.657-1.414 1.414L46.143 0h2.828zM11.03 0l-.83.828L5.96 2.243 8.2 0H5.374zM22.343 0l1.415 1.415-3.657 3.657 1.415 1.414L40.8 0H32zM0 0c2.336 4.582 5.07 7.314 8.2 8.2L0 16.4V0zm0 3.414L1.414 2 5.07 5.657 3.657 7.07 0 3.414zM0 17.657l6.485-6.485 1.415 1.415-7.9 7.9v-2.83zm0 5.657l12.142-12.142 1.415 1.415L0 26.272v-2.958zm0 5.657l17.8-17.8 1.415 1.415L0 31.93v-2.96zm0 5.657l23.457-23.457 1.415 1.415L0 37.587v-2.96zm0 5.657L29.114 0h2.83L0 43.244v-2.96zm0 5.657L34.77 0h2.83L0 48.9v-2.96zm0 5.657L40.428 0h2.83L0 54.556v-2.96zm0 5.657L46.085 0h2.83L0 60v-2.96z' fill='rgba(255,255,255,0.02)' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};
