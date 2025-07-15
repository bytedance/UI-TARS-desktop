export default {
  webcrypto: {
    getRandomValues: (array: Uint8Array) => {
      return crypto.getRandomValues(array);
    },
  },
};
