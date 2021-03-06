/*
 *  Copyright 2012 Research In Motion Limited.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var request = require('request'),
    express = require('express'),
    url = require('url'),
    colors = require('colors'),
    cors = require('connect-xcors'),
    server = require('ripple/server'),
    conf = require('ripple/server/conf');

colors.mode = "console";

// TODO: Yes, we know. The API token is a joke.
function authenticated(key) {
    return key === "ABC";
}

function contentIsXML(contentType) {
    return !!(contentType && contentType.match(/xml/));
}

function getUserAgent(req, proxyReqHeaders) {
    var userAgent;

    if (proxyReqHeaders["x-ripple-user-agent"]) {
        userAgent = proxyReqHeaders["x-ripple-user-agent"];
        delete proxyReqHeaders["x-ripple-user-agent"];
    } else if (req.query.ripple_user_agent) {
        userAgent = unescape(req.query.ripple_user_agent);
    } else {
        userAgent = proxyReqHeaders["user-agent"];
    }

    return userAgent;
}

function proxy(req, res, callback) {
    var parsedURL = url.parse(unescape(req.query.tinyhippos_rurl)),
        proxyReqData,
        proxyReqHeaders;

    if (authenticated(req.query.tinyhippos_apikey)) {
        console.log("INFO:".green + " Proxying cross origin XMLHttpRequest - " + parsedURL.href);

        proxyReqHeaders = Object.keys(req.headers).reduce(function (headers, key) {
            if (key !== "origin") {
                headers[key] = req.headers[key];
            }
            return headers;
        }, {});

        proxyReqHeaders["host"] = parsedURL.host;

        proxyReqHeaders["user-agent"] = getUserAgent(req, proxyReqHeaders);

        // HACK: Makes https://google.com crash (issue with node? request? us?)
        delete proxyReqHeaders["accept-encoding"];

        proxyReqData = {
            url: parsedURL,
            method: req.method,
            headers: proxyReqHeaders
        };

        if (Object.keys(req.body).length > 0) {
            proxyReqData.form = req.body;
        }

        request(proxyReqData, function (error, response, body) {
            if (error) {
                console.log("ERROR:".red + " Proxying failed with:");
                console.log(error);
                res.send(500, error);
            } else {
                callback(response, body);
            }
        });
    } else {
        res.send(200, "You shall not pass!");
    }
}

function xhrProxyHandler(req, res/*, next*/) {
    proxy(req, res, function callback(response, body) {
        res.status(response.statusCode);
        res.set(response.headers);
        res.send(body);
    });
}

function jsonpXHRProxyHandler(req, res/*, next*/) {
    var callbackMethod = req.query.callback;

    proxy(req, res, function callback(response, body) {
        var reqData = {
            headers: response.headers,
            status: response.satusCode,
            response: body
        };

        if (contentIsXML(response.headers["Content-Type"])) {
            reqData.responseXML = body;
        } else {
            reqData.responseText = body;
        }

        res.set("Content-Type", "application/json");
        res.send(callbackMethod + "(" + JSON.stringify(reqData) + ");");
    });
}

function start(options, app) {
    var corsOptions = {
        origins: ["*"],
        methods: ['HEAD', 'GET', 'POST'],
        credentials: true,
        headers: []
    };

    if (!options) { options = {}; }
    if (!options.port) { options.port = conf.ports.proxy; }
    if (!app) { app = server.start(options); }

    if (!options.route) {
        options.route = "";
    } else if (!options.route.match(/^\//)) {
        options.route = "/" + options.route;
    }

    app.use(function (req, res, next) {
        var headers;

        if (req.headers["access-control-request-headers"]) {
            headers = req.headers["access-control-request-headers"].split(", ");

            headers.forEach(function (header) {
                if (!corsOptions.headers.some(function (h) {
                    return h === header;
                })) {
                    corsOptions.headers.push(header);
                }
            });
        }

        next();
    });

    app.use(cors(corsOptions));

    app.use(express.bodyParser());

    app.all(options.route + "/xhr_proxy", xhrProxyHandler);
    app.all(options.route + "/jsonp_xhr_proxy", jsonpXHRProxyHandler);

    console.log("INFO:".green + " CORS XHR proxy service on: " +
                ("http://localhost:" + app._port + options.route + "/xhr_proxy").cyan);
    console.log("INFO:".green + " JSONP XHR proxy service on: " +
                ("http://localhost:" + app._port + options.route + "/jsonp_xhr_proxy").cyan);

    return app;
}

module.exports = {
    start: start
};
