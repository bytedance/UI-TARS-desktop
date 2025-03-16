import pkg from '../package.json';

export const getExternalPkgs = () => {
  const { platform } = process;
  return [
    ...Object.keys(pkg.dependencies),
    ...(platform === 'darwin'
      ? ['@computer-use/libnut-darwin']
      : platform === 'win32'
        ? ['@computer-use/libnut-win32']
        : platform === 'linux'
          ? ['@computer-use/libnut-linux']
          : []),
  ];
};
