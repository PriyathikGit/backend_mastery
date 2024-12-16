import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;
  console.log("fullName: ", fullName);
  console.log(typeof email);

  // if any of the fields is invalid, then throw error
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "all field are required");
  }
  // if username dont include throw error
  if (!email.includes("@")) {
    throw new ApiError(400, "valid email required");
  }
  // if user is already existed, then throw error
  const existedUser = User.findOne({
    // if username or email exist in user collection, then its already existed
    $or: [{ username }, { email }],
  });
  console.log(existedUser);

  if (existedUser) {
    throw new ApiError(409, "username or email or already exist");
  }


  console.log(req.files);

  // retreiving the path of the file, this is temporary uploaded in local system(our machine)
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar file is required");
  }

  // upload on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // if avatar not uploaded
  if (!avatar) {
    throw new ApiError(400, "avatar file is required");
  }

  // creating user in database
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // removing some fields from the user data 
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // if user not created
  if (!createdUser) {
    throw new ApiError(500, "something went wrong while registering the user");
  }
  
  // returning response
  const response = res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Register Succesfully!!"));
  return response;
});

export { registerUser };
