import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { Like } from "../models/like.model.js"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { Apiresponse } from "../utils/Apiresponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { deletefromCloudinary, uploadOnCloudinary, determineResourceType } from "../utils/cloudinary.js"
import { upload } from "../middlewares/multer.middleware.js"
import { response } from "express"

const getAllVideos = asyncHandler(async (req, res) => {
    let { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query

    // TODO: get all videos based on query, sort, pagination 
    page = isNaN(page) ? 1 : Number(page)
    limit = isNaN(limit) ? 10 : Number(limit)

    if (page <= 0) {
        page = 1
    }
    if (limit <= 0) {
        limit = 10
    }

    function matchStage() {
        if (userId && query) {
            return {
                $match: {
                    $and: [
                        { owner: new mongoose.Types.ObjectId(userId) },
                        {
                            $or: [
                                { title: { $regex: query, $options: 'i' } },
                                { title: { $regex: query, $options: 'i' } }
                            ]
                        }
                    ]
                }
            }
        }
        else if (userId && mongoose.isValidObjectId(userId)) {

            return {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId),

                }
            }
        }
        else if (query) {
            return {
                $match: {
                    $or: [
                        { title: { $regex: query, $options: 'i' } },
                        { description: { $regex: query, $options: 'i' } }
                    ]
                }
            }
        }
        else {
            return {
                $match: {}
            }
        }
    }

    const matchStages = matchStage()

    const joinownerstage = {
        $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
            pipeline: [
                {
                    $project: {
                        username: 1,
                        avatar: 1,
                        fullName: 1
                    }
                }
            ]
        }
    }

    const addfieldstage = {
        $addFields: {
            owner: {
                $first: "$owner"
            }
        }
    }

    function sortstage() {
        if (sortBy && sortType) {
            return {
                $sort: {
                    [sortBy]: sortType === "asc" ? 1 : -1
                }
            }
        }
        else {
            return {
                $sort: {
                    createdAt: -1
                }
            }
        }
    }

    const sortstages = sortstage()

    const skipstage = {
        $skip: (page - 1) * limit
    }

    const limitstage = {
        $limit: limit
    }

    const Videos = await Video.aggregate([
        matchStages,
        joinownerstage,
        addfieldstage,
        sortstages,
        skipstage,
        limitstage
    ])

    if (!Videos?.length) {
        throw new Apiresponse(404, " NO videos of users  found matching ")
    }

    return res
        .status(200)
        .json(
            new Apiresponse(
                200,
                Videos,
                "Video fetched sucessfullly based on the query or userId"
            )
        )

})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    // TODO: get video, upload to cloudinary, create video

    if ([title, description].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "field not given completely and correctly")
    }
    let Videofile;

    if (req.files && Array.isArray(req.files.videoFile) && req.files.videoFile.length > 0) {
        Videofile = req.files.videoFile[0].path

        const filetypeVideo = determineResourceType(Videofile)
        console.log(filetypeVideo);

        if (!(filetypeVideo == "video")) {
            throw new ApiError(400, `only image is allowed your filetype is ${filetype} `)
        }

    }
    const thumbnails = req.files?.thumbnail[0]?.path
    const filetype = determineResourceType(thumbnails)
    console.log(filetype);

    if (!(filetype == "image")) {
        throw new ApiError(400, `only image is allowed your filetype is ${filetype} `)
    }
    if (!thumbnails) {
        throw new ApiError(400, "Thumbnail is required for Videofile")
    }

    const VideofilePath = await uploadOnCloudinary(Videofile)
    const thumbnailPath = await uploadOnCloudinary(thumbnails)

    if (!(thumbnailPath || VideofilePath)) {
        throw new ApiError(400, "Thumbnail is required")
    }

    const video = await Video.create({
        videoFile: VideofilePath?.url,
        thumbnail: thumbnailPath?.url,
        title: title.trim(),
        description: description.trim(),
        duration: Math.round(VideofilePath.duration),
        owner: req.user?._id
    })

    if (!video) {
        await deletefromCloudinary(VideofilePath.url)
        await deletefromCloudinary(thumbnailPath.url)
        throw new ApiError(500, "Something went wrong")
    }

    res
        .status(201)
        .json(
            new Apiresponse(
                201,
                video,
                "Upload Video sucessfully "
            ))
})

const getVideoById = asyncHandler(async (req, res) => {
    let { videoId } = req.params
    //TODO: get video by id 

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(404, "video id not found")

    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
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
                            username: 1,
                            avatar: 1,
                            fullName: 1
                        }
                    }
                ]
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
                owner: {
                    $first: "$owner"
                },
                likes: {
                    $size: "$likes"
                },
                views: {
                    $add: [1, "$views"]
                }
            }
        },

    ])

    console.log(video);
    console.log(video[0].views);

    const updateviews = await Video.findByIdAndUpdate(videoId, {
        $set: {
            views: video[0].views
        }
    })

    console.log(updateviews.views);
    console.log(updateviews);

    if (req.user) {
        await User.findByIdAndUpdate(
            req.user?._id,
            {
                $addToSet: {
                    watchHistory: videoId
                }
            }
        )
    }
    res.status(200).json(new Apiresponse(200, video[0], "video fetched sucessfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(404, "Video not found or valid")
    }

    let video = await Video.findById(videoId)
    console.log(video);

    if (!video) {
        throw new ApiError(400, "video not found ")
    }

    if (video.owner?.toString() !== req.user?._id?.toString()) {
        throw new ApiError(404, "You cannot update the video")
    }

    const { title, description } = req.body

    const newthumbnail = req.file?.path
    const filetype = determineResourceType(newthumbnail)
    console.log(filetype);

    if (!(filetype == "image")) {
        throw new ApiError(400, `only image is allowed your filetype is ${filetype} `)
    }
    console.log(newthumbnail);

    if (!newthumbnail) {
        console.log("didn't find the new video file ");
    }
    let newthumbnailpath;

    if (newthumbnail) {
        try {
            newthumbnailpath = await uploadOnCloudinary(newthumbnail)
            console.log(newthumbnailpath.url);
            if (!newthumbnailpath || !newthumbnailpath.url) {
                throw new ApiError(500, "Thumbnail not uploaded to cloudinary");
            }

        } catch (error) {
            throw new ApiError(500, error, "Error uploading thumbnail to cloudinary");
        }

    }

    const updatedVideoData = await Video.findByIdAndUpdate(videoId, {
        $set: {
            title: title?.trim(),
            description: description?.trim(),
            thumbnail: newthumbnailpath?.url
        }

    }, { new: true })

    if (updatedVideoData) {
        try {
            console.log(updatedVideoData, "updatededVideodata");
            console.log(video.thumbnail);

            const oldVideo = await deletefromCloudinary(video.thumbnail)

            if (!oldVideo || oldVideo.result !== "ok") {
                console.log("image not ");
                throw new ApiError(401, "Image not deleted from cloudinary")
            }

        } catch (error) {
            console.error("Error deleting old thumbnail from cloudinary", error);
        }

    }
    if (!updatedVideoData) {
        console.log("not updatedVideoDAta");
        await deletefromCloudinary(newthumbnailpath.url)
        throw new ApiError(500, "Video not updated ")
    }
    res
        .status(200)
        .json(new
            Apiresponse(
                200,
                updatedVideoData,
                "User video updated sucessfully"
            ))

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "don't get VideoId")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(400, "Video not found in database")
    }

    if (video.owner?.toString() !== req.user?._id?.toString()) {
        throw new ApiError(404, "You cannot delete the video")
    }

    const { _id, thumbnail, videoFile } = video

    const delresponse = await Video.findByIdAndDelete(_id)
    if (delresponse) {
        await Promise.all([
            Like.deleteMany({ video: _id }),
            Comment.deleteMany({ video: _id }),
            deletefromCloudinary(thumbnail),
            deletefromCloudinary(videoFile)
        ])
    } else {
        throw new ApiError(500, "eroro in deleting the video")
    }
    res.status(200).json(new Apiresponse(200, {}, "vido deleted sucesssully"))

})

const togglePublishStatus = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    if (!videoId && !isValidObjectId(videoId)) {
        throw new ApiError(400, " VideoId not found ")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(400, "Video not found ")
    }
    video.isPublished = !(video.isPublished)

    await video.save()

    res
        .status(200)
        .json(
            new Apiresponse(
                200,
                video,
                "Video toggled sucessfully"

            ))


})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}


