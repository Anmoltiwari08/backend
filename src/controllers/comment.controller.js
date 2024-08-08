import mongoose, { isValidObjectId } from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { Apiresponse } from "../utils/Apiresponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params
    let { page = 1, limit = 10 } = req.query

    page = isNaN(page) ? 1 : Number(page)
    limit = isNaN(limit) ? 10 : Number(limit)

    if (page <= 0) {
        page = 1
    }
    if (limit <= 0) {
        limit = 10
    }

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "VideoId not found")
    }

    const comments = await Comment.aggregate([
        {
            $match: {
                videos: new mongoose.Types.ObjectId(videoId)

            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "asowner",
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
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "commentLikes"
            }
        },
        {
            $addFields: {
                commentowner: {
                     $first: "$asowner"
                },
                likes: {
                    $size: "$commentLikes"
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

    res.
        status(200).
        json(
            new Apiresponse(
                200,
                comments,
                "comments fetched sucessfully along with likes "
            )
        )

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "video not found")
    }

    const { content } = req.body

    if (!content) {
        throw new ApiError(400, "content not found")

    }
    const addComment = await Comment.create({
        content: content?.trim(),
        videos: videoId,
        owner: req.user?._id
    })

    if (!addComment) {
        throw new ApiError(500, "Internal server error")
    }

    res.status(200).json(
        new Apiresponse(
            200,
            addComment,
            "comment added sucessfully"
        )
    )
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params
    if (!commentId || !isValidObjectId(commentId)) {
        throw new ApiError(400, "comment not found")
    }


    const { content } = req.body

    if (!content.trim()) {
        throw new ApiError(400, "content not found")

    }

    const comment = await Comment.findById(commentId)

    if (comment.owner?.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "you are not owner of this comment ")
    }
    
    const updateComment = await Comment.findByIdAndUpdate(commentId,
        {
            $set: {
                content: content?.trim()
            }
        }, { new: true }
    )

    if (!updateComment) {
        throw new ApiError(500, "Internal server error")
    }

    res.status(200).json(
        new Apiresponse(
            200,
            updateComment,
            "Comment updated sucessfully"
        )
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params
    if (!commentId || !isValidObjectId(commentId)) {
        throw new ApiError(400, "comment not found")
    }
    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new ApiError(400, "comment not found ")
    }

    if (comment.owner?.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "you are not owner of this comment ")
    }

    const deletedcomment = await Comment.findByIdAndDelete(commentId)

    if (!deleteComment) {
        throw new ApiError(500, "Comment not deleted ")
    }
    res.status(200).json(
        new Apiresponse(
            200,
            [],
            "Comment deleted sucessfully"
        )
    )

})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
} 