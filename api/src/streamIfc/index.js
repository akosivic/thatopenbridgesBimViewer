const https = require('https');
const stream = require('stream');

module.exports = async function (request, context) {
  context.log('IFC streaming function started');
  
  try {
    // Azure Blob Storage URL with SAS token for authentication
    // Remove the timestamp parameter at the end which might cause issues
    const blobUrl = 'https://bimifcstorage.blob.core.windows.net/ifcfile/bim.ifc?sv=2024-11-04&ss=bqtf&srt=sco&sp=rwdlacuptfxiy&se=2025-05-14T21:32:54Z&sig=iLwumOG6hAkA5IrGvHdt%2Fh4svyErVpbORBHmJQuGlvQ%3D';

    context.log('Requesting IFC file from Azure Blob Storage');

    // Create a pass-through stream that we'll pipe the response through
    const passThrough = new stream.PassThrough();
    
    // Set up the response first to enable streaming
    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="model.ifc"',
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked'
      },
      body: passThrough
    };

    // Create a promise to handle the HTTP request and await it
    await new Promise((resolve, reject) => {
      const req = https.get(blobUrl, (res) => {
        if (res.statusCode !== 200) {
          const errorMsg = `Failed to fetch file: ${res.statusCode} ${res.statusMessage}`;
          context.log.error(errorMsg);
          reject(new Error(errorMsg));
          return;
        }
        
        context.log('Successfully connected to Azure Blob Storage');
        
        // Handle data events explicitly
        res.on('data', (chunk) => {
          passThrough.write(chunk);
        });

        // When the response ends, resolve the promise
        res.on('end', () => {
          context.log('Finished streaming IFC file');
          passThrough.end();
          resolve();
        });
      });

      req.on('error', (error) => {
        context.log.error('Error fetching from Azure Blob Storage:', error);
        passThrough.end();
        reject(error);
      });

      // Set a timeout for the request (increased to 60 seconds)
      req.setTimeout(60000, () => {
        context.log.error('Request timeout after 60 seconds');
        req.destroy();
        reject(new Error('Request timeout after 60 seconds'));
      });
    });

    return context.res;
  } catch (error) {
    context.log.error('Error streaming IFC file:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: "Error streaming IFC file: " + error.message })
    };
  }
}