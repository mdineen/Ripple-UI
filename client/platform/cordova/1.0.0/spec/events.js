/*
 *  Copyright 2011 Research In Motion Limited.
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
function _fires(name) {
    return function () {
        var doc = require("ripple/client/emulatorBridge").document(),
            evt = doc.createEvent("Events");

        evt.initEvent(name, true, false);
        doc.dispatchEvent(evt);
    };
}

module.exports = {
    "deviceready": {
        callback: _fires("deviceready")
    },
    "backbutton": {
        callback: _fires("backbutton")
    },
    "menubutton": {
        callback: _fires("menubutton")
    },
    "pause": {
        callback: _fires("pause")
    },
    "resume": {
        callback: _fires("resume")
    },
    "searchbutton": {
        callback: _fires("searchbutton")
    },
    "online": {
        callback: _fires("online")
    },
    "offline": {
        callback: _fires("offline")
    }
};
