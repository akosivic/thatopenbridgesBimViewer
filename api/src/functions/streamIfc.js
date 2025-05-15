const https = require('https');
const stream = require('stream');
const { app } = require('@azure/functions');
const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');

// Helper function to log errors based on environment
function logError(context, message, error) {
  if (!process.env.AZURE_FUNCTIONS_ENVIRONMENT) {
    context.log.error(message, error);
  } else {
    console.error(message, error);
  }
}

// Register the streamIfc function
app.http('streamIfc', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    return await streamIfc(request, context);
  }
});

async function streamIfc(request, context) {
  context.log('IFC streaming function started');

  try {
    // Get storage account credentials from environment variables
    const accountName = process.env.STORAGE_ACCOUNT_NAME || 'bimifcstorage';
    const accountKey = process.env.STORAGE_ACCOUNT_KEY;
    const containerName = process.env.STORAGE_CONTAINER_NAME || 'ifcfile';
    const blobName = request.query.blobName || 'bim.ifc';

    // Create a pass-through stream that we'll pipe the response through
    const passThrough = new stream.PassThrough();

    // Set up the response first to enable streaming
    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${blobName}"`,
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked'
      },
      body: passThrough
    };

    // Create a StorageSharedKeyCredential
    if (!accountKey) {
      throw new Error('Storage account key is not configured');
    }

    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      sharedKeyCredential
    );

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);

    context.log(`Downloading blob: ${blobName} from container: ${containerName}`);

    // Create a promise to handle the blob download and await it
    await new Promise((resolve, reject) => {
      blobClient.download().then(
        downloadResponse => {
          if (!downloadResponse.readableStreamBody) {
            reject(new Error('No readable stream available'));
            return;
          }

          context.log('Successfully connected to Azure Blob Storage');

          const readableStream = downloadResponse.readableStreamBody;

          // Handle data events explicitly
          readableStream.on('data', (chunk) => {
            passThrough.write(chunk);
          });

          // When the response ends, resolve the promise
          readableStream.on('end', () => {
            context.log('Finished streaming IFC file');
            passThrough.end();
            resolve();
          });

          readableStream.on('error', (error) => {
            logError(context, 'Error reading from stream:', error);
            passThrough.end();
            reject(error);
          });
        },
        error => {
          logError(context, 'Error downloading blob:', error);
          passThrough.end();
          reject(error);
        }
      );
    });

    return context.res;
  } catch (error) {
    logError(context, 'Error streaming IFC file:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: "Error streaming IFC file: " + error.message })
    };
  }
}