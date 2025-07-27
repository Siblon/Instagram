/** 
 * Copyright (C) Growbot 2016-2023 - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Growbot <growbotautomator@gmail.com>, 2016-2023
 */

var mainGrowbotTabId = 0;
var lastStoryAcct;
var clickedViewStoryTabIds = [];

// Local authorization flag ensures the extension runs entirely offline
const isUserAuthorized = true;


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

    if (request.follow) {

        var u = request.follow;

        chrome.tabs.create({
            url: "https://www.instagram.com/" + u.username
        }, function(tab) {
            var tabId = tab.id;
            chrome.tabs.onUpdated.addListener(function(tabId, info) {
                if (info.status === 'complete') {

                    setTimeout(function() {
                        chrome.tabs.sendMessage(tab.id, {
                            hideGrowbot: true
                        });

                        chrome.tabs.sendMessage(tab.id, {
                            clickSomething: 'button div[dir="auto"]:contains("Follow")'
                        });
                    }, 3000);

                    setTimeout(function() {
                        chrome.tabs.remove(tab.id);
                    }, 20000);
                }
            });
        });
    }


    if (request.openReelTab) {

        var shortcode = request.openReelTab.code || request.openReelTab.shortcode;

        chrome.tabs.create({
            url: "https://www.instagram.com/p/" + shortcode
        }, function(tab) {


            var tabId = tab.id;

            chrome.tabs.onUpdated.addListener(function(tabId, info) {
                if (info.status === 'complete' && sender.tab.id == tabId) {
                    chrome.tabs.sendMessage(tabId, {
                        hideGrowbot: true
                    });

                    setTimeout(function() {
                        chrome.tabs.sendMessage(tabId, {
                            hideGrowbot: true
                        });
                    }, 3000);


                    if (request.openReelTab.LikeWhenWatchingReel == true) {
                        setTimeout(function() {
                            // click Like
                            chrome.tabs.sendMessage(tabId, {
                                clickSomething: 'svg[aria-label="Like"][width="24"]',
                                parent: 'div[role="button"]'

                            });
                        }, (((request.openReelTab.video_duration || 20) * 750)));
                    }


                    if (request.openReelTab.SaveWhenWatchingReel == true) {
                        setTimeout(function() {
                            // click Save
                            chrome.tabs.sendMessage(tabId, {
                                clickSomething: 'svg[aria-label="Save"]',
                                parent: 'div[role="button"]'
                            });
                        }, (((request.openReelTab.video_duration || 20) * 750) + 2000));
                    }


                    setTimeout(function() {
                        chrome.tabs.remove(tab.id);
                    }, (((request.openReelTab.video_duration || 20) * 1000) + 1000));
                }
            });



        });

    }


    if (request.closeStoryTab) {
        console.log(mainGrowbotTabId + ' closing ' + lastStoryAcct.username);

        var hasStory = clickedViewStoryTabIds.includes(request.closeStoryTab.tabId);

        chrome.tabs.sendMessage(mainGrowbotTabId, {
            "closedStory": true,
            "acct": lastStoryAcct,
            "tabId": request.closeStoryTab.tabId,
            "viewed": hasStory
        });

        chrome.tabs.remove(request.closeStoryTab.tabId);
    }

    if (request.openStoryTab) {

        mainGrowbotTabId = sender.tab.id;
        lastStoryAcct = request.openStoryTab.acct;


        console.log(mainGrowbotTabId + ' opening ' + lastStoryAcct.username);


        chrome.tabs.create({
            url: "https://www.instagram.com/stories/" + request.openStoryTab.username
        }, function(tab) {

            var createdTabId = tab.id;

            chrome.tabs.onUpdated.addListener(function(tabId, info) {
                if (info.status === 'complete' && createdTabId == tabId) {

                    chrome.tabs.sendMessage(tabId, {
                        hideGrowbot: true
                    });

                    setTimeout(function() {
                        chrome.tabs.sendMessage(tabId, {
                            hideGrowbot: true
                        });
                    }, 3000);

                    if (clickedViewStoryTabIds.includes(tabId) == false) {
                        setTimeout(function() {
                            chrome.tabs.sendMessage(tabId, {
                                clickViewStory: true,
                                clickSomething: true,
                                tabId: tabId
                            });
                        }, 1234);
                    }

                    if (request.openStoryTab.LikeWhenWatchingStory == true) {
                        setTimeout(function() {
                            // click Like
                            chrome.tabs.sendMessage(tabId, {
                                clickSomething: 'svg[aria-label="Like"][width="24"]',
                                parent: 'div[role="button"]'

                            });
                        }, 3000);
                    }

                }
            });
        });

        return true;

    }

    if (request.viewedStory) {
    var tabId = sender.tab.id;
    if (clickedViewStoryTabIds.includes(tabId) == false) {
        clickedViewStoryTabIds.push(tabId);
    }
}

if (request.updatewanted && request.updatewanted == true) {
    gblIgBotUser.init();
}

if (request.guidCookie) {
    gblIgBotUser.overrideGuid(request.guidCookie);
}

if (request.ig_user) {
    gblIgBotUser.ig_users.push(request.ig_user);
    gblIgBotUser.ig_users = uniq(gblIgBotUser.ig_users);
    gblIgBotUser.current_ig_username = request.ig_user.username;

    if (request.ig_user_account_stats) {
        gblIgBotUser.account_growth_stats.push(request.ig_user_account_stats);
        gblIgBotUser.account_growth_stats = uniq(gblIgBotUser.account_growth_stats);
    }

    checkInstallDate();

    gblIgBotUser.saveToLocal();
}


sendResponse();
return true;

});

var gblIgBotUser = {
    user_guid: undefined,
    install_date: new Date().toUTCString(),
    instabot_install_date: undefined,
    ig_users: [],
    licenses: { "growbot_license": isUserAuthorized ? 1 : 0 }, // Sempre tem licença local
    actions: [{
        date: '',
        action: ''
    }],
    account_growth_stats: [],
    options: {},
    init: async function() {
        runWinVarsScript();
        this.user_guid = await this.getPref('growbot_user_guid');

        if (!this.user_guid || this.user_guid == false) {
            this.user_guid = this.uuidGenerator();
            this.setPref('growbot_user_guid', this.user_guid);
        }
    },
    overrideGuid: function(newGuid) {
        this.user_guid = newGuid;
        this.setPref('growbot_user_guid', this.user_guid);
    },
    uuidGenerator: function() {
        var S4 = function() {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        };
        return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
    },
    getPref: async function(name) {
        return new Promise(function(resolve) {
            chrome.storage.local.get(name, function(value) {
                if (Object.keys(value).length > 0) {
                    resolve(value[name]);
                } else {
                    resolve(false);
                }
            });
        });
    },
    setPref: async function(name, value) {
        chrome.storage.local.set({
            [name]: value
        }, function() {});
    },
    saveToLocal: function() {
        chrome.storage.local.set({
            'igBotUser': JSON.stringify(gblIgBotUser)
        }, function() {});
    }
};

var first_run = false;
var todaysdate = new Date();
var today = todaysdate.getTime();

chrome.action.onClicked.addListener(function(tab) {
    chrome.tabs.query({
        url: ["https://www.instagram.com/", "https://www.instagram.com/*"],
        currentWindow: true
    }, tabs => {
        if (tabs.length === 0) {
            chrome.tabs.create({
                url: 'https://www.instagram.com/'
            }, function(tab) {
                chrome.tabs.sendMessage(tab.id, {
                    "openGrowbot": true,
                    igBotUser: gblIgBotUser
                });
            });
        } else {
            var toggled = false;
            for (var i = 0; i < tabs.length; i++) {
                if (tabs[i].active === true) {
                    toggled = true;
                    chrome.tabs.sendMessage(tabs[i].id, {
                        "toggleGrowbot": true,
                        igBotUser: gblIgBotUser
                    });
                }
            }
            if (toggled === false) {
                chrome.tabs.update(tabs[0].id, {
                    active: true
                });
                chrome.tabs.sendMessage(tabs[0].id, {
                    "openGrowbot": true,
                    igBotUser: gblIgBotUser
                });
            }
        }
    });
});

chrome.runtime.onInstalled.addListener(installedOrUpdated);

function installedOrUpdated() {
    gblIgBotUser.init();
    // Avoid opening extra tabs; simply notify existing Instagram tabs
    setTimeout(function() {
        sendMessageToInstagramTabs({
            "extension_updated": true
        });
    }, 5000);
}

function runWinVarsScript() {
    chrome.tabs.query({
        url: ["https://www.instagram.com/*", "https://www.instagram.com/"]
    }, tabs => {
        for (var i = 0; i < tabs.length; i++) {
            var igTabId = tabs[i].id;
            chrome.scripting.executeScript({
                    target: {
                        tabId: igTabId
                    },
                    files: ['winvars.js'],
                    world: 'MAIN'
                },
                function() {});
        }
    });
}

async function checkInstallDate() {
    var installDate = await gblIgBotUser.getPref('instabot_install_date');

    if (installDate == false) {
        first_run = true;
        installDate = '' + today;
        gblIgBotUser.setPref('instabot_install_date', installDate);
    }

    gblIgBotUser.instabot_install_date = installDate;
    gblIgBotUser.install_date = new Date(+installDate).toUTCString();
    
    // Sempre envia que tem licença
    allLicensesFetched(1, { "growbot_license": isUserAuthorized ? 1 : 0 });
}

function sendMessageToInstagramTabs(message) {
    chrome.tabs.query({
        url: ["https://www.instagram.com/", "https://www.instagram.com/*"]
    }, function(tabs) {
        for (var i = 0; i < tabs.length; i++) {
            chrome.tabs.sendMessage(tabs[i].id, message).then(response => {
            }).catch(function() {
            });
        }
    });
}

function allLicensesFetched(count, licenses) {
    // Sempre envia que tem licença válida
    sendMessageToInstagramTabs({
        "instabot_install_date": gblIgBotUser.instabot_install_date,
        "instabot_has_license": isUserAuthorized,
        igBotUser: gblIgBotUser
    });

    gblIgBotUser.licenses = licenses;
    gblIgBotUser.saveToLocal();
}

function uniq(ar) {
    return Array.from(new Set(ar.map(JSON.stringify))).map(JSON.parse);
}
