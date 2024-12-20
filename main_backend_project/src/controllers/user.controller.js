import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
// import {} from "cookie-parser"
const genrateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.genrateAccessToken();
    const refreshToken = user.genrateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { refreshToken, accessToken };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong while genrating refresha and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;
  // console.log(req.body);

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
  const existedUser = await User.findOne({
    // if username or email exist in user collection, then its already existed
    $or: [{ username }, { email }],
  });
  // console.log(existedUser);

  if (existedUser) {
    throw new ApiError(409, "username or email or already exist");
  }

  // console.log(req.files);

  // retreiving the path of the file, this is temporary uploaded in local system(our machine)
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

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

const loginUser = asyncHandler(async (req, res) => {
  // data from req body
  // login based on username or email
  // find the user
  // password checking
  // genrate access and refresh token
  // send via cookies

  console.log(req.body);
  const { email, username, password } = req.body;

  console.log(email);
  console.log(username);
  console.log(password);

  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }

  // check if user exist, user can login through email or username
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "user does not exist");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "password is not valid");
  }

  const { refreshToken, accessToken } = await genrateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        201,
        {
          user: loggedInUser,
          accessToken,
          refreshToken, // sending again token because user can store in local storage, or maybe we are using on mobile application so we cannot use cookies then
        },
        "user logged in succesfully"
      )
    );
});

// the req body came from the jwt verify method, here we deleting the refresh token
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options) // clearing cookies
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logged out")); // after clearing cookies, sending empty object
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  // get the refresh token from cookie, when end point hit
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized token");
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "refresh token expired or used");
    }

    const { newRefreshToken, accessToken } = await genrateAccessAndRefreshToken(
      user._id
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, accessToken: newRefreshToken },
          "access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid refresh token");
  }
});

export { registerUser, loginUser, logoutUser,refreshAccessToken };
