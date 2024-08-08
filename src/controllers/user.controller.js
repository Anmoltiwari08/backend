import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { uploadOnCloudinary, deletefromCloudinary } from "../utils/cloudinary.js";
import { upload } from "../middlewares/multer.middleware.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { response } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessTokenandRefreshToken = async (userId) => {
    //    console.log(userId);
    try {
        const user = await User.findOne(userId)

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        // console.log(accessToken);
        // console.log(refreshToken);

        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        // console.log(error);
        throw new ApiError(500, "Something went Wrong")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not  empty
    // check if user already exist : username ,email
    // check for images ,check for avatar 
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response 
    // check for user creation 
    // return response 

    const { fullName, email, username, password } = req.body
    // console.log("email:", email);
    // console.log("fullName:",fullName);
    // if (fullName==="") {
    //     throw new ApiError(400,"fullname is required") 

    // }
    //   console.log(req.body);

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "fullname is required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }


    const avatarLocalPath = req.files?.avatar[0]?.path
    let coverImageLocalPath;

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is necessary")
    }
    //  console.log(avatarLocalPath);

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    // console.log(avatar);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        await deletefromCloudinary(avatar.url)
        await deletefromCloudinary(coverImage.url)
        throw new ApiError(500, "Something went wrong while registering ")
    }

    return res.status(201).json(
        new Apiresponse(200, createdUser, "User registered Successfully ")
    )

})

const loginUser = asyncHandler(async (req, res) => {
    // req body ->= data
    // username or email validate
    // find the user from database
    //password check
    // if password nice then give refresh and acess token 
    // send cookie

    const { username, email, password, } = req.body
    // console.log(username);
    // console.log(email);

    if (!(username || email)) {
        throw new ApiError(400, "Username or email is required")
    }

    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (!existedUser) {
        throw new ApiError(404, "user  not found")
    }

    const isPasswordValid = await existedUser.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(404, "Invalid User credentials")
    }
    // console.log(existedUser._id);
    const { accessToken, refreshToken } = await generateAccessTokenandRefreshToken(existedUser._id)

    const loggedInUser = await User.findById(existedUser._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.
        status(200).
        cookie("accessToken", accessToken, options).
        cookie("refreshToken", refreshToken, options).
        json(
            new Apiresponse(
                200,
                {
                    user: loggedInUser, refreshToken, accessToken
                },
                "User logged In sucessfully"
            )
        )

})

const logOutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            // $set: {
            //     refreshToken: undefined
            // }

            $unset: {
                refreshToken: 1 // this removes thr field from document 
            }

        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    // return res
    // .status(200)
    // .clearCookie("accessToken",accessToken,options)
    // .clearCookie("refreshToken",refreshToken,options)
    // .json( new ApiError(200,{},"User logged Out"))

    // Clear cookies
    res.clearCookie("accessToken", options);
    res.clearCookie("refreshToken", options);

    // Send response
    return res.status(200).json(new Apiresponse(200, {}, "User logged out"));

})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodeedRefreshToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodeedRefreshToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, refreshToken } = await generateAccessTokenandRefreshToken(user._id)

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new Apiresponse(
                    200,
                    { accessToken, refreshToken: refreshToken },
                    "Acess token refreshed "
                )
            )

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh Token")


    }
})

const ChangePassword = asyncHandler(async (req, res) => {

    const { oldPassword, NewPassword } = req.body

    const user = await User.findById(req.user?._id)

    const passwordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!passwordCorrect) {
        throw new ApiError(401, "password not match with old password ")
    }

    user.password = NewPassword

    await user.save({ validateBeforeSave: false })

    return res.status(200)
        .json(
            new Apiresponse(
                200,
                {},
                " User password changed sucessfully"

            )
        )

})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new Apiresponse(
            200,
            req.user,
            "User fetched sucessfully"
        ))
})

const updateAccountDetails = asyncHandler(async (req, res) => {

    const { fullName, email } = req.body
    if (!(fullName || email)) {
        throw new ApiError(401, "something is missing ")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(
            new Apiresponse(200, user, "account details updated sucessfully ")
        )

})

const updateUserAvatar = asyncHandler(async (req, res) => {

    const avatarpath = req.file?.path

    if (!avatarpath) {
        throw new ApiError(401, "Image file not found")
    }

    const OldImageCloudinary = await User.findOne({ "_id": req.user?._id })

    // console.log(OldImageCloudinary);
    // console.log(OldImageCloudinary.avatar);

    if (!OldImageCloudinary.avatar) {
        throw new ApiError(401, "Old Avatar not found in databse")
    }


    // todo delete old image - assignment 

    const avatar = await uploadOnCloudinary(avatarpath)
    // console.log(avatar);

    if (!avatar.url) {
        throw new ApiError(401, " Path not found")
    }

    const user = await User.findByIdAndUpdate(
        req.user?.id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")

    const oldAvatarImage = await deletefromCloudinary(OldImageCloudinary.avatar)

    console.log(oldAvatarImage, "Image deleted sucessfully");

    if (!oldAvatarImage || oldAvatarImage.result !== "ok") {
        throw new ApiError(401, "Image not deleted from cloudinary")
    }

    return res.status(200).json(
        new Apiresponse(200, user, "Avatar image updated sucessfully")
    )
})

const updateCoverImage = asyncHandler(async (req, res) => {

    const coverImagePath = req.file?.path

    if (!coverImagePath) {
        throw new ApiError(401, "Image file not found")
    }

    const OldImageCloudinaryCoverImage = await User.findOne({ "_id": req.user?._id })

    console.log(OldImageCloudinaryCoverImage);
    console.log(OldImageCloudinaryCoverImage.avatar);

    if (!OldImageCloudinaryCoverImage.avatar) {
        throw new ApiError(401, "Old CoverImage not found in databse")
    }

    const oldCoverImage = await deletefromCloudinary(OldImageCloudinaryCoverImage.avatar)

    console.log(oldCoverImage, "Image deleted sucessfully");

    if (!oldCoverImage || oldCoverImage.result !== "ok") {
        throw new ApiError(401, "Image not deleted from cloudinary")
    }

    // todo delete old image - assignment 

    const coverImage = await uploadOnCloudinary(coverImagePath)

    if (!coverImage.url) {
        throw new ApiError(401, " Path not found")
    }

    const user = await User.findByIdAndUpdate(
        req.user?.id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    )
    return res.status(200).json(
        new Apiresponse(200, user, " CoverImage updated sucessfully")

    )
})

const getUserProfile = asyncHandler(async (req, res) => {
    const { username } = req.params

    //    console.log(req.params);

    if (!username?.trim()) {
        throw new ApiError(401, "username not found")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()

            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        }, 
        {      
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            },
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscriberCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscriberCount: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
                isSubscribed: 1
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exist ")
    }
    return res.status(200).json(
        new Apiresponse(
            200,
            channel[0],
            "user channel fetched sucessfully"
        )
    )

})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,

                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",

                            }
                        }
                    }
                ]
            }
        }
    ]

    )

    return res
        .status(200)
        .json(
            new Apiresponse(
                200,
                user[0].watchHistory,
                "Watch history fetched sucessfully"
            )
        )

}) 

export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    ChangePassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateCoverImage,
    getUserProfile,
    getWatchHistory
}
