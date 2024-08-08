import mongoose, { Mongoose, isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { Apiresponse } from "../utils/Apiresponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    // TODO: toggle subscription
    console.log(channelId);

    if (!channelId || !isValidObjectId(channelId)) {
        throw new ApiError(400, "Channel not found")
    }

    const isSubscribed = await Subscription.findOne({
        subscriber: req.user?._id,
        channel: channelId
    })
    console.log(isSubscribed);

    let isSubscriber

    if (!isSubscribed) {
        await Subscription.create({
            subscriber: req.user?._id,
            channel: channelId
        })
        isSubscriber = true

    } else {
        await Subscription.deleteOne({
            subscriber: req.user?._id,
            channel: channelId
        })
        isSubscriber = false
    }

    const message = isSubscriber ? "You subscribed sucessfully" : "you unsubscribe sucessfully"
    res.
        status(200).
        json(
            new Apiresponse(
                200,
                [],
                message
            )
        )
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if (!channelId || !isValidObjectId(channelId)) {
        throw new ApiError(400, "Channel not found")
    }

    const Subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetail",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]

            }
        },
        {
            $addFields: {
                SubscriberDetail: {
                    $first: "$subscriberDetail"
                }
            }
        }

    ])

    res.
        status(200).
        json(
            new Apiresponse(
                200,
                Subscribers,
                "subscribers fetched sucessfully")
        )


})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if (!channelId || !isValidObjectId(channelId)) {
        throw new ApiError(400, "Not found the user")
    }

    const Channels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "ChannelUserDetail",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                subscribedDetail: {
                    $first: "$ChannelUserDetail"
                }
            }
        }
    ])

    res.status(200).json(
        new Apiresponse(
            200,
            Channels,
            "Subscribed channels list fetched sucessfully"
        )
    )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}
