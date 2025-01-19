import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Tweet } from "../models/tweet.model.js";
import mongoose, { isValidObjectId } from "mongoose";

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  console.log(content);

  if (!content) {
    throw new ApiError(400, "content required!!");
  }

  const postTweet = await Tweet.create({
    content,
    owner: req?.user?._id,
  });

  if (!postTweet) {
    throw new ApiError(404, "tweet cannot be posted");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, postTweet, "tweet created succesfully"));
});

// get all user tweets,
// if a person search a user, then it should get all their tweet
const getUserTweet = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  try {
    // check if user id is true
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "invalid userId");
    }

    const userTweet = await Tweet.find({
      owner: new mongoose.Types.ObjectId(userId),
    });

    if (userTweet.length === 0) {
      throw new ApiError(400, "this user did not post any tweets");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, userTweet, "tweet fetched succesfully"));
  } catch (error) {
    console.log(error);
    throw new ApiError(404, "cannot get user tweet");
  }
});

// update tweet, user gonna send the tweet id and content,
// and if the owner is sending the request then update, else not
const updateTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { tweetId } = req.params;
  if (!content) {
    throw new ApiError(400, "content is empty");
  }
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "not a valid tweet id");
  }

  // find tweet and only owner can update it
  const findTweet = await Tweet.findOne({
    $and: [
      // if the tweet is created by owner
      { owner: new mongoose.Types.ObjectId(req.user?._id) },
      { _id: tweetId }, // or search the tweet by tweetid
    ],
  });

  if (!findTweet) {
    throw new ApiError(400, "not authorised to update the tweet");
  }

  findTweet.content = content;
  const updatedTweet = await findTweet.save();

  if (!updatedTweet) {
    throw new ApiError(400, "tweet cannot be updated");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "tweet update succesfully"));
});

// user gonna send the tweet id and if the owner is sending then delete
const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "not a valid tweet id");
  }

  const tweet = await Tweet.findOne({
    $and: [
      { owner: new mongoose.Types.ObjectId(req.user?._id) },
      { _id: tweetId },
    ],
  });

  if (!tweet) {
    throw new ApiError(400, "not authorised to delete delete");
  }
  const removeTweet = await Tweet.findByIdAndDelete(tweetId);
  if (!removeTweet) {
    throw new ApiError(400, "tweet cannot be deleted");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, "", "tweet deleted succesfully"));
});

export { createTweet, deleteTweet, getUserTweet, updateTweet };
