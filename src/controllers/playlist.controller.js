import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { Apiresponse } from "../utils/Apiresponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body
    //TODO: create playlist
    if (!name?.trim()) {
        throw new ApiError(400, "Name is required")
    }
  

    const Playlists = await Playlist.create({
        name: name?.trim(),
        description: description?.trim(),
        owner: req.user?._id
    })

    if (!Playlists) {
        throw new ApiError(500, "Something went wrong while creating playlist")
    }

    res.
        status(200).
        json(
            new Apiresponse(
                200,
                Playlists,
                "Playlist created sucessfully"
            )
        )

})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params
    //TODO: get user playlist
    if (!userId || !isValidObjectId(userId)) {
        throw new ApiError(400, " not found")
    }

    const allPlaylists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                name: 1,
                dsscription: 1
            }
        }
    ])

    res.status(200).json(new Apiresponse(200, allPlaylists, "Playlists fetched sucessfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    //TODO: get playlist by id

      const Playlists = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)

            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "Videoowner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        fullName: 1
                                    }
                                }
                            ]
                        },

                    },
                    {
                        $addFields: {
                            Videoowner: {
                                $first: "$Videoowner"
                            }
                        }
                    },
                    {
                        $project: {
                            thumbnail: 1,
                            title: 1,
                            duration: 1,
                            views: 1,
                            Videoowner: 1

                        }
                    }

                ]
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
                            username: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                }
            }
        }

    ])

    if (!Playlists.length > 0) {
        throw new ApiError(500, "Internal server errro")
    }

    res.
        status(201).
        json(
            new Apiresponse(
                200,
                Playlists[0],
                "Playlist fetched sucessfully"
            )
        )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { videoId, playlistId } = req.params
    if (!playlistId || !videoId || !isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Not valid Id")
    }
  
    const video = await Video.findById(videoId)

    const playlist = await Playlist.findById(playlistId)

    if (playlist?.owner?.toString() !== req.user?._id?.toString()) {
        throw new ApiError(200, "you are not owner of this playlist")
    }

    const isExist = playlist.videos.findIndex(v => v.toString() === video._id?.toString())
    if (isExist !== -1) {
        throw new ApiError(400, "This video is already found in playlist")
    }
    playlist.videos.push(videoId)
    await playlist.save()

    res.
        status(200).
        json(
            new Apiresponse(
                200,
                playlist,
                "Videos addd sucessfully in playlist"
            )
        )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { videoId , playlistId } = req.params

    // TODO: remove video from playlist
    if (!(playlistId || videoId) || !isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Not valid Id")
    }

    const video = await Video.findById(videoId)

    const playlist = await Playlist.findById(playlistId)

    

    if (playlist?.owner?.toString() !== req.user?._id?.toString()) {
        throw new ApiError(200, "you are not owner of this playlist")
    }

    playlist.videos = playlist.videos.filter(v => v.toString() !== videoId.trim())
    
    await playlist.save()

    res.
        status(200).
        json(
            new Apiresponse(
                200,
                [],
                "videoremovedsucessfully"
            )
        )
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    // TODO: delete playlist
    if (!playlistId || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "NOt found")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "not found")
    }

    if (playlist.owner?.toString() !== req.user?._id?.toString()) {
        throw new ApiError(401, "You cannot delete this playlist");
    }

    await Playlist.findByIdAndDelete(playlistId)
    res.status(200).json(
        new Apiresponse(
            200,
            [],
            "playlist deleted sucessfully"
        )
    )

})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body
    //TODO: update playlist

    if (!playlistId || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "NOt found")
    }

    if (!name.trim() || !description.trim()) {
        throw new ApiError(400, " requred name or description")
    }

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "not found")
    }

    if (playlist.owner?.toString() !== req.user?._id?.toString()) {
        throw new ApiError(401, "You cannot delete this playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId, {
        $set: {
            name: name?.trim(),
            discription: description?.trim()
        }
    }, { new: true }
    )

    res.status(200).json(
        new Apiresponse(
            200,
            updatedPlaylist,
            "Playlist updated sucessfully"
        )
    )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
