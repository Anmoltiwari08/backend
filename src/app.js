import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())

//routes import
import userrouter from './router/user.routes.js'
import videorouter from './router/video.routes.js'
import tweet       from './router/tweet.routes.js'
import subscription from './router/subscription.routes.js'
import playlist       from './router/playlist.routes.js'
import like         from './router/like.routes.js' 
import healthcheck from './router/healthcheck.routes.js'
import dashboard   from './router/dashboard.routes.js'
import comment     from './router/comment.routes.js'

// routes decleration
app.use("/api/v1/users",  userrouter)
app.use("/api/v1/videos", videorouter)
app.use("/api/v1/tweet", tweet)
app.use("/api/v1/subscription", subscription)
app.use("/api/v1/playlist", playlist)
app.use("/api/v1/like", like) 
app.use("/api/v1/healthcheck", healthcheck)
app.use("/api/v1/dashboard", dashboard)
app.use("/api/v1/comment", comment)

// http://localhost:8000/api/v1/users/register

export { app }

