import { Router } from "express";
import {
    ChangePassword,
    getCurrentUser,
    getUserProfile,
    getWatchHistory,
    logOutUser,
    loginUser,
    refreshAccessToken,
    registerUser,
    updateAccountDetails,
    updateCoverImage,
    updateUserAvatar
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()
router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)

router.route("/logout").post(verifyJWT, logOutUser)

router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT,ChangePassword)
router.route("/current-user").get(verifyJWT,getCurrentUser)
router.route("/update-details").patch(verifyJWT,updateAccountDetails)
router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)
router.route("/coverImage").patch(verifyJWT,upload.single("coverImage"),updateCoverImage)
router.route("/c/:username").get(verifyJWT,getUserProfile)
router.route("/history").get(verifyJWT,getWatchHistory)

export default router 