'use strict';

const multer = require('multer');
const storage = multer.diskStorage({});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf-8');
    cb(null, true);
  }
});
module.exports = upload;