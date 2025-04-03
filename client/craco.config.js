module.exports = {
  webpack: {
    configure: {
      resolve: {
        fallback: {
          url: require.resolve('url/'),
          util: require.resolve('util/'),
          stream: require.resolve('stream-browserify'),
          buffer: require.resolve('buffer/'),
        },
      },
    },
  },
  devServer: {
    allowedHosts: ['localhost', '.localhost'],
  },
};
