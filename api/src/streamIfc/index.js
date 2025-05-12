const fs = require('fs');
const path = require('path');

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
    // console.log('fileStream', fileStream);
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