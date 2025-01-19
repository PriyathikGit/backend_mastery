import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "16kb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "16kb",
  })
);

app.use(express.static("public"));

app.use(cookieParser());

// routes

import userRouter from "./routes/user.routes.js";

// routes declaration
// all users related routes
app.use("/api/v1/users", userRouter); // end point example : http://localhost:8000/api/v1/users/register

// video routes
import videoRouter from "./routes/video.routes.js";

app.use("/api/v1/videos", videoRouter);

// tweet routes
import twitterRouter from "./routes/tweet.routes.js";

app.use("/api/v1/tweet", twitterRouter);

export { app };
