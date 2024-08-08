import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { Apiresponse } from "../utils/Apiresponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    //TODO: toggle like on video
    if (!tweetId || !isValidObjectId(tweetId)) {
        throw new ApiError(400, "video not found")
    }

    const IsVideoLiked = await Like.findOne(
        {
            video: tweetId,
            likedBy: req.user?._id
        }
    )
    let isLiked;

    if (!IsVideoLiked) {
        await Like.create({
            video: tweetId,
            likedBy: req.user?._id
        })
        isLiked = true
    } else {
        await Like.deleteOne({
            video: tweetId,
            likedBy: req.user?._id
        })
        isLiked = false
    }

    let message = isLiked ? "Your Liked Video sucessfully" : "You disliked Video sucessfully"


    res.status(200).json(
        new Apiresponse(
            200,
            [],
            message
        )
    )


})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    //TODO: toggle like on comment
    if (!tweetId || !isValidObjectId(tweetId)) {
        throw new ApiError(400, " comment not found")
    }

    const isCommentLiked = await Like.findOne(
        {
            comment: tweetId,
            likedBy: req.user?._id
        }
    )
    let isLiked;

    if (!isCommentLiked) {
        await Like.create({
            comment: tweetId,
            likedBy: req.user?._id
        })
        isLiked = true
    } else {
        await Like.deleteOne({
            comment: tweetId,
            likedBy: req.user?._id
        })
        isLiked = false
    }

    let message = isLiked ? "Your Liked Comment sucessfully" : "You disliked Comment sucessfully"


    res.status(200).json(
        new Apiresponse(
            200,
            [],
            message
        )
    )
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    //TODO: toggle like on tweet

    if (!tweetId || !isValidObjectId(tweetId)) {
        throw new ApiError(400, " tweet not found")
    }
    const isTweetLiked = await Like.findOne(
        {
            tweet: tweetId,
            likedBy: req.user?._id
        }
    )
    let isLiked;

    if (!isTweetLiked) {
        await Like.create({
            tweet: tweetId,
            likedBy: req.user?._id
        })
        isLiked = true
    } else {
        await Like.deleteOne({
            tweet: tweetId,
            likedBy: req.user?._id
        })
        isLiked = false
    }

    let message = isLiked ? "Your Liked tweet sucessfully" : "You disliked tweet sucessfully"


    res.status(200).json(
        new Apiresponse(
            200,
            [],
            message
        )
    )
}
)

const getLikedVideos = asyncHandler(async (req, res) => {   
    //TODO: get all liked videos
    const LikedVideos = await Like.aggregate([
        {
            $match: {
                $and: [
                    { likedBy: new mongoose.Types.ObjectId(req.user?._id) },
                    {
                        video: {
                            $exists: true
                        }
                    }
                ]

            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videosliked",
                pipeline: [
                    {
                        $project: {
                            videoFile: 1,
                            thumbnail: 1,
                            title: 1,
                            views: 1,
                            duration: 1,
                            description: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                videos: {
                    $first: "$videosliked"
                }
            }
        }
        ,
        {
            $replaceRoot: {
                newRoot: {  
                    $arrayElemAt: ["$videosliked",0]
                    
                }
            }
        }

    ])
    res.status(200).json(
        new Apiresponse(
            200,
            LikedVideos,
            "fetched videos sucessfully"
        )
    )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}
