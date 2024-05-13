"use strict"

const db = require.main.require("./src/database")
const meta = require.main.require("./src/meta")
const user = require.main.require("./src/user")

const routes = require("./routes")

const baseLayers = {
    osm: {
        name: "osm",
        title: "OpenStreetMap",
        url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        zIndex: 40,
    },
    otm: {
        name: "otm",
        title: "OpenTopoMap",
        url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        attribution:
            'Carte: © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Style: © <a href="https://opentopomap.org/">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
        zIndex: 30,
    },
    ign: {
        name: "ign",
        title: "Plan IGN",
        url: "https://data.geopf.fr/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
        attribution: '© <a href="https://geoservices.ign.fr/">IGN/Geoplateforme</a>',
        zIndex: 20,
    },
    sat: {
        name: "sat",
        title: "Photos aériennes IGN",
        url: "https://data.geopf.fr/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
        attribution: '© <a href="https://geoservices.ign.fr/">IGN/Geoplateforme</a>',
        zIndex: 10,
    },
}

const plugin = {
    _settings: {},
    _defaults: {
        baseLayer: "osm",
    },
}

async function renderMap(req, res) {
    const uids = await db.getSetMembers("osmMap.users")
    let users = await user.getUsersWithFields(uids, ["username", "userslug", "picture", "locationDetails", "status"], req.uid)
    users = users.filter(user => user.locationDetails)
    res.render("map", { settings: plugin._settings, users, title: "[[members-map:members-map]]" })
}

plugin.init = async (params, done) => {
    await routes.init(params)

    meta.settings.get("members-map", (err, settings) => {
        if (err) {
            console.log(`members-map: failed to retrieve settings ${err.message}`)
        }
        Object.assign(plugin._settings, plugin._defaults, settings)
    })
    done()
}

plugin.addAdminNav = function (header, done) {
    header.plugins.push({
        route: "/plugins/members-map",
        icon: "fa-map",
        name: "[[members-map:members-map]]",
    })

    done(null, header)
}

plugin.getNavigation = function (core, done) {
    core.push({
        route: "/map",
        title: "\\[\\[members-map:map\\]\\]",
        enabled: false,
        iconClass: "fa-map",
        textClass: "visible-xs-inline",
        text: "\\[\\[members-map:map\\]\\]",
        properties: {},
        core: false,
    })
    done(null, core)
}

plugin.whitelistFields = function (hookData, done) {
    hookData.whitelist.push("locationDetails")
    done(null, hookData)
}

plugin.addLocationDetails = function (profile, done) {
    let lon = ""
    let lat = ""
    async function setLonLat() {
        profile.data.locationLon = lon
        profile.data.locationLat = lat
        profile.fields.push("locationLon")
        profile.fields.push("locationLat")

        await (!!lat && !!lon ? db.setAdd : db.setRemove)("osmMap.users", profile.data.uid)
    }

    if (profile.data.location && profile.data.location !== "") {
        const mapboxClient = new mapbox(osmMap._settings.mapboxAccessToken)
        mapboxClient
            .geocodeForward(profile.data.location, { limit: 1 })
            .then(res => {
                const data = res.entity
                if (data.features) {
                    lon = String(data.features[0].center[0])
                    lat = String(data.features[0].center[1])
                }
                setLonLat()
                callback(null, profile)
            })
            .catch(err => {
                console.log(`catch: ${err}`)
                callback(null, profile)
            })
    } else {
        setLonLat()
        callback(null, profile)
    }
}

plugin.initApiRoutes = routes.initApiRoutes

plugin.hooks = require("./hooks")

module.exports = plugin
