var express = require("express")
var router = express.Router()

// API's path
var authRoute = require("./auth/routes")
var usersRoute = require("./users/routes")
var projectRoute = require("./project/routes")
var imageRoutes = require("./image/routes")
var labelRoutes = require("./label/routes")

// Routes
// -> /api/auth/
router.use("/api/v1/auth", authRoute)
router.use("/api/v1/users", usersRoute)
router.use("/api/v1/project", projectRoute)
router.use("/api/v1/image", imageRoutes)
router.use("/api/v1/label", labelRoutes)

module.exports = router
