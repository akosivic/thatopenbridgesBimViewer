const https = require('https');
const stream = require('stream');

module.exports = async function (request, context) {
  try {
    // Azure Blob Storage URL with SAS token for authentication
    const blobUrl = 'https://bimifcstorage.blob.core.windows.net/ifcfile?sp=r&st=2025-05-13T14:57:45Z&se=2026-05-13T22:57:45Z&spr=https&sv=2024-11-04&sr=c&sig=34EFGwbxixZCD7JMFDQ61zbJISwbjgtyxLgCDhCPIn4%3D';
    
    console.log('Requesting IFC file from Azure Blob Storage');
    
    // Create a pass-through stream that we'll pipe the response through
    const passThrough = new stream.PassThrough();
    
    // Create a promise to handle the HTTP request
    const requestPromise = new Promise((resolve, reject) => {
      const req = https.get(blobUrl, (res) => {
        if (res.statusCode !== 200) {
          console.log(`Failed to fetch file: ${res.statusCode} ${res.statusMessage}`);
          reject(new Error(`Failed to fetch file: ${res.statusCode} ${res.statusMessage}`));
          return;
        }
        
        // Pipe the response to our pass-through stream
        res.pipe(passThrough);
        
        // When the response ends, resolve the promise
        res.on('end', () => {
          resolve();
        });
      });
      
      req.on('error', (error) => {
        console.log('Error fetching from Azure Blob Storage:', error);
        reject(error);
      });
      
      // Set a timeout for the request
      req.setTimeout(30000, () => {
        req.abort();
        reject(new Error('Request timeout'));
      });
    });
    
    // Handle the request asynchronously
    requestPromise.catch((error) => {
      console.log('Request failed:', error);
      // The error will be caught by the outer try/catch
      throw error;
    });
    
    // Set response headers for streaming
    return {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="model.ifc"',
      },
      body: passThrough
    };
  } catch (error) {
    context.log.error('Error streaming IFC file:', error);
    return {
      status: 500,
      body: "Error streaming IFC file: " + error.message
    };
  }
};