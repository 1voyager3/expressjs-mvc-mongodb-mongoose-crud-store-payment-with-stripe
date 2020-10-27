const fs = require("fs");

// the module for deleting the files from a file system
const deleteFile = filePath => {

  fs.unlink(filePath, err => {
    if (err) {
      throw err;
    }
  });
};

exports.deleteFile = deleteFile;