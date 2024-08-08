import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { Like } from "../models/like.model.js"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { Apiresponse } from "../utils/Apiresponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body

    if (!content.trim()) {
        throw new ApiError(400, "content not found for tweet")
    }

    const tweet = await Tweet.create({
        content: content?.trim(),
        owner: req.user?._id
    })

    if (!tweet) {
        throw new ApiError(500, "Internal server Error")
    }

    res.
        status(200).
        json(
            new Apiresponse(
                200,
                tweet,
                "tweet created sucessfully")
        )

})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    let { page = 1, limit = 10, userId } = req.params

    page = isNaN(page) ? 1 : Number(page);
    limit = isNaN(limit) ? 10 : Number(limit);
    if (page <= 0) {
        page = 1;
    }
    if (limit <= 0) {
        page = 10;
    }

    if (!userId || !isValidObjectId(userId)) {
        throw new ApiError(400, "userId not found")
    }

    const Tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            fullName: 1,
                            username: 1,
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "Tweet",
                as: "comments"
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                },
                likes: {
                    $first: "$likes"
                },
                comments: {
                    $first: "$comments"
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $skip: (page - 1) * limit
        },
        {
            $limit: limit
        }
    ])

        res
        .status(200)
        .json(new Apiresponse(
            200,
            Tweets,
            "Tweets fetched Sucessfully"
        ))
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { tweetId } = req.params

    if (!tweetId || !isValidObjectId(tweetId)) {
        throw new ApiError(400, "ID not found or not valid ")
    }
    const { content } = req.body

    if (!content.trim()) {
        throw new ApiError(400, " content not found")
    }

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new ApiError(404, "tweet not found in database")
    }

    if (tweet.owner?.toString() !== req.user?._id?.toString()) {
        throw new ApiError(404, "You cannot delete the video")
    }

    const updateTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content: content?.trim()
            }
        },
        { new: true }
    )

    res.
        status(201).
        json(
            new Apiresponse(
                200,
                updateTweet,
                "Tweet Updated sucessfully")
        )
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params
    console.log(tweetId);
    console.log(isValidObjectId(tweetId));

    if (!tweetId || !isValidObjectId(tweetId)) {
        throw new ApiError(400, "tweetId not found")
    }

    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, "tweet not found in database")
    }

    if (tweet.owner?.toString() !== req.user?._id?.toString()) {
        throw new ApiError(404, "You cannot delete the video")
    }

    const deleteresponse = await Tweet.findByIdAndDelete(tweetId)
    if (deleteresponse) {
        await Promise.all([
            Like.deleteMany(tweet._id),
            Comment.deleteMany(tweet._id)
        ])
    }
    res.
        status(200).
        json(
            new Apiresponse(
                200,
                [],
                "tweet deleted sucessfully")
        )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
