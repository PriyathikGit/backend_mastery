import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ApiError } from "./ApiError.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // console.log("file is succesfully uploaded on cloudinary", response.url);
    fs.unlinkSync(localFilePath);
    console.log(response);

    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // removed the locally saved temp filed as the upload operation got failed
    return null;
  }
};

const deleteOnCloudinary = async (cloudinaryFilePath) => {
  try {
    if (!cloudinaryFilePath)
      throw new ApiError(400, "cloudinary file path is missing");

    const file = cloudinaryFilePath.split("/").pop().split(".")[0];
    const response = await cloudinary.uploader.destroy(file);

    return response;
  } catch (error) {
    console.error("Error deleting file from Cloudinary:", error);
    return null;
  }
};

export { uploadOnCloudinary, deleteOnCloudinary };
