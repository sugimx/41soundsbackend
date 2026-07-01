import multer from "multer";

const upload = multer({
  dest: "uploads/", // temporary folder
});

export default upload;