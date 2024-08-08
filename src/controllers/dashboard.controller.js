import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { Apiresponse } from "../utils/Apiresponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const Data = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                likes: {
                    $size: "$likes"
                }
            }
        },
        {
            $group: {
                _id: null,
                totalviews: {
                    $sum: "$views"
                },
                totalVideos: {
                    $sum: 1
                },
                totalLikes: {
                    $sum: "$likes"
                }

            }
        },
        {
            $addFields: {
                owner: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "owner",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $addFields: {
                totalsubscribers: {
                    $size: "$subscribers"
                }
            }
        },
        {
            $project: {
                _id: 0,
                owner: 0
            }
        }

    ])

    console.log(Data);

    res.status(200).json(
        new Apiresponse(
            200,
            Data,
            "user channel data fetched sucessfully"
        )
    )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    let { page = 1, limit = 10, sortBy, sorttype } = req.query

    page = isNaN(page) ? 1 : Number(page)
    limit = isNaN(limit) ? 1 : Number(limit)

    if (limit <= 0) {
        limit = 10
    }
    if (page <= 0) {
        page = 1
    }

    const sorting = {}
    if (sortBy && sorttype) {
        sorting["$sort"] = {
            [sortBy]: sorttype === "asc" ? 1 : -1
        }
    } else {
        sorting["$sort"] = {
            createdAt: -1
        }
    }

    const video = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        sorting,
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                viwes: 1,
                duration: 1,
                title: 1
            }
        },
        { $skip: (page - 1) * limit },
        { $limit: limit }
    ])

    res.status(200).json(
        new Apiresponse(
            200,
            video,
            "fetched video sucessfully"
        )
    )

})

export {
    getChannelStats,
    getChannelVideos
}
