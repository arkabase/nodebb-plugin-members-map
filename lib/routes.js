"use strict"

const helpers = require.main.require("./src/routes/helpers")

const Routes = {}

Routes.init = async ({ router }) => {
    const middlewares = [params.middleware.exposeUid, params.middleware.canViewUsers]

    helpers.setupAdminPageRoute(router, "/admin/plugins/membership", (req, res) =>
        res.render("admin/plugins/membership", { title: "[[membership:membership]]" })
    )

    helpers.setupPageRoute(router, "/map", renderMap)

    helpers.setupPageRoute(router, "/user/:userslug/friends", middlewares, controllers.getFriends)
}

Routes.initApiRoutes = async ({ router, middleware, helpers }) => {}

module.exports = Routes
