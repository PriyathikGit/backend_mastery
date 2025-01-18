import Ffmpeg from "fluent-ffmpeg";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose, { isValidObjectId, Mongoose } from "mongoose";

const getVideoDuration = async (localVideoFile) => {
  let videoDuration;
  try {
    videoDuration = await new Promise((resolve, reject) => {
      Ffmpeg.ffprobe(localVideoFile, (err, metadata) => {
        if (err) {
          reject(new ApiError(400, "Error reading video Metadata"));
        } else {
          resolve(metadata.format.duration);
        }
      });
    });
    return videoDuration;
  } catch (error) {
    throw new ApiError(500, "Error while processing video file");
  }
};

const uploadVideo = asyncHandler(async (req, res) => {
  // take user param input details
  const { title, description } = req.body;
  // if title length 0 return error
  if ([title, description].some((item) => item?.trim() === "")) {
    throw new ApiError(400, "Title and description required");
  }

  const localVideoFile = req.files?.videoFile[0]?.path;
  const localThumbnailFile = req.files?.thumbnail[0]?.path;

  if (!localVideoFile) {
    throw new ApiError(400, "Video file is required");
  }
  if (!localThumbnailFile) {
    throw new ApiError(400, "thumbnail is required");
  }

  const duration = await getVideoDuration(localVideoFile);

  const videoFile = await uploadOnCloudinary(localVideoFile);
  const thumbnail = await uploadOnCloudinary(localThumbnailFile);

  if (!videoFile) {
    throw new ApiError(400, "Video file is required");
  }
  if (!thumbnail) {
    throw new ApiError(400, "thumbnail is required");
  }

  // creating a new document in video model
  const uploadedVideoDetails = await Video.create({
    title,
    description,
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    duration: duration,
    owner: req.user?._id,
  });

  if (!uploadedVideoDetails) {
    new ApiError(500, "Error while video saving");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, uploadedVideoDetails, "Video uploaded Succesfully")
    );
});

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query = "",
    sortBy = "createdAt",
    sortType = 1,
    userId,
  } = req.query;

  if (query.trim() === "") {
    return new ApiResponse(404, "need a valid channel name!!");
  }

  try {
    const getAllVideoPipeline = [
      {
        // find the video on basis of tile or description or find by username
        $match: {
          $and: [
            {
              $or: [
                { title: { $regex: query, $options: "i" } },
                { description: { $regex: query, $options: "i" } },
              ],
            },
            // if userId found, owner is current user
            ...(userId ? [{ owner: new mongoose.Types.ObjectId(userId) }] : []),
          ],
        },
      },
      // find the owner of the video,
      // go into users document, get the user id and check with foriegn with owner, (we saved owner : as the user who uploaded file)
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "Owner",
          pipeline: [
            {
              $project: {
                // project the user as owner
                _id: 1,
                fullName: 1,
                avatar: "$avatar.url",
                username: 1,
              },
            },
          ],
        },
      },
      {
        // add the Owner detail to the video json
        $addFields: {
          Owner: {
            $first: "$Owner",
          },
        },
      },
      {
        $sort: {
          [sortBy]: sortType,
        },
      },
    ];
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const result = await Video.aggregatePaginate(
      // Video.aggregate(getAllVideo),
      getAllVideoPipeline,
      options
    );
    if (!result || result?.videos?.length === 0) {
      return new ApiResponse(400, [], "no videos found");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, result, "video fetched succesfully"));
  } catch (error) {
    console.log(error.message);
    return res
      .status(500)
      .json(
        new ApiError(500, {}, "Internal server error in video aggregation")
      );
  }
});

// get video by id
const getVideoById = asyncHandler(async (req, res) => {
  try {
    const { videoId } = req.params;
    // if the video is valid
    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "not a valid video id!!");
    }

    const pipeline = [
      {
        $match: { _id: new mongoose.Types.ObjectId(videoId) }, // match the video by its video id
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "Owner",
          pipeline: [
            {
              $project: {
                id: 1,
                username: 1,
                fullName: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          Owner: { $arrayElemAt: ["$Owner", 0] }, // Add the first owner element
        },
      },
    ];

    const result = await Video.aggregate(pipeline);

    if (!result || result?.length === 0) {
      throw new ApiError(400, "video is not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, result, "video fetched Succesfully"));
  } catch (error) {
    console.log(error.message);
    throw new ApiError(400, "video cannot be fetched!!");
  }
});

// update video controller
// we need to update title, desc, thumbnail
const updateVideo = asyncHandler(async (req, res) => {
  try {
    const { videoId } = req.params;
    const { title, description } = req.body;
    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "not a valid video id");
    }
    if ([title, description].some((item) => item?.trim() === "")) {
      throw new ApiError(400, "input field required");
    }

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(400, "video cannot be found!!");

    // check if the request come from the video owner
    if (!video?.owner?.equals(req?.user?._id)) {
      throw new ApiError(400, "you cannot update the video");
    }

    const thumbnailLocalPath = req.file?.thumbnail[0].path;
    if (!thumbnailLocalPath) {
      throw new ApiError(400, "thumbnail local file cannot be found");
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnail) {
      throw new ApiError(400, "thumbnail not uploaded on cloudinary");
    }

    // delete the old thumbnail
    const oldThumbnailUrl = video?.thumbnail;
    const deleteOldThumbnail = await deleteOnCloudinary(oldThumbnailUrl);

    if (!deleteOldThumbnail) {
      throw new ApiError(400, "thumbnail cannot be deleted");
    }

    video.title = title;
    video.description = description;
    video.thumbnail = thumbnail;
    await video.save();

    return res
      .status(200)
      .json(new ApiResponse(200, video, "Video details updated successfully"));
  } catch (error) {
    console.log(error);
    throw new ApiError(400, "video cannot be updated");
  }
});

// delete video
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  try {
    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "not a valid object id");
    }

    // search video and
    const video = await Video.findByIdAndDelete(videoId);

    return res
      .status(200)
      .json(new ApiResponse(200, "video deleted succesfully"));
  } catch (error) {
    console.log(error);
    throw new ApiError(404, "cannot delete video!!!");
  }
});

// toggle video status
const toggleVideoStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  try {
    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "not a valid object id");
    }

    const video = await Video.findById(videoId);
    if (!video) {
      throw new ApiError(404, "cannot find the video!!");
    }

    video.isPublished = !video.isPublished;
    await video.save();
    res
      .status(200)
      .json(new ApiResponse(200, video, "video status change succesfully"));

  } catch (error) {
    console.log(error);
    throw new ApiError(404, "cannot toggle the video publish status!!");
  }
});

export { uploadVideo, getAllVideos, getVideoById, updateVideo, deleteVideo,toggleVideoStatus };
