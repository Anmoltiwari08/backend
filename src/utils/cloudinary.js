import { v2 as cloudinary } from "cloudinary"
import fs from "fs"
// import {extractPublicId} from "cloudinary-build-url";
import { ApiError } from "./ApiError.js";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilepath) => {
    try {
        if (!localFilepath) {
            return null
        }
        // upload the file on cloudinary
        // const resourceType = determineResourceType(url);

        const response = await cloudinary.uploader.upload(localFilepath, {
            resource_type: "auto"
        })

        // file has been uploaded successfuly
        // console.log("file is uploaded on cloudinary",
        //     response.url
        // )
        fs.unlinkSync(localFilepath)
        return response;

    }

    catch (error) {
        fs.unlinkSync(localFilepath)  //remove the locally saved temporary file as the upload operation got failed 
        return null;
        // console.log( "error is ",error);

    }
}

const extractPublicId = (url) => {
    const Urlparts = url.split('/')
    const fileName = Urlparts[Urlparts.length - 1]
    const publicIDwithExtension = fileName.split('.')[0]
    return publicIDwithExtension
}

const deletefromCloudinary = async (url) => {
    try {
        if (!url) {
            return null
        }
        let PublicID = extractPublicId(url)
        console.log(PublicID);

        const resourceType = determineResourceType(url);

        const response = await cloudinary.uploader.destroy(PublicID, {
            resource_type: resourceType
        })
        console.log(response);

        if (response.result !== "ok") {
            throw new ApiError(400, "Failed to delete image from cloudinary")
        }

        return response
    } catch (error) {

        console.log(error);
        throw new ApiError(400, error?.message || "Error during deleting image")
    }
}

const determineResourceType = (url) => {
    const extension = url.split('.').pop().toLowerCase();
    switch (extension) {
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
            return 'image';
        case 'mp4':
        case 'avi':
        case 'mkv':
            return 'video';
        default:
            return 'raw'; // or handle other types as needed
    }
}

export { uploadOnCloudinary, deletefromCloudinary,determineResourceType }

