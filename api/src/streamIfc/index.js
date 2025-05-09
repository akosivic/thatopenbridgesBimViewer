const fs = require('fs');
const path = require('path');
// const { app } = require('@azure/functions');


// app.http('streamifc', {
//   methods: ['GET'],
//   authLevel: 'anonymous',
//   handler: async (request, context) => {
//     switch (request.method) {
//       case 'GET':
//         return await handlestreamifcGet(request, context);
//       // case 'PUT':
//       //   return await handlePut(request, context);
//       // case 'POST':
//       //   return await handlePost(request, context);
//       // case 'DELETE':
//       //   return handleDelete(request, context);
//       default:
//         // context.log({ message: 'Subdomains', properties: { subdomains } });
//         // Handle unsupported methods
//         return JSON.stringify({
//           error: 'Method not supported',
//           supportedMethods: ['GET']
//         });
//     }
//   }
// });

module.exports = async function (request, context) {
  try {
    // Path to the IFC file
    const ifcFilePath = path.join(__dirname, '..', 'model', 'For Test Package.ifc');
    console.log('IFC file path:', ifcFilePath);

    // Check if file exists
    if (!fs.existsSync(ifcFilePath)) {
      console.log('!exists', ifcFilePath);
      context.res = {
        status: 404,
        body: "IFC file not found"
      };
      return;
    }
    console.log('exists', ifcFilePath);
    // Get file stats for content length
    const stats = fs.statSync(ifcFilePath);

    // Create a read stream from the file
    const fileStream = fs.createReadStream(ifcFilePath);
    console.log('fileStream', fileStream);
    // Set response headers
    return {
      status: 200,
      // headers: {
      //   'Content-Type': 'application/octet-stream',
      //   'Content-Disposition': 'attachment; filename="For Test Package.ifc"',
      //   'Content-Length': stats.size
      // },
      body: fileStream
    };
  } catch (error) {
    context.log.error('Error streaming IFC file:', error);
    return {
      status: 500,
      body: "Error streaming IFC file: " + error.message
    };
  }
};