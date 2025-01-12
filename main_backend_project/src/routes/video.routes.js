import { Router } from "express";
import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getAllVideos, uploadVideo } from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
const app = express();
const router = Router();

app.use(verifyJWT);

router.route("/upload-Video").post(
  verifyJWT,
  upload.fields([
    {
      name: "videoFile",
      maxcount: 1,
    },
    {
      name: "thumbnail",
      maxcount: 1,
    },
  ]),

  uploadVideo
);

router.route("/get-videos").get(getAllVideos);

export default router;
