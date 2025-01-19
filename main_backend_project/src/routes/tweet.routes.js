import { Router } from "express";
import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createTweet,
  getUserTweet,
  updateTweet,
  deleteTweet,
} from "../controllers/tweet.controller.js";

const router = Router();
const app = express();

app.use(verifyJWT);

router.route("/post-tweet").post(verifyJWT, createTweet);

router.route("/:userId").get(getUserTweet);

router
  .route("/:tweetId")
  .patch(verifyJWT, updateTweet)
  .delete(verifyJWT, deleteTweet);

export default router;
