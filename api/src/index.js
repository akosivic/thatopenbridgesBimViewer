const { app } = require('@azure/functions');

app.setup({
  enableHttpStream: true,
});

// Register the streamIfc function
const streamIfc = require('./streamIfc');
app.http('streamIfc', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    return await streamIfc(request, context);
  },
  route: 'streamIfc',
  // handler: streamIfc
});