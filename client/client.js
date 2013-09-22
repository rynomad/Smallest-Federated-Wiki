;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
window.wiki = require('./lib/wiki.coffee');

require('./lib/legacy.coffee');


},{"./lib/legacy.coffee":5,"./lib/wiki.coffee":16}],2:[function(require,module,exports){
var active, findScrollContainer, scrollTo;

module.exports = active = {};

active.scrollContainer = void 0;

findScrollContainer = function() {
  var scrolled;
  scrolled = $("body, html").filter(function() {
    return $(this).scrollLeft() > 0;
  });
  if (scrolled.length > 0) {
    return scrolled;
  } else {
    return $("body, html").scrollLeft(12).filter(function() {
      return $(this).scrollLeft() > 0;
    }).scrollTop(0);
  }
};

scrollTo = function(el) {
  var bodyWidth, contentWidth, maxX, minX, target, width;
  if (active.scrollContainer == null) {
    active.scrollContainer = findScrollContainer();
  }
  bodyWidth = $("body").width();
  minX = active.scrollContainer.scrollLeft();
  maxX = minX + bodyWidth;
  target = el.position().left;
  width = el.outerWidth(true);
  contentWidth = $(".page").outerWidth(true) * $(".page").size();
  if (target < minX) {
    return active.scrollContainer.animate({
      scrollLeft: target
    });
  } else if (target + width > maxX) {
    return active.scrollContainer.animate({
      scrollLeft: target - (bodyWidth - width)
    });
  } else if (maxX > $(".pages").outerWidth()) {
    return active.scrollContainer.animate({
      scrollLeft: Math.min(target, contentWidth - bodyWidth)
    });
  }
};

active.set = function(el) {
  el = $(el);
  $(".active").removeClass("active");
  return scrollTo(el.addClass("active"));
};


},{}],3:[function(require,module,exports){
var util;

util = require('./util.coffee');

module.exports = function(journalElement, action) {
  var actionElement, actionTitle, controls, pageElement, prev;
  pageElement = journalElement.parents('.page:first');
  if (action.type === 'edit') {
    prev = journalElement.find(".edit[data-id=" + (action.id || 0) + "]");
  }
  actionTitle = action.type;
  if (action.date != null) {
    actionTitle += " " + (util.formatElapsedTime(action.date));
  }
  actionElement = $("<a href=\"#\" /> ").addClass("action").addClass(action.type).text(util.symbols[action.type]).attr('title', actionTitle).attr('data-id', action.id || "0").data('action', action);
  controls = journalElement.children('.control-buttons');
  if (controls.length > 0) {
    actionElement.insertBefore(controls);
  } else {
    actionElement.appendTo(journalElement);
  }
  if (action.type === 'fork' && (action.site != null)) {
    return actionElement.css("background-image", "url(//" + action.site + "/favicon.png)").attr("href", "//" + action.site + "/" + (pageElement.attr('id')) + ".html").data("site", action.site).data("slug", pageElement.attr('id'));
  }
};


},{"./util.coffee":15}],4:[function(require,module,exports){
var interestHandler, repo;

repo = require('./repository.coffee');

window.interfaces = {};

interfaces.faces = {};

interfaces.list = [];

interfaces.active = [];

interestHandler = function(face, upcallInfo) {
  var closure, contentStore, interest, name, pI, pageURI, sendData, slug, updateURIchunks, withJson;
  sendData = function(data) {
    var co, sent, signed, string;
    signed = new SignedInfo();
    sent = false;
    console.log(data);
    if (interest.matches_name(new Name(interest.name.to_uri() + '/' + data.version)) === true && sent === false) {
      console.log(data);
      string = JSON.stringify(data);
      console.log(string);
      co = new ContentObject(new Name(upcallInfo.interest.name.to_uri() + '/' + data.version), signed, string, new Signature());
      console.log(co);
      co.signedInfo.freshnessSeconds = 604800;
      co.sign();
      upcallInfo.contentObject = co;
      return face.transport.send(encodeToBinaryContentObject(upcallInfo.contentObject));
    }
  };
  contentStore = DataUtils.toString(upcallInfo.interest.name.components[face.prefix.components.length]);
  interest = upcallInfo.interest;
  if (contentStore === 'page') {
    pI = {};
    if (DataUtils.toString(upcallInfo.interest.name.components[face.prefix.components.length + 1]) === 'update') {
      withJson = DataUtils.toString(upcallInfo.interest.name.components[face.prefix.components.length + 2]);
      pI.slug = withJson.slice(0, -5);
      console.log(pI.slug);
      repo.getPage(pI, sendData);
      slug = DataUtils.toString(upcallInfo.interest.name.components[face.prefix.components.length + 2]);
      updateURIchunks = upcallInfo.interest.name.getName().split('/update');
      pageURI = updateURIchunks[0] + updateURIchunks[1];
      name = new Name(pageURI);
      interest = new Interest(name);
      closure = new ContentClosure(face, name, interest, repo.updatePageFromPeer);
      return face.expressInterest(name, closure);
    } else {
      pI = {};
      if ((upcallInfo.interest.name.components.length - face.prefix.components.length) === 3) {
        console.log("getting page requested with version");
        pI.version = parseInt(DataUtils.toString(upcallInfo.interest.name.components[upcallInfo.interest.name.components.length - 1]));
      }
      withJson = DataUtils.toString(upcallInfo.interest.name.components[face.prefix.components.length + 1]);
      pI.slug = withJson.slice(0, -5);
      console.log(pI.slug);
      return repo.getPage(pI, sendData);
    }
  } else if (contentStore === 'system') {
    if (DataUtils.toString(upcallInfo.interest.name.components[face.prefix.components.length + 1]) === 'sitemap.json') {
      return repo.getSitemap(sendData);
    }
  }
};

interfaces.registerFace = function(url) {
  var component, face, hostComponents, hostPrefix, open, prefix, _i, _len;
  face = new NDN({
    host: url
  });
  hostPrefix = '';
  hostComponents = url.split('.');
  for (_i = 0, _len = hostComponents.length; _i < _len; _i++) {
    component = hostComponents[_i];
    if (component !== 'www' && component !== 'http://www' && component !== 'http://') {
      hostPrefix = ("/" + component) + hostPrefix;
    }
  }
  prefix = new Name(hostPrefix);
  face.prefixURI = hostPrefix;
  face.prefix = prefix;
  interfaces.faces[hostPrefix] = face;
  interfaces.faces[hostPrefix].registerPrefix(prefix, new interfaceClosure(face, interestHandler));
  interfaces.list.push(hostPrefix);
  interfaces.active.push(interfaces.faces[hostPrefix]);
  open = function() {
    var express;
    console.log(new Date());
    express = function() {
      var closure, interest, name, template;
      console.log(new Date());
      name = new Name(hostPrefix + '/page/welcome-visitors.json');
      interest = new Interest(name);
      interest.childSelector = 1;
      template = {};
      template.childSelector = 1;
      closure = new ContentClosure(face, name, interest, repo.updatePage);
      return face.expressInterest(name, closure, template);
    };
    return setTimeout(express, 300);
  };
  return face.onopen = open();
};

if (navigator.onLine === true) {
  console.log("online: registering Face at ", location.host.split(':')[0]);
  interfaces.registerFace(location.host.split(':')[0]);
}


},{"./repository.coffee":10}],5:[function(require,module,exports){
var active, pageHandler, plugin, refresh, state, util, wiki;

wiki = require('./wiki.coffee');

util = require('./util.coffee');

pageHandler = wiki.pageHandler = require('./pageHandler.coffee');

plugin = require('./plugin.coffee');

state = require('./state.coffee');

active = require('./active.coffee');

refresh = require('./refresh.coffee');

require('./interfaces.coffee');

Array.prototype.last = function() {
  return this[this.length - 1];
};

$(function() {
  var LEFTARROW, RIGHTARROW, createTextElement, doInternalLink, finishClick, getTemplate, sleep, textEditor;
  window.dialog = $('<div></div>').html('This dialog will show every time!').dialog({
    autoOpen: false,
    title: 'Basic Dialog',
    height: 600,
    width: 800
  });
  wiki.dialog = function(title, html) {
    window.dialog.html(html);
    window.dialog.dialog("option", "title", wiki.resolveLinks(title));
    return window.dialog.dialog('open');
  };
  sleep = function(time, done) {
    return setTimeout(done, time);
  };
  wiki.removeItem = function($item, item) {
    pageHandler.put($item.parents('.page:first'), {
      type: 'remove',
      id: item.id
    });
    return $item.remove();
  };
  wiki.createItem = function($page, $before, item) {
    var $item, before;
    if ($page == null) {
      $page = $before.parents('.page');
    }
    item.id = util.randomBytes(8);
    $item = $("<div class=\"item " + item.type + "\" data-id=\"" + "\"</div>");
    $item.data('item', item).data('pageElement', $page);
    if ($before != null) {
      $before.after($item);
    } else {
      $page.find('.story').append($item);
    }
    plugin["do"]($item, item);
    before = wiki.getItem($before);
    sleep(500, function() {
      return pageHandler.put($page, {
        item: item,
        id: item.id,
        type: 'add',
        after: before != null ? before.id : void 0
      });
    });
    return $item;
  };
  createTextElement = function(pageElement, beforeElement, initialText) {
    var item, itemBefore, itemElement;
    item = {
      type: 'paragraph',
      id: util.randomBytes(8),
      text: initialText
    };
    itemElement = $("<div class=\"item paragraph\" data-id=" + item.id + "></div>");
    itemElement.data('item', item).data('pageElement', pageElement);
    beforeElement.after(itemElement);
    plugin["do"](itemElement, item);
    itemBefore = wiki.getItem(beforeElement);
    wiki.textEditor(itemElement, item);
    return sleep(500, function() {
      return pageHandler.put(pageElement, {
        item: item,
        id: item.id,
        type: 'add',
        after: itemBefore != null ? itemBefore.id : void 0
      });
    });
  };
  textEditor = wiki.textEditor = function(div, item, caretPos, doubleClicked) {
    var original, textarea, _ref;
    if (div.hasClass('textEditing')) {
      return;
    }
    div.addClass('textEditing');
    textarea = $("<textarea>" + (original = (_ref = item.text) != null ? _ref : '') + "</textarea>").focusout(function() {
      div.removeClass('textEditing');
      if (item.text = textarea.val()) {
        plugin["do"](div.empty(), item);
        if (item.text === original) {
          return;
        }
        pageHandler.put(div.parents('.page:first'), {
          type: 'edit',
          id: item.id,
          item: item
        });
      } else {
        pageHandler.put(div.parents('.page:first'), {
          type: 'remove',
          id: item.id
        });
        div.remove();
      }
      return null;
    }).bind('keydown', function(e) {
      var middle, page, pageElement, prefix, prevItem, prevTextLen, sel, suffix, text;
      if ((e.altKey || e.ctlKey || e.metaKey) && e.which === 83) {
        textarea.focusout();
        return false;
      }
      if ((e.altKey || e.ctlKey || e.metaKey) && e.which === 73) {
        e.preventDefault();
        if (!e.shiftKey) {
          page = $(e.target).parents('.page');
        }
        doInternalLink("about " + item.type + " plugin", page);
        return false;
      }
      if (item.type === 'paragraph') {
        sel = util.getSelectionPos(textarea);
        if (e.which === $.ui.keyCode.BACKSPACE && sel.start === 0 && sel.start === sel.end) {
          prevItem = wiki.getItem(div.prev());
          if (prevItem.type !== 'paragraph') {
            return false;
          }
          prevTextLen = prevItem.text.length;
          prevItem.text += textarea.val();
          textarea.val('');
          textEditor(div.prev(), prevItem, prevTextLen);
          return false;
        } else if (e.which === $.ui.keyCode.ENTER && item.type === 'paragraph') {
          if (!sel) {
            return false;
          }
          text = textarea.val();
          prefix = text.substring(0, sel.start);
          if (sel.start !== sel.end) {
            middle = text.substring(sel.start, sel.end);
          }
          suffix = text.substring(sel.end);
          if (prefix === '') {
            textarea.val(' ');
          } else {
            textarea.val(prefix);
          }
          textarea.focusout();
          pageElement = div.parent().parent();
          createTextElement(pageElement, div, suffix);
          if (middle != null) {
            createTextElement(pageElement, div, middle);
          }
          if (prefix === '') {
            createTextElement(pageElement, div, '');
          }
          return false;
        }
      }
    });
    div.html(textarea);
    if (caretPos != null) {
      return util.setCaretPosition(textarea, caretPos);
    } else if (doubleClicked) {
      util.setCaretPosition(textarea, textarea.val().length);
      return textarea.scrollTop(textarea[0].scrollHeight - textarea.height());
    } else {
      return textarea.focus();
    }
  };
  doInternalLink = wiki.doInternalLink = function(name, page, site, version) {
    if (site == null) {
      site = null;
    }
    name = wiki.asSlug(name);
    if (page != null) {
      $(page).nextAll().remove();
    }
    console.log(version);
    wiki.createPage(name, site, version).appendTo($('.main')).each(refresh);
    return active.set($('.page').last());
  };
  LEFTARROW = 37;
  RIGHTARROW = 39;
  $(document).keydown(function(event) {
    var direction, newIndex, pages;
    direction = (function() {
      switch (event.which) {
        case LEFTARROW:
          return -1;
        case RIGHTARROW:
          return +1;
      }
    })();
    if (direction && !(event.target.tagName === "TEXTAREA")) {
      pages = $('.page');
      newIndex = pages.index($('.active')) + direction;
      if ((0 <= newIndex && newIndex < pages.length)) {
        return active.set(pages.eq(newIndex));
      }
    }
  });
  $(window).on('popstate', state.show);
  $(document).ajaxError(function(event, request, settings) {
    if (request.status === 0 || request.status === 404) {
      return;
    }
    wiki.log('ajax error', event, request, settings);
    return $('.main').prepend("<li class='error'>\n  Error on " + settings.url + ": " + request.responseText + "\n</li>");
  });
  getTemplate = function(slug, done) {
    if (!slug) {
      return done(null);
    }
    wiki.log('getTemplate', slug);
    return pageHandler.get({
      whenGotten: function(data, siteFound) {
        return done(data.story);
      },
      whenNotGotten: function() {
        return done(null);
      },
      pageInformation: {
        slug: slug
      }
    });
  };
  finishClick = function(e, name) {
    var page;
    e.preventDefault();
    if (!e.shiftKey) {
      page = $(e.target).parents('.page');
    }
    doInternalLink(name, page, $(e.target).data('site'), $(e.target).data('version'));
    return false;
  };
  $('.main').delegate('.show-page-source', 'click', function(e) {
    var json, pageElement;
    e.preventDefault();
    pageElement = $(this).parent().parent();
    json = pageElement.data('data');
    return wiki.dialog("JSON for " + json.title, $('<pre/>').text(JSON.stringify(json, null, 2)));
  }).delegate('.page', 'click', function(e) {
    if (!$(e.target).is("a")) {
      return active.set(this);
    }
  }).delegate('.internal', 'click', function(e) {
    var name;
    name = $(e.target).data('pageName');
    pageHandler.context = $(e.target).attr('title').split(' => ');
    return finishClick(e, name);
  }).delegate('img.remote', 'click', function(e) {
    var name;
    name = $(e.target).data('slug');
    pageHandler.context = [$(e.target).data('version')];
    return finishClick(e, name);
  }).delegate('.revision', 'dblclick', function(e) {
    var $page, action, json, page, rev;
    e.preventDefault();
    $page = $(this).parents('.page');
    page = $page.data('data');
    rev = page.journal.length - 1;
    action = page.journal[rev];
    json = JSON.stringify(action, null, 2);
    return wiki.dialog("Revision " + rev + ", " + action.type + " action", $('<pre/>').text(json));
  }).delegate('.action', 'click', function(e) {
    var $action, $page, name, rev, slug;
    e.preventDefault();
    $action = $(e.target);
    if ($action.is('.fork') && ((name = $action.data('slug')) != null)) {
      pageHandler.context = [$action.data('site')];
      return finishClick(e, (name.split('_'))[0]);
    } else {
      $page = $(this).parents('.page');
      slug = wiki.asSlug($page.data('data').title);
      rev = $(this).parent().children().index($action);
      if (!e.shiftKey) {
        $page.nextAll().remove();
      }
      wiki.createPage("" + slug + "_rev" + rev, $page.data('site')).appendTo($('.main')).each(refresh);
      return active.set($('.page').last());
    }
  }).delegate('.fork-page', 'click', function(e) {
    var item, pageElement, remoteSite;
    pageElement = $(e.target).parents('.page');
    if (pageElement.hasClass('local')) {
      if (!wiki.useLocalStorage()) {
        item = pageElement.data('data');
        pageElement.removeClass('local');
        return pageHandler.put(pageElement, {
          type: 'fork'
        });
      }
    } else {
      if ((remoteSite = pageElement.data('site')) != null) {
        return pageHandler.put(pageElement, {
          type: 'fork',
          site: remoteSite
        });
      }
    }
  }).delegate('.action', 'hover', function() {
    var id;
    id = $(this).attr('data-id');
    $("[data-id=" + id + "]").toggleClass('target');
    return $('.main').trigger('rev');
  }).delegate('.item', 'hover', function() {
    var id;
    id = $(this).attr('data-id');
    return $(".action[data-id=" + id + "]").toggleClass('target');
  }).delegate('button.create', 'click', function(e) {
    return getTemplate($(e.target).data('slug'), function(story) {
      var $page, page;
      $page = $(e.target).parents('.page:first');
      $page.removeClass('ghost');
      page = $page.data('data');
      page.story = story || [];
      pageHandler.put($page, {
        type: 'create',
        id: page.id,
        item: {
          title: page.title,
          story: story || void 0
        }
      });
      return wiki.buildPage(page, null, $page.empty());
    });
  }).delegate('.ghost', 'rev', function(e) {
    var $item, $page, position;
    wiki.log('rev', e);
    $page = $(e.target).parents('.page:first');
    $item = $page.find('.target');
    position = $item.offset().top + $page.scrollTop() - $page.height() / 2;
    wiki.log('scroll', $page, $item, position);
    return $page.stop().animate({
      scrollTop: postion
    }, 'slow');
  }).delegate('.score', 'hover', function(e) {
    return $('.main').trigger('thumb', $(e.target).data('thumb'));
  });
  $('.footer').delegate('.federate', 'click', function(e) {
    var face, _i, _len, _ref, _results;
    e.preventDefault();
    _ref = interfaces.list;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      face = _ref[_i];
      _results.push(console.log(face));
    }
    return _results;
  });
  $('input.federate').on('keypress', function(e) {
    var federate;
    if (e.keyCode !== 13) {
      return;
    }
    federate = $(this).val();
    interfaces.registerFace(federate);
    return $(this).val("");
  });
  $(".provider input").click(function() {
    $("footer input:first").val($(this).attr('data-provider'));
    return $("footer form").submit();
  });
  $('body').on('new-neighbor-done', function(e, neighbor) {
    return $('.page').each(function(index, element) {
      return wiki.emitTwins($(element));
    });
  });
  return $(function() {
    state.first();
    $('.page').each(refresh);
    return active.set($('.page').last());
  });
});


},{"./active.coffee":2,"./interfaces.coffee":4,"./pageHandler.coffee":7,"./plugin.coffee":8,"./refresh.coffee":9,"./state.coffee":13,"./util.coffee":15,"./wiki.coffee":16}],6:[function(require,module,exports){
var active, createSearch, neighborhood, nextAvailableFetch, nextFetchInterval, populateSiteInfoFor, util, wiki, _,
  __hasProp = {}.hasOwnProperty;

_ = require('underscore');

wiki = require('./wiki.coffee');

active = require('./active.coffee');

util = require('./util.coffee');

createSearch = require('./search.coffee');

module.exports = neighborhood = {};

if (wiki.neighborhood == null) {
  wiki.neighborhood = {};
}

nextAvailableFetch = 0;

nextFetchInterval = 2000;

populateSiteInfoFor = function(site, neighborInfo) {
  var fetchMap, now, transition;
  if (neighborInfo.sitemapRequestInflight) {
    return;
  }
  neighborInfo.sitemapRequestInflight = true;
  transition = function(site, from, to) {
    return $(".neighbor[data-site=\"" + site + "\"]").find('div').removeClass(from).addClass(to);
  };
  fetchMap = function() {
    var request, sitemapUrl;
    sitemapUrl = "http://" + site + "/system/sitemap.json";
    transition(site, 'wait', 'fetch');
    request = $.ajax({
      type: 'GET',
      dataType: 'json',
      url: sitemapUrl
    });
    return request.always(function() {
      return neighborInfo.sitemapRequestInflight = false;
    }).done(function(data) {
      neighborInfo.sitemap = data;
      transition(site, 'fetch', 'done');
      return $('body').trigger('new-neighbor-done', site);
    }).fail(function(data) {
      return transition(site, 'fetch', 'fail');
    });
  };
  now = Date.now();
  if (now > nextAvailableFetch) {
    nextAvailableFetch = now + nextFetchInterval;
    return setTimeout(fetchMap, 100);
  } else {
    setTimeout(fetchMap, nextAvailableFetch - now);
    return nextAvailableFetch += nextFetchInterval;
  }
};

wiki.registerNeighbor = neighborhood.registerNeighbor = function(site) {
  var neighborInfo;
  if (wiki.neighborhood[site] != null) {
    return;
  }
  neighborInfo = {};
  wiki.neighborhood[site] = neighborInfo;
  populateSiteInfoFor(site, neighborInfo);
  return $('body').trigger('new-neighbor', site);
};

neighborhood.listNeighbors = function() {
  return _.keys(wiki.neighborhood);
};

neighborhood.search = function(searchQuery) {
  var finds, match, matchingPages, neighborInfo, neighborSite, sitemap, start, tally, tick, _ref;
  finds = [];
  tally = {};
  tick = function(key) {
    if (tally[key] != null) {
      return tally[key]++;
    } else {
      return tally[key] = 1;
    }
  };
  match = function(key, text) {
    var hit;
    hit = (text != null) && text.toLowerCase().indexOf(searchQuery.toLowerCase()) >= 0;
    if (hit) {
      tick(key);
    }
    return hit;
  };
  start = Date.now();
  _ref = wiki.neighborhood;
  for (neighborSite in _ref) {
    if (!__hasProp.call(_ref, neighborSite)) continue;
    neighborInfo = _ref[neighborSite];
    sitemap = neighborInfo.sitemap;
    if (sitemap != null) {
      tick('sites');
    }
    matchingPages = _.each(sitemap, function(page) {
      tick('pages');
      if (!(match('title', page.title) || match('text', page.synopsis) || match('slug', page.slug))) {
        return;
      }
      tick('finds');
      return finds.push({
        page: page,
        site: neighborSite,
        rank: 1
      });
    });
  }
  tally['msec'] = Date.now() - start;
  return {
    finds: finds,
    tally: tally
  };
};

$(function() {
  var $neighborhood, flag, search;
  $neighborhood = $('.neighborhood');
  flag = function(site) {
    return "<span class=\"neighbor\" data-site=\"" + site + "\">\n  <div class=\"wait\">\n    <img src=\"http://" + site + "/favicon.png\" title=\"" + site + "\">\n  </div>\n</span>";
  };
  $('body').on('new-neighbor', function(e, site) {
    return $neighborhood.append(flag(site));
  }).delegate('.neighbor img', 'click', function(e) {
    return wiki.doInternalLink('welcome-visitors', null, this.title);
  });
  search = createSearch({
    neighborhood: neighborhood
  });
  return $('input.search').on('keypress', function(e) {
    var searchQuery;
    if (e.keyCode !== 13) {
      return;
    }
    searchQuery = $(this).val();
    search.performSearch(searchQuery);
    return $(this).val("");
  });
});


},{"./active.coffee":2,"./search.coffee":12,"./util.coffee":15,"./wiki.coffee":16,"underscore":17}],7:[function(require,module,exports){
var addToJournal, pageFromLocalStorage, pageHandler, pushToLocal, pushToServer, recursiveGet, repository, revision, state, util, wiki, _;

_ = require('underscore');

wiki = require('./wiki.coffee');

util = require('./util.coffee');

state = require('./state.coffee');

revision = require('./revision.coffee');

addToJournal = require('./addToJournal.coffee');

repository = require('./repository.coffee');

module.exports = pageHandler = {};

pageFromLocalStorage = function(slug) {
  var json;
  if (json = localStorage[slug]) {
    return JSON.parse(json);
  } else {
    return void 0;
  }
};

recursiveGet = function(_arg) {
  var localContext, pageInformation, rev, site, slug, version, whenGotten, whenNotGotten;
  pageInformation = _arg.pageInformation, whenGotten = _arg.whenGotten, whenNotGotten = _arg.whenNotGotten, localContext = _arg.localContext;
  slug = pageInformation.slug, rev = pageInformation.rev, site = pageInformation.site, version = pageInformation.version;
  return repository.getPage(pageInformation, whenGotten, whenNotGotten);
  /*
  if site
    localContext = []
  else
    site = localContext.shift()
  
  site = null if site=='view'
  
  if site?
    if site == 'local'
      repository.check(pageInformation, whenGotten, whenNotGotten)
    else
      if site == 'origin'
        url = "/#{slug}.json"
      else
        url = "http://#{site}/#{slug}.json"
  else
    url = "/#{slug}.json"
  
  $.ajax
    type: 'GET'
    dataType: 'json'
    url: url + "?random=#{util.randomBytes(4)}"
    success: (page) ->
      page = revision.create rev, page if rev
      return whenGotten(page,site)
    error: (xhr, type, msg) ->
      if (xhr.status != 404) and (xhr.status != 0)
        wiki.log 'pageHandler.get error', xhr, xhr.status, type, msg
        report =
          'title': "#{xhr.status} #{msg}"
          'story': [
            'type': 'paragraph'
            'id': '928739187243'
            'text': "<pre>#{xhr.responseText}"
          ]
        return whenGotten report, 'local'
      if localContext.length > 0
        recursiveGet( {pageInformation, whenGotten, whenNotGotten, localContext} )
      else
        whenNotGotten()
  */

};

pageHandler.get = function(_arg) {
  var pageInformation, whenGotten, whenNotGotten;
  whenGotten = _arg.whenGotten, whenNotGotten = _arg.whenNotGotten, pageInformation = _arg.pageInformation;
  pageHandler.context = ['view'];
  return recursiveGet({
    pageInformation: pageInformation,
    whenGotten: whenGotten,
    whenNotGotten: whenNotGotten,
    localContext: _.clone(pageHandler.context)
  });
};

pageHandler.context = [];

pushToLocal = function(pageElement, pagePutInfo, action) {
  var forkReached, page, version, _i, _ref;
  page = pageElement.data("data");
  if (page.journal == null) {
    page.journal = [];
  }
  if (action['fork'] != null) {
    page.journal = page.journal.concat({
      'type': 'fork',
      'date': action.date
    });
    delete action['fork'];
  }
  page.journal = page.journal.concat(action);
  if (action.type !== 'create') {
    page.story = $(pageElement).find(".item").map(function() {
      return $(this).data("item");
    }).get();
  }
  addToJournal(pageElement.find('.journal'), action);
  page.page = wiki.asSlug(page.title) + '.json';
  page.excludes = [];
  page.favicon = repository.favicon;
  forkReached = false;
  _ref = page.journal;
  for (_i = _ref.length - 1; _i >= 0; _i += -1) {
    version = _ref[_i];
    if (version.type !== 'fork' && forkReached === false) {
      page.excludes.push(version.date);
    } else {
      forkReached = true;
    }
  }
  console.log(page);
  return repository.updatePage(page);
};

pushToServer = function(pageElement, pagePutInfo, action) {
  return $.ajax({
    type: 'PUT',
    url: "/page/" + pagePutInfo.slug + "/action",
    data: {
      'action': JSON.stringify(action)
    },
    success: function() {
      addToJournal(pageElement.find('.journal'), action);
      if (action.type === 'fork') {
        localStorage.removeItem(pageElement.attr('id'));
        return state.setUrl;
      }
    },
    error: function(xhr, type, msg) {
      return wiki.log("pageHandler.put ajax error callback", type, msg);
    }
  });
};

pageHandler.put = function(pageElement, action) {
  var checkedSite, forkFrom, pagePutInfo;
  checkedSite = function() {
    var site;
    switch (site = pageElement.data('site')) {
      case 'origin':
      case 'local':
      case 'view':
        return null;
      case location.host:
        return null;
      default:
        return site;
    }
  };
  pagePutInfo = {
    slug: pageElement.attr('id').split('_rev')[0],
    rev: pageElement.attr('id').split('_rev')[1],
    site: checkedSite(),
    local: pageElement.hasClass('local')
  };
  forkFrom = pageElement.data('data').favicon;
  console.log(forkFrom);
  wiki.log('pageHandler.put', action, pagePutInfo);
  if (wiki.useLocalStorage()) {
    if (pagePutInfo.site != null) {
      wiki.log('remote => local');
    } else if (!pagePutInfo.local) {
      wiki.log('origin => local');
      action.site = forkFrom = location.host;
    }
  }
  action.date = (new Date()).getTime();
  if (action.site === 'origin') {
    delete action.site;
  }
  if (forkFrom !== repository.favicon) {
    pageElement.find('h1 img').attr('src', repository.favicon);
    pageElement.find('h1 a').attr('href', '/');
    pageElement.data('site', null);
    pageElement.removeClass('remote');
    state.setUrl();
    if (action.type !== 'fork') {
      action.fork = forkFrom;
      addToJournal(pageElement.find('.journal'), {
        type: 'fork',
        site: forkFrom,
        date: action.date
      });
    }
  }
  pushToLocal(pageElement, pagePutInfo, action);
  return pageElement.addClass("local");
};


},{"./addToJournal.coffee":3,"./repository.coffee":10,"./revision.coffee":11,"./state.coffee":13,"./util.coffee":15,"./wiki.coffee":16,"underscore":17}],8:[function(require,module,exports){
var getScript, plugin, scripts, util, wiki;

util = require('./util.coffee');

wiki = require('./wiki.coffee');

module.exports = plugin = {};

scripts = {};

getScript = wiki.getScript = function(url, callback) {
  if (callback == null) {
    callback = function() {};
  }
  if (scripts[url] != null) {
    return callback();
  } else {
    return $.getScript(url).done(function() {
      scripts[url] = true;
      return callback();
    }).fail(function() {
      return callback();
    });
  }
};

plugin.get = wiki.getPlugin = function(name, callback) {
  if (window.plugins[name]) {
    return callback(window.plugins[name]);
  }
  return getScript("/plugins/" + name + "/" + name + ".js", function() {
    if (window.plugins[name]) {
      return callback(window.plugins[name]);
    }
    return getScript("/plugins/" + name + ".js", function() {
      return callback(window.plugins[name]);
    });
  });
};

plugin["do"] = wiki.doPlugin = function(div, item, done) {
  var error;
  if (done == null) {
    done = function() {};
  }
  error = function(ex) {
    var errorElement;
    errorElement = $("<div />").addClass('error');
    errorElement.text(ex.toString());
    return div.append(errorElement);
  };
  div.data('pageElement', div.parents(".page"));
  div.data('item', item);
  return plugin.get(item.type, function(script) {
    var err;
    try {
      if (script == null) {
        throw TypeError("Can't find plugin for '" + item.type + "'");
      }
      if (script.emit.length > 2) {
        return script.emit(div, item, function() {
          script.bind(div, item);
          return done();
        });
      } else {
        script.emit(div, item);
        script.bind(div, item);
        return done();
      }
    } catch (_error) {
      err = _error;
      wiki.log('plugin error', err);
      error(err);
      return done();
    }
  });
};

wiki.registerPlugin = function(pluginName, pluginFn) {
  return window.plugins[pluginName] = pluginFn($);
};

window.plugins = {
  paragraph: {
    emit: function(div, item) {
      var text, _i, _len, _ref, _results;
      _ref = item.text.split(/\n\n+/);
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        text = _ref[_i];
        if (text.match(/\S/)) {
          _results.push(div.append("<p>" + (wiki.resolveLinks(text)) + "</p>"));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    },
    bind: function(div, item) {
      return div.dblclick(function() {
        return wiki.textEditor(div, item, null, true);
      });
    }
  },
  image: {
    emit: function(div, item) {
      item.text || (item.text = item.caption);
      return div.append("<img class=thumbnail src=\"" + item.url + "\"> <p>" + (wiki.resolveLinks(item.text)) + "</p>");
    },
    bind: function(div, item) {
      div.dblclick(function() {
        return wiki.textEditor(div, item);
      });
      return div.find('img').dblclick(function() {
        return wiki.dialog(item.text, this);
      });
    }
  },
  future: {
    emit: function(div, item) {
      var info, _i, _len, _ref, _results;
      div.append("" + item.text + "<br><br><button class=\"create\">create</button> new blank page");
      if (((info = wiki.neighborhood[location.host]) != null) && (info.sitemap != null)) {
        _ref = info.sitemap;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          item = _ref[_i];
          if (item.slug.match(/-template$/)) {
            _results.push(div.append("<br><button class=\"create\" data-slug=" + item.slug + ">create</button> from " + (wiki.resolveLinks("[[" + item.title + "]]"))));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      }
    },
    bind: function(div, item) {}
  }
};


},{"./util.coffee":15,"./wiki.coffee":16}],9:[function(require,module,exports){
var addToJournal, buildPageHeader, createFactory, emitHeader, emitTwins, handleDragging, initAddButton, initDragging, neighborhood, pageHandler, plugin, refresh, renderPageIntoPageElement, repository, state, util, wiki, _,
  __slice = [].slice;

_ = require('underscore');

util = require('./util.coffee');

pageHandler = require('./pageHandler.coffee');

plugin = require('./plugin.coffee');

state = require('./state.coffee');

neighborhood = require('./neighborhood.coffee');

addToJournal = require('./addToJournal.coffee');

wiki = require('./wiki.coffee');

repository = require('./repository.coffee');

handleDragging = function(evt, ui) {
  var action, before, beforeElement, destinationPageElement, equals, item, itemElement, moveFromPage, moveToPage, moveWithinPage, order, sourcePageElement, sourceSite, thisPageElement;
  itemElement = ui.item;
  item = wiki.getItem(itemElement);
  thisPageElement = $(this).parents('.page:first');
  sourcePageElement = itemElement.data('pageElement');
  sourceSite = sourcePageElement.data('site');
  destinationPageElement = itemElement.parents('.page:first');
  equals = function(a, b) {
    return a && b && a.get(0) === b.get(0);
  };
  moveWithinPage = !sourcePageElement || equals(sourcePageElement, destinationPageElement);
  moveFromPage = !moveWithinPage && equals(thisPageElement, sourcePageElement);
  moveToPage = !moveWithinPage && equals(thisPageElement, destinationPageElement);
  if (moveFromPage) {
    if (sourcePageElement.hasClass('ghost') || sourcePageElement.attr('id') === destinationPageElement.attr('id')) {
      return;
    }
  }
  action = moveWithinPage ? (order = $(this).children().map(function(_, value) {
    return $(value).attr('data-id');
  }).get(), {
    type: 'move',
    order: order
  }) : moveFromPage ? (wiki.log('drag from', sourcePageElement.find('h1').text()), {
    type: 'remove'
  }) : moveToPage ? (itemElement.data('pageElement', thisPageElement), beforeElement = itemElement.prev('.item'), before = wiki.getItem(beforeElement), {
    type: 'add',
    item: item,
    after: before != null ? before.id : void 0
  }) : void 0;
  action.id = item.id;
  return pageHandler.put(thisPageElement, action);
};

initDragging = function($page) {
  var $story;
  $story = $page.find('.story');
  return $story.sortable({
    connectWith: '.page .story'
  }).on("sortupdate", handleDragging);
};

initAddButton = function($page) {
  return $page.find(".add-factory").live("click", function(evt) {
    if ($page.hasClass('ghost')) {
      return;
    }
    evt.preventDefault();
    return createFactory($page);
  });
};

createFactory = function($page) {
  var before, beforeElement, item, itemElement;
  item = {
    type: "factory",
    id: util.randomBytes(8)
  };
  itemElement = $("<div />", {
    "class": "item factory"
  }).data('item', item).attr('data-id', item.id);
  itemElement.data('pageElement', $page);
  $page.find(".story").append(itemElement);
  plugin["do"](itemElement, item);
  beforeElement = itemElement.prev('.item');
  before = wiki.getItem(beforeElement);
  return pageHandler.put($page, {
    item: item,
    id: item.id,
    type: "add",
    after: before != null ? before.id : void 0
  });
};

buildPageHeader = function(_arg) {
  var favicon_src, header_href, page, tooltip;
  page = _arg.page, tooltip = _arg.tooltip, header_href = _arg.header_href, favicon_src = _arg.favicon_src;
  if (page.plugin) {
    tooltip += "\n" + page.plugin + " plugin";
  }
  return "<h1 title=\"" + tooltip + "\"><a href=\"" + header_href + "\"><img src=\"" + favicon_src + "\" height=\"32px\" class=\"favicon\"></a> " + page.title + "</h1>";
};

emitHeader = function($header, $page, page) {
  var date, header, isRemotePage, pageHeader, rev, site, viewHere;
  site = $page.data('site');
  isRemotePage = (site != null) && site !== 'local' && site !== 'origin' && site !== 'view';
  header = '';
  viewHere = wiki.asSlug(page.title) === 'welcome-visitors' ? "" : "/view/" + (wiki.asSlug(page.title));
  pageHeader = isRemotePage ? buildPageHeader({
    tooltip: site,
    header_href: "//" + site + "/view/welcome-visitors" + viewHere,
    favicon_src: "" + page.favicon,
    page: page
  }) : buildPageHeader({
    tooltip: location.host,
    header_href: "/view/welcome-visitors" + viewHere,
    favicon_src: "" + page.favicon,
    page: page
  });
  $header.append(pageHeader);
  if (!isRemotePage) {
    $('img.favicon', $page).error(function(e) {
      $('#favicon').attr('href', page.favicon);
      return $('.favicon').attr('src', page.favicon);
    });
  }
  if ($page.attr('id').match(/_rev/)) {
    rev = page.journal.length - 1;
    date = page.journal[rev].date;
    $page.addClass('ghost').data('rev', rev);
    return $header.append($("<h2 class=\"revision\">\n  <span>\n    " + (date != null ? util.formatDate(date) : "Revision " + rev) + "\n  </span>\n</h2>"));
  }
};

emitTwins = wiki.emitTwins = function($page) {
  var actions, bins, page, site, slug, viewing, _ref;
  page = $page.data('data');
  site = $page.data('site') || window.location.host;
  if (site === 'view' || site === 'origin') {
    site = window.location.host;
  }
  slug = wiki.asSlug(page.title);
  if (((actions = (_ref = page.journal) != null ? _ref.length : void 0) != null) && ((viewing = page.version) != null)) {
    bins = {
      newer: [],
      same: [],
      older: []
    };
    console.log(wiki.neighborhood);
    return repository.getTwins(slug, function(pages) {
      var bin, flags, i, legend, twin, twins, _i, _len;
      for (_i = 0, _len = pages.length; _i < _len; _i++) {
        twin = pages[_i];
        bin = twin.version > viewing ? bins.newer : twin.version < viewing ? bins.older : bins.same;
        if (bin !== bins.same) {
          bin.push(twin);
        }
      }
      twins = [];
      for (legend in bins) {
        bin = bins[legend];
        if (!bin.length) {
          continue;
        }
        bin.sort(function(a, b) {
          return a.version < b.version;
        });
        flags = (function() {
          var _j, _len1, _results;
          _results = [];
          for (i = _j = 0, _len1 = bin.length; _j < _len1; i = ++_j) {
            page = bin[i];
            if (i >= 8) {
              break;
            }
            _results.push("<img class=\"remote\"\nsrc=\"" + page.favicon + "\"\ndata-slug=\"" + slug + "\"\ndata-version=\"" + page.version + "\">");
          }
          return _results;
        })();
        twins.push("" + (flags.join('&nbsp;')) + " " + legend);
      }
      if (twins) {
        return $page.find('.twins').html("<p>" + (twins.join(", ")) + "</p>");
      }
    });
  }
};

renderPageIntoPageElement = function(pageData, $page, siteFound) {
  var $footer, $header, $journal, $story, $twins, action, addContext, context, emitItem, page, site, slug, _i, _j, _len, _len1, _ref, _ref1, _ref2;
  page = $.extend(util.emptyPage(), pageData);
  $page.data("data", page);
  slug = $page.attr('id');
  site = $page.data('site');
  context = ['view'];
  if (site != null) {
    context.push(site);
  }
  addContext = function(site) {
    if ((site != null) && !_.include(context, site)) {
      return context.push(site);
    }
  };
  _ref = page.journal.slice(0).reverse();
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    action = _ref[_i];
    addContext(action.site);
  }
  wiki.resolutionContext = context;
  $page.empty();
  _ref1 = ['twins', 'header', 'story', 'journal', 'footer'].map(function(className) {
    return $("<div />").addClass(className).appendTo($page);
  }), $twins = _ref1[0], $header = _ref1[1], $story = _ref1[2], $journal = _ref1[3], $footer = _ref1[4];
  emitHeader($header, $page, page);
  emitItem = function(i) {
    var $item, item;
    if (i >= page.story.length) {
      return;
    }
    item = page.story[i];
    if ((item != null ? item.type : void 0) && (item != null ? item.id : void 0)) {
      $item = $("<div class=\"item " + item.type + "\" data-id=\"" + item.id + "\">");
      $story.append($item);
      return plugin["do"]($item, item, function() {
        return emitItem(i + 1);
      });
    } else {
      $story.append($("<div><p class=\"error\">Can't make sense of story[" + i + "]</p></div>"));
      return emitItem(i + 1);
    }
  };
  emitItem(0);
  _ref2 = page.journal;
  for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
    action = _ref2[_j];
    addToJournal($journal, action);
  }
  emitTwins($page);
  $journal.append("<div class=\"control-buttons\">\n  <a href=\"#\" class=\"button fork-page\" title=\"fork this page\">" + util.symbols['fork'] + "</a>\n  <a href=\"#\" class=\"button add-factory\" title=\"add paragraph\">" + util.symbols['add'] + "</a>\n</div>");
  return $footer.append("<a id=\"license\" href=\"http://creativecommons.org/licenses/by-sa/3.0/\">CC BY-SA 3.0</a> .\n<a class=\"show-page-source\" href=\"/" + slug + ".json?random=" + (util.randomBytes(4)) + "\" title=\"source\">JSON</a> .\n<a href= \"//" + (siteFound || location.host) + "/" + slug + ".html\">" + (siteFound || location.host) + "</a>");
};

wiki.buildPage = function(data, siteFound, $page) {
  if (siteFound === 'local') {
    $page.addClass('local');
  } else if (siteFound) {
    if (siteFound === window.location.host) {
      siteFound = 'origin';
    }
    if (siteFound !== 'view' && siteFound !== 'origin') {
      $page.addClass('remote');
    }
    $page.data('site', siteFound);
  }
  if (data.plugin != null) {
    $page.addClass('plugin');
  }
  $page.addClass(wiki.asSlug(data.title));
  renderPageIntoPageElement(data, $page, siteFound);
  state.setUrl();
  initDragging($page);
  initAddButton($page);
  return $page;
};

module.exports = refresh = wiki.refresh = function() {
  var $page, createGhostPage, pageInformation, registerNeighbors, rev, slug, whenGotten, _ref;
  $page = $(this);
  _ref = $page.attr('id').split('_rev'), slug = _ref[0], rev = _ref[1];
  pageInformation = {
    slug: slug,
    rev: rev,
    site: $page.data('site'),
    version: $page.data('version')
  };
  console.log($page.data('version'));
  createGhostPage = function() {
    var heading, hits, info, page, result, site, title, _ref1, _ref2;
    title = $("a[href=\"/" + slug + ".html\"]:last").text() || slug;
    page = {
      'title': title,
      'story': [
        {
          'id': util.randomBytes(8),
          'type': 'future',
          'text': 'We could not find this page.',
          'title': title
        }
      ],
      'favicon': repository.favicon
    };
    heading = {
      'type': 'paragraph',
      'id': util.randomBytes(8),
      'text': "We did find the page in your current neighborhood."
    };
    hits = [];
    _ref1 = wiki.neighborhood;
    for (site in _ref1) {
      info = _ref1[site];
      if (info.sitemap != null) {
        result = _.find(info.sitemap, function(each) {
          return each.slug === slug;
        });
        if (result != null) {
          hits.push({
            "type": "reference",
            "id": util.randomBytes(8),
            "site": site,
            "slug": slug,
            "title": result.title || slug,
            "text": result.synopsis || ''
          });
        }
      }
    }
    if (hits.length > 0) {
      (_ref2 = page.story).push.apply(_ref2, [heading].concat(__slice.call(hits)));
      page.story[0].text = 'We could not find this page in the expected context.';
    }
    return wiki.buildPage(page, void 0, $page).addClass('ghost');
  };
  registerNeighbors = function(data, site) {
    var action, item, _i, _j, _len, _len1, _ref1, _ref2, _results;
    if (_.include(['local', 'origin', 'view', null, void 0], site)) {
      neighborhood.registerNeighbor(location.host);
    } else {
      neighborhood.registerNeighbor(site);
    }
    _ref1 = data.story || [];
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      item = _ref1[_i];
      if (item.site != null) {
        neighborhood.registerNeighbor(item.site);
      }
    }
    _ref2 = data.journal || [];
    _results = [];
    for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
      action = _ref2[_j];
      if (action.site != null) {
        _results.push(neighborhood.registerNeighbor(action.site));
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };
  whenGotten = function(data, siteFound) {
    wiki.buildPage(data, siteFound, $page);
    return registerNeighbors(data, siteFound);
  };
  return pageHandler.get({
    whenGotten: whenGotten,
    whenNotGotten: createGhostPage,
    pageInformation: pageInformation
  });
};


},{"./addToJournal.coffee":3,"./neighborhood.coffee":6,"./pageHandler.coffee":7,"./plugin.coffee":8,"./repository.coffee":10,"./state.coffee":13,"./util.coffee":15,"./wiki.coffee":16,"underscore":17}],10:[function(require,module,exports){
/* Page Mirroring with IndexedDB*/

var pageStoreOpts, pageToContentObject, plugin, repo, repository, revision, status, statusOpts;

revision = require('./revision.coffee');

plugin = require('./plugin.coffee');

module.exports = wiki.repo = repo = {};

pageToContentObject = function(json) {
  var content, name, signed, slug;
  slug = wiki.asSlug(json.title);
  name = new Name(slug);
  signed = new SignedInfo();
  content = {};
  content.object = new ContentObject(name, signed, json, new Signature());
  content.object.sign();
  content.page = slug;
  return content;
};

repo.favicon = '';

pageStoreOpts = {
  dbVersion: 1,
  storeName: "page",
  autoIncrement: true,
  indexes: [
    {
      name: "name",
      unique: true
    }
  ]
};

statusOpts = {
  dbVersion: 1,
  storeName: "status",
  keypath: 'id',
  autoincrement: true,
  indexes: [
    {
      name: 'type',
      unique: false,
      multiEntry: false
    }
  ],
  onStoreReady: function() {
    var onError, onSuccess;
    onSuccess = function(item) {
      if (item != null) {
        repo.favicon = item.dataUrl;
        return console.log(item);
      } else {
        console.log("222favicon not found, generating...");
        return plugin.get('favicon', function(favicon) {
          return favicon.create(status, repo);
        });
      }
    };
    onError = function() {
      console.log("111favicon not found, generating...");
      return plugin.get('favicon', function(favicon) {
        return favicon.create(status, repo);
      });
    };
    return status.get(1, onSuccess, onError);
  }
};

repo.getSitemap = function(whenGotten) {
  var sitemap;
  return sitemap = new IDBStore({
    dbVersion: 1,
    storeName: "system/sitemap.json",
    keyPath: 'version',
    autoIncrement: false,
    onStoreReady: function() {
      var onsitemaps;
      onsitemaps = function(sitemaps) {
        console.log(sitemaps[0]);
        return whenGotten(sitemaps[sitemaps.length - 1]);
      };
      return sitemap.getAll(onsitemaps);
    }
  });
};

repo.updateSitemap = function() {
  var fetchPages;
  return fetchPages = function(pages) {
    var page, sitemaps, _i, _len;
    for (_i = 0, _len = pages.length; _i < _len; _i++) {
      page = pages[_i];
      console.log(page);
      sitemap.list.push(page.name);
      sitemaps = new IDBStore({
        dbVersion: 1,
        storeName: "system/sitemap.json",
        keyPath: "version",
        autoIncrement: false,
        onStoreReady: function() {
          var onItem;
          onItem = function(data) {
            return sitemaps.remove(data.version);
          };
          return sitemaps.iterate(onItem, {
            order: 'DESC',
            onEnd: function() {
              sitemaps.put(sitemap);
              return console.log("put sitemap");
            }
          });
        }
      });
    }
    repository.getAll(fetchPages);
    return console.log('there');
  };
};

wiki.repo.updatePageFromPeer = function(json) {
  var repository;
  if (json != null) {
    return repository = new IDBStore(pageStoreOpts, function() {
      var onError, onSuccess, page;
      console.log(json.page);
      console.log(repository);
      onSuccess = function() {
        return console.log("success!");
      };
      onError = function() {
        return console.log("already got page!");
      };
      repository.put({
        name: json.page
      }, onSuccess, onError);
      return page = new IDBStore({
        dbVersion: 1,
        storeName: "page/" + json.page,
        keyPath: 'version',
        autoIncrement: false,
        onStoreReady: function() {
          var version, _i, _len, _ref;
          json.version = json.journal[json.journal.length - 1].date;
          _ref = json.excludes;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            version = _ref[_i];
            page.remove(version);
          }
          console.log("putting", json);
          onSuccess = function() {
            console.log("successfully put ", json);
            wiki.emitTwins($("#" + (wiki.asSlug(json.title))));
            if ($("." + (wiki.asSlug(json.title))).hasClass("ghost")) {
              console.log("updated ghost page");
              wiki.buildPage(json, null, $("." + (wiki.asSlug(json.title))));
              return $("." + (wiki.asSlug(json.title))).removeClass("ghost");
            }
          };
          return page.put(json, onSuccess);
        }
      });
    });
  }
};

repo.sendUpdateNotifier = function(json) {
  var closure, face, interest, name, prefix, template, uri, _i, _len, _ref, _results;
  _ref = interfaces.active;
  _results = [];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    face = _ref[_i];
    prefix = wiki.urlToPrefix(face.host);
    uri = prefix + "/page/update/" + json.page + '/' + json.version;
    name = new Name(uri);
    template = {};
    template.childSelector = 1;
    interest = new Interest(name);
    interest.childSelector = 1;
    closure = new ContentClosure(face, name, interest, wiki.repo.updatePageFromPeer);
    _results.push(face.expressInterest(name, closure, template));
  }
  return _results;
};

wiki.repo.updatePage = function(json) {
  var repository;
  if (json != null) {
    return repository = new IDBStore(pageStoreOpts, function() {
      var onError, onSuccess, page;
      console.log(json.page);
      console.log(repository);
      onSuccess = function() {
        return console.log("success!");
      };
      onError = function() {
        return console.log("already got page!");
      };
      repository.put({
        name: json.page
      }, onSuccess, onError);
      return page = new IDBStore({
        dbVersion: 1,
        storeName: "page/" + json.page,
        keyPath: 'version',
        autoIncrement: false,
        onStoreReady: function() {
          var version, _i, _len, _ref;
          json.version = json.journal[json.journal.length - 1].date;
          _ref = json.excludes;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            version = _ref[_i];
            page.remove(version);
          }
          console.log("updating ", json.title);
          onSuccess = function() {
            wiki.emitTwins($("#" + (wiki.asSlug(json.title))));
            if ($("." + (wiki.asSlug(json.title))).hasClass("ghost")) {
              console.log("updated ghost page");
              wiki.buildPage(json, null, $("." + (wiki.asSlug(json.title))));
              $("." + (wiki.asSlug(json.title))).removeClass("ghost");
            }
            if (navigator.onLine === true) {
              console.log("online: successfully updated ", json.title, ", sending update notifier.");
              return repo.sendUpdateNotifier(json);
            } else {
              return console.log("offline: successfully updated ", json.title, " locally.");
            }
          };
          return page.put(json, onSuccess);
        }
      });
    });
  }
};

repo.getTwins = function(slug, callback) {
  var twins;
  return twins = new IDBStore({
    dbVersion: 1,
    storeName: "page/" + slug + ".json",
    keyPath: 'version',
    autoIncrement: false,
    onStoreReady: function() {
      console.log(twins);
      twins.getAll(callback);
      return console.log('got here');
    }
  });
};

repo.getPage = function(pageInformation, whenGotten, whenNotGotten) {
  var page;
  return page = new IDBStore({
    dbVersion: 1,
    storeName: "page/" + pageInformation.slug + ".json",
    keyPath: 'version',
    autoIncrement: false,
    onStoreReady: function() {
      var found, name, onCheckEnd1, onCheckEnd2, onItem1, onItem2;
      name = "/localhost/page/" + pageInformation.slug + ".json";
      if (pageInformation.version != null) {
        console.log('requesting specific version', pageInformation);
        return page.get(pageInformation.version, function(page) {
          console.log(page);
          return whenGotten(page);
        });
      } else {
        found = false;
        onItem1 = function(content, cursor, transaction) {
          console.log(content);
          if (content !== null) {
            if (content.favicon === repo.favicon) {
              if (found === false) {
                found = true;
                return whenGotten(content);
              }
            }
          }
        };
        onItem2 = function(content, cursor, transaction) {
          if (content !== null) {
            if (found === false) {
              found = true;
              return whenGotten(content);
            }
          }
        };
        onCheckEnd1 = function() {
          if (found === false) {
            console.log('found: ', found);
            return page.iterate(onItem2, {
              order: 'DESC',
              onEnd: onCheckEnd2
            });
          }
        };
        onCheckEnd2 = function() {
          if (found === false) {
            console.log('Didnt Find Page!');
            if (whenNotGotten != null) {
              return whenNotGotten();
            }
          }
        };
        return page.iterate(onItem1, {
          order: 'DESC',
          onEnd: onCheckEnd1()
        });
      }
    }
  });
};

status = new IDBStore(statusOpts);

repository = new IDBStore(pageStoreOpts, function() {
  /*
  if navigator.onLine == true
    console.log "online: announcing pages"
    fetchPages = (pages) ->
      for page in pages
        pI = {}
        pI.slug = page.name.slice(0, -5)
        console.log pI      
        repo.getPage(pI, repo.sendUpdateNotifier)
    repository.getAll(fetchPages)
  else
    console.log "offline: repository index initialized"
  */

});


},{"./plugin.coffee":8,"./revision.coffee":11}],11:[function(require,module,exports){
var create;

create = function(revIndex, data) {
  var afterIndex, editIndex, itemId, items, journal, journalEntry, removeIndex, revJournal, revStory, revStoryIds, revTitle, storyItem, _i, _j, _k, _len, _len1, _len2, _ref;
  journal = data.journal;
  revTitle = data.title;
  revStory = [];
  revJournal = journal.slice(0, +(+revIndex) + 1 || 9e9);
  for (_i = 0, _len = revJournal.length; _i < _len; _i++) {
    journalEntry = revJournal[_i];
    revStoryIds = revStory.map(function(storyItem) {
      return storyItem.id;
    });
    switch (journalEntry.type) {
      case 'create':
        if (journalEntry.item.title != null) {
          revTitle = journalEntry.item.title;
          revStory = journalEntry.item.story || [];
        }
        break;
      case 'add':
        if ((afterIndex = revStoryIds.indexOf(journalEntry.after)) !== -1) {
          revStory.splice(afterIndex + 1, 0, journalEntry.item);
        } else {
          revStory.push(journalEntry.item);
        }
        break;
      case 'edit':
        if ((editIndex = revStoryIds.indexOf(journalEntry.id)) !== -1) {
          revStory.splice(editIndex, 1, journalEntry.item);
        } else {
          revStory.push(journalEntry.item);
        }
        break;
      case 'move':
        items = {};
        for (_j = 0, _len1 = revStory.length; _j < _len1; _j++) {
          storyItem = revStory[_j];
          items[storyItem.id] = storyItem;
        }
        revStory = [];
        _ref = journalEntry.order;
        for (_k = 0, _len2 = _ref.length; _k < _len2; _k++) {
          itemId = _ref[_k];
          if (items[itemId] != null) {
            revStory.push(items[itemId]);
          }
        }
        break;
      case 'remove':
        if ((removeIndex = revStoryIds.indexOf(journalEntry.id)) !== -1) {
          revStory.splice(removeIndex, 1);
        }
    }
  }
  return {
    story: revStory,
    journal: revJournal,
    title: revTitle
  };
};

exports.create = create;


},{}],12:[function(require,module,exports){
var active, createSearch, util, wiki;

wiki = require('./wiki.coffee');

util = require('./util.coffee');

active = require('./active.coffee');

createSearch = function(_arg) {
  var neighborhood, performSearch;
  neighborhood = _arg.neighborhood;
  performSearch = function(searchQuery) {
    var $searchResultPage, explanatoryPara, result, searchResultPageData, searchResultReferences, searchResults, tally;
    searchResults = neighborhood.search(searchQuery);
    tally = searchResults.tally;
    explanatoryPara = {
      type: 'paragraph',
      id: util.randomBytes(8),
      text: "String '" + searchQuery + "' found on " + (tally.finds || 'none') + " of " + (tally.pages || 'no') + " pages from " + (tally.sites || 'no') + " sites.\nText matched on " + (tally.title || 'no') + " titles, " + (tally.text || 'no') + " paragraphs, and " + (tally.slug || 'no') + " slugs.\nElapsed time " + tally.msec + " milliseconds."
    };
    searchResultReferences = (function() {
      var _i, _len, _ref, _results;
      _ref = searchResults.finds;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        result = _ref[_i];
        _results.push({
          "type": "reference",
          "id": util.randomBytes(8),
          "site": result.site,
          "slug": result.page.slug,
          "title": result.page.title,
          "text": result.page.synopsis || ''
        });
      }
      return _results;
    })();
    searchResultPageData = {
      title: "Search Results",
      story: [explanatoryPara].concat(searchResultReferences)
    };
    $searchResultPage = wiki.createPage('search-results').addClass('ghost');
    $searchResultPage.appendTo($('.main'));
    wiki.buildPage(searchResultPageData, null, $searchResultPage);
    return active.set($('.page').last());
  };
  return {
    performSearch: performSearch
  };
};

module.exports = createSearch;


},{"./active.coffee":2,"./util.coffee":15,"./wiki.coffee":16}],13:[function(require,module,exports){
var active, state, wiki,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

wiki = require('./wiki.coffee');

active = require('./active.coffee');

module.exports = state = {};

state.pagesInDom = function() {
  return $.makeArray($(".page").map(function(_, el) {
    return el.id;
  }));
};

state.urlPages = function() {
  var i;
  return ((function() {
    var _i, _len, _ref, _results;
    _ref = $(location).attr('pathname').split('/');
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i += 2) {
      i = _ref[_i];
      _results.push(i);
    }
    return _results;
  })()).slice(1);
};

state.locsInDom = function() {
  return $.makeArray($(".page").map(function(_, el) {
    return $(el).data('site') || 'view';
  }));
};

state.urlLocs = function() {
  var j, _i, _len, _ref, _results;
  _ref = $(location).attr('pathname').split('/').slice(1);
  _results = [];
  for (_i = 0, _len = _ref.length; _i < _len; _i += 2) {
    j = _ref[_i];
    _results.push(j);
  }
  return _results;
};

state.setUrl = function() {
  var idx, locs, page, pages, url, _ref;
  document.title = (_ref = $('.page:last').data('data')) != null ? _ref.title : void 0;
  if (history && history.pushState) {
    locs = state.locsInDom();
    pages = state.pagesInDom();
    url = ((function() {
      var _i, _len, _results;
      _results = [];
      for (idx = _i = 0, _len = pages.length; _i < _len; idx = ++_i) {
        page = pages[idx];
        _results.push("/" + ((locs != null ? locs[idx] : void 0) || 'view') + "/" + page);
      }
      return _results;
    })()).join('');
    if (url !== $(location).attr('pathname')) {
      return history.pushState(null, null, url);
    }
  }
};

state.show = function(e) {
  var idx, name, newLocs, newPages, old, oldLocs, oldPages, previous, _i, _len, _ref;
  oldPages = state.pagesInDom();
  newPages = state.urlPages();
  oldLocs = state.locsInDom();
  newLocs = state.urlLocs();
  if (!location.pathname || location.pathname === '/') {
    return;
  }
  previous = $('.page').eq(0);
  for (idx = _i = 0, _len = newPages.length; _i < _len; idx = ++_i) {
    name = newPages[idx];
    if (name !== oldPages[idx]) {
      old = $('.page').eq(idx);
      if (old) {
        old.remove();
      }
      wiki.createPage(name, newLocs[idx]).insertAfter(previous).each(wiki.refresh);
    }
    previous = $('.page').eq(idx);
  }
  previous.nextAll().remove();
  active.set($('.page').last());
  return document.title = (_ref = $('.page:last').data('data')) != null ? _ref.title : void 0;
};

state.first = function() {
  var firstUrlLocs, firstUrlPages, idx, oldPages, urlPage, _i, _len, _results;
  state.setUrl();
  firstUrlPages = state.urlPages();
  firstUrlLocs = state.urlLocs();
  oldPages = state.pagesInDom();
  _results = [];
  for (idx = _i = 0, _len = firstUrlPages.length; _i < _len; idx = ++_i) {
    urlPage = firstUrlPages[idx];
    if (__indexOf.call(oldPages, urlPage) < 0) {
      if (urlPage !== '') {
        _results.push(wiki.createPage(urlPage, firstUrlLocs[idx]).appendTo('.main'));
      } else {
        _results.push(void 0);
      }
    }
  }
  return _results;
};


},{"./active.coffee":2,"./wiki.coffee":16}],14:[function(require,module,exports){
module.exports = function(page) {
  var p1, p2, synopsis;
  synopsis = page.synopsis;
  if ((page != null) && (page.story != null)) {
    p1 = page.story[0];
    p2 = page.story[1];
    if (p1 && p1.type === 'paragraph') {
      synopsis || (synopsis = p1.text);
    }
    if (p2 && p2.type === 'paragraph') {
      synopsis || (synopsis = p2.text);
    }
    if (p1 && (p1.text != null)) {
      synopsis || (synopsis = p1.text);
    }
    if (p2 && (p2.text != null)) {
      synopsis || (synopsis = p2.text);
    }
    synopsis || (synopsis = (page.story != null) && ("A page with " + page.story.length + " items."));
  } else {
    synopsis = 'A page with no story.';
  }
  return synopsis;
};


},{}],15:[function(require,module,exports){
var util, wiki;

wiki = require('./wiki.coffee');

module.exports = wiki.util = util = {};

util.symbols = {
  create: '☼',
  add: '+',
  edit: '✎',
  fork: '⚑',
  move: '↕',
  remove: '✕'
};

util.randomByte = function() {
  return (((1 + Math.random()) * 0x100) | 0).toString(16).substring(1);
};

util.randomBytes = function(n) {
  return ((function() {
    var _i, _results;
    _results = [];
    for (_i = 1; 1 <= n ? _i <= n : _i >= n; 1 <= n ? _i++ : _i--) {
      _results.push(util.randomByte());
    }
    return _results;
  })()).join('');
};

util.formatTime = function(time) {
  var am, d, h, mi, mo;
  d = new Date((time > 10000000000 ? time : time * 1000));
  mo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  h = d.getHours();
  am = h < 12 ? 'AM' : 'PM';
  h = h === 0 ? 12 : h > 12 ? h - 12 : h;
  mi = (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
  return "" + h + ":" + mi + " " + am + "<br>" + (d.getDate()) + " " + mo + " " + (d.getFullYear());
};

util.formatDate = function(msSinceEpoch) {
  var am, d, day, h, mi, mo, sec, wk, yr;
  d = new Date(msSinceEpoch);
  wk = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  mo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  day = d.getDate();
  yr = d.getFullYear();
  h = d.getHours();
  am = h < 12 ? 'AM' : 'PM';
  h = h === 0 ? 12 : h > 12 ? h - 12 : h;
  mi = (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
  sec = (d.getSeconds() < 10 ? "0" : "") + d.getSeconds();
  return "" + wk + " " + mo + " " + day + ", " + yr + "<br>" + h + ":" + mi + ":" + sec + " " + am;
};

util.formatElapsedTime = function(msSinceEpoch) {
  var days, hrs, mins, months, msecs, secs, weeks, years;
  msecs = new Date().getTime() - msSinceEpoch;
  if ((secs = msecs / 1000) < 2) {
    return "" + (Math.floor(msecs)) + " milliseconds ago";
  }
  if ((mins = secs / 60) < 2) {
    return "" + (Math.floor(secs)) + " seconds ago";
  }
  if ((hrs = mins / 60) < 2) {
    return "" + (Math.floor(mins)) + " minutes ago";
  }
  if ((days = hrs / 24) < 2) {
    return "" + (Math.floor(hrs)) + " hours ago";
  }
  if ((weeks = days / 7) < 2) {
    return "" + (Math.floor(days)) + " days ago";
  }
  if ((months = days / 31) < 2) {
    return "" + (Math.floor(weeks)) + " weeks ago";
  }
  if ((years = days / 365) < 2) {
    return "" + (Math.floor(months)) + " months ago";
  }
  return "" + (Math.floor(years)) + " years ago";
};

util.emptyPage = function() {
  return {
    title: 'empty',
    story: [],
    journal: []
  };
};

util.getSelectionPos = function(jQueryElement) {
  var el, iePos, sel;
  el = jQueryElement.get(0);
  if (document.selection) {
    el.focus();
    sel = document.selection.createRange();
    sel.moveStart('character', -el.value.length);
    iePos = sel.text.length;
    return {
      start: iePos,
      end: iePos
    };
  } else {
    return {
      start: el.selectionStart,
      end: el.selectionEnd
    };
  }
};

util.setCaretPosition = function(jQueryElement, caretPos) {
  var el, range;
  el = jQueryElement.get(0);
  if (el != null) {
    if (el.createTextRange) {
      range = el.createTextRange();
      range.move("character", caretPos);
      range.select();
    } else {
      el.setSelectionRange(caretPos, caretPos);
    }
    return el.focus();
  }
};


},{"./wiki.coffee":16}],16:[function(require,module,exports){
var createSynopsis, wiki,
  __slice = [].slice;

createSynopsis = require('./synopsis.coffee');

wiki = {
  createSynopsis: createSynopsis
};

wiki.log = function() {
  var things;
  things = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  if ((typeof console !== "undefined" && console !== null ? console.log : void 0) != null) {
    return console.log.apply(console, things);
  }
};

wiki.asSlug = function(name) {
  return name.replace(/\s/g, '-').replace(/[^A-Za-z0-9-]/g, '').toLowerCase();
};

wiki.useLocalStorage = function() {
  return $(".login").length > 0;
};

wiki.urlToPrefix = function(url) {
  var component, hostComponents, prefix, _i, _len;
  prefix = '';
  hostComponents = url.split('.');
  for (_i = 0, _len = hostComponents.length; _i < _len; _i++) {
    component = hostComponents[_i];
    if (component !== 'www') {
      if (component !== 'http://www') {
        if (component !== 'http://') {
          prefix = ("/" + component) + prefix;
        }
      }
    }
  }
  return prefix;
};

wiki.resolutionContext = [];

wiki.resolveFrom = function(addition, callback) {
  wiki.resolutionContext.push(addition);
  try {
    return callback();
  } finally {
    wiki.resolutionContext.pop();
  }
};

wiki.getData = function(vis) {
  var idx, who;
  if (vis) {
    idx = $('.item').index(vis);
    who = $(".item:lt(" + idx + ")").filter('.chart,.data,.calculator').last();
    if (who != null) {
      return who.data('item').data;
    } else {
      return {};
    }
  } else {
    who = $('.chart,.data,.calculator').last();
    if (who != null) {
      return who.data('item').data;
    } else {
      return {};
    }
  }
};

wiki.getDataNodes = function(vis) {
  var idx, who;
  if (vis) {
    idx = $('.item').index(vis);
    who = $(".item:lt(" + idx + ")").filter('.chart,.data,.calculator').toArray().reverse();
    return $(who);
  } else {
    who = $('.chart,.data,.calculator').toArray().reverse();
    return $(who);
  }
};

wiki.createPage = function(name, loc, version) {
  var $page, site;
  if (loc && loc !== 'view') {
    site = loc;
  }
  console.log(version);
  $page = $("<div class=\"page\" id=\"" + name + "\">\n  <div class=\"twins\"> <p> </p> </div>\n  <div class=\"header\">\n    <h1> <img class=\"favicon\" src=\"" + (site ? "//" + site : "") + "/favicon.png\" height=\"32px\"> " + name + " </h1>\n  </div>\n</div>");
  if (version) {
    $page.data('version', version);
  }
  if (site) {
    $page.find('.page').attr('data-site', site);
  }
  console.log($page.find('.page').data('version'));
  return $page;
};

wiki.getItem = function(element) {
  if ($(element).length > 0) {
    return $(element).data("item") || $(element).data('staticItem');
  }
};

wiki.resolveLinks = function(string) {
  var renderInternalLink;
  renderInternalLink = function(match, name) {
    var ccnName, closure, face, interest, pageURI, slug, template, _i, _len, _ref;
    slug = wiki.asSlug(name);
    if (navigator.onLine === true) {
      console.log("online: retrieving pages from rendered links");
      if (interfaces !== 'server') {
        _ref = interfaces.active;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          face = _ref[_i];
          pageURI = face.prefixURI + '/page/' + slug + '.json';
          ccnName = new Name(pageURI);
          interest = new Interest(ccnName);
          interest.childSelector = 1;
          template = {};
          template.childSelector = interest.childSelector;
          closure = new ContentClosure(face, ccnName, interest, wiki.repo.updatePage);
          if (face.transport.ws !== null) {
            face.expressInterest(ccnName, closure, template);
          }
        }
      }
    }
    return "<a class=\"internal\" href=\"/" + slug + ".html\" data-page-name=\"" + slug + "\" title=\"" + (wiki.resolutionContext.join(' => ')) + "\">" + name + "</a>";
  };
  return string.replace(/\[\[([^\]]+)\]\]/gi, renderInternalLink).replace(/\[(http.*?) (.*?)\]/gi, "<a class=\"external\" target=\"_blank\" href=\"$1\" title=\"$1\" rel=\"nofollow\">$2 <img src=\"/images/external-link-ltr-icon.png\"></a>");
};

module.exports = wiki;


},{"./synopsis.coffee":14}],17:[function(require,module,exports){
//     Underscore.js 1.5.1
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.5.1';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? void 0 : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed > result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value == null ? _.identity : value);
    each(obj, function(value, index) {
      var key = iterator.call(context, value, index, obj);
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key) {
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var length = _.max(_.pluck(arguments, "length").concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error("bindAll must be passed function names");
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var result;
    var timeout = null;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

},{}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvcm9vdC9TbWFsbGVzdC1GZWRlcmF0ZWQtV2lraS9jbGllbnQvY2xpZW50LmNvZmZlZSIsIi9yb290L1NtYWxsZXN0LUZlZGVyYXRlZC1XaWtpL2NsaWVudC9saWIvYWN0aXZlLmNvZmZlZSIsIi9yb290L1NtYWxsZXN0LUZlZGVyYXRlZC1XaWtpL2NsaWVudC9saWIvYWRkVG9Kb3VybmFsLmNvZmZlZSIsIi9yb290L1NtYWxsZXN0LUZlZGVyYXRlZC1XaWtpL2NsaWVudC9saWIvaW50ZXJmYWNlcy5jb2ZmZWUiLCIvcm9vdC9TbWFsbGVzdC1GZWRlcmF0ZWQtV2lraS9jbGllbnQvbGliL2xlZ2FjeS5jb2ZmZWUiLCIvcm9vdC9TbWFsbGVzdC1GZWRlcmF0ZWQtV2lraS9jbGllbnQvbGliL25laWdoYm9yaG9vZC5jb2ZmZWUiLCIvcm9vdC9TbWFsbGVzdC1GZWRlcmF0ZWQtV2lraS9jbGllbnQvbGliL3BhZ2VIYW5kbGVyLmNvZmZlZSIsIi9yb290L1NtYWxsZXN0LUZlZGVyYXRlZC1XaWtpL2NsaWVudC9saWIvcGx1Z2luLmNvZmZlZSIsIi9yb290L1NtYWxsZXN0LUZlZGVyYXRlZC1XaWtpL2NsaWVudC9saWIvcmVmcmVzaC5jb2ZmZWUiLCIvcm9vdC9TbWFsbGVzdC1GZWRlcmF0ZWQtV2lraS9jbGllbnQvbGliL3JlcG9zaXRvcnkuY29mZmVlIiwiL3Jvb3QvU21hbGxlc3QtRmVkZXJhdGVkLVdpa2kvY2xpZW50L2xpYi9yZXZpc2lvbi5jb2ZmZWUiLCIvcm9vdC9TbWFsbGVzdC1GZWRlcmF0ZWQtV2lraS9jbGllbnQvbGliL3NlYXJjaC5jb2ZmZWUiLCIvcm9vdC9TbWFsbGVzdC1GZWRlcmF0ZWQtV2lraS9jbGllbnQvbGliL3N0YXRlLmNvZmZlZSIsIi9yb290L1NtYWxsZXN0LUZlZGVyYXRlZC1XaWtpL2NsaWVudC9saWIvc3lub3BzaXMuY29mZmVlIiwiL3Jvb3QvU21hbGxlc3QtRmVkZXJhdGVkLVdpa2kvY2xpZW50L2xpYi91dGlsLmNvZmZlZSIsIi9yb290L1NtYWxsZXN0LUZlZGVyYXRlZC1XaWtpL2NsaWVudC9saWIvd2lraS5jb2ZmZWUiLCIvcm9vdC9TbWFsbGVzdC1GZWRlcmF0ZWQtV2lraS9jbGllbnQvbm9kZV9tb2R1bGVzL3VuZGVyc2NvcmUvdW5kZXJzY29yZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsQ0FBTyxFQUFPLENBQWQsRUFBTSxDQUFRLFlBQUE7O0FBQ2QsQ0FEQSxNQUNBLGNBQUE7Ozs7QUNEQSxJQUFBLGlDQUFBOztBQUFBLENBQUEsQ0FBQSxDQUFpQixHQUFYLENBQU47O0FBR0EsQ0FIQSxFQUd5QixHQUFuQixTQUFOOztBQUNBLENBSkEsRUFJc0IsTUFBQSxVQUF0QjtDQUNFLEtBQUEsRUFBQTtDQUFBLENBQUEsQ0FBVyxHQUFBLEVBQVgsQ0FBa0MsR0FBdkI7Q0FBMEIsRUFBdUIsQ0FBdkIsTUFBQSxDQUFBO0NBQTFCLEVBQXVCO0NBQ2xDLENBQUEsQ0FBcUIsQ0FBbEIsRUFBQSxFQUFRO0NBQVgsVUFDRTtJQURGLEVBQUE7Q0FHRSxDQUFBLENBQXNDLEdBQXRDLEdBQXNDLENBQXRDLENBQUEsQ0FBQTtDQUF5QyxFQUF1QixDQUF2QixNQUFBLEdBQUE7Q0FBekMsSUFBc0MsSUFBdEM7SUFMa0I7Q0FBQTs7QUFPdEIsQ0FYQSxDQVdXLENBQUEsS0FBWCxDQUFZO0NBQ1YsS0FBQSw0Q0FBQTs7Q0FBTyxFQUFtQixDQUExQixFQUFNLGFBQW9CO0lBQTFCO0NBQUEsQ0FDQSxDQUFZLEVBQUEsQ0FBQSxHQUFaO0NBREEsQ0FFQSxDQUFPLENBQVAsRUFBYSxJQUFOLEtBQXNCO0NBRjdCLENBR0EsQ0FBTyxDQUFQLEtBSEE7Q0FBQSxDQUlBLENBQVMsQ0FKVCxFQUlBLEVBQVM7Q0FKVCxDQUtBLENBQVEsQ0FBQSxDQUFSLEtBQVE7Q0FMUixDQU1BLENBQWUsQ0FBQSxHQUFBLEdBQUEsRUFBZjtDQUVBLENBQUEsQ0FBWSxDQUFULEVBQUE7Q0FDTSxLQUFELENBQU4s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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIndpbmRvdy53aWtpID0gcmVxdWlyZSgnLi9saWIvd2lraS5jb2ZmZWUnKVxucmVxdWlyZSgnLi9saWIvbGVnYWN5LmNvZmZlZScpXG5cbiIsIm1vZHVsZS5leHBvcnRzID0gYWN0aXZlID0ge31cbiMgRlVOQ1RJT05TIGFuZCBIQU5ETEVSUyB0byBtYW5hZ2UgdGhlIGFjdGl2ZSBwYWdlLCBhbmQgc2Nyb2xsIHZpZXdwb3J0IHRvIHNob3cgaXRcblxuYWN0aXZlLnNjcm9sbENvbnRhaW5lciA9IHVuZGVmaW5lZFxuZmluZFNjcm9sbENvbnRhaW5lciA9IC0+XG4gIHNjcm9sbGVkID0gJChcImJvZHksIGh0bWxcIikuZmlsdGVyIC0+ICQodGhpcykuc2Nyb2xsTGVmdCgpID4gMFxuICBpZiBzY3JvbGxlZC5sZW5ndGggPiAwXG4gICAgc2Nyb2xsZWRcbiAgZWxzZVxuICAgICQoXCJib2R5LCBodG1sXCIpLnNjcm9sbExlZnQoMTIpLmZpbHRlcigtPiAkKHRoaXMpLnNjcm9sbExlZnQoKSA+IDApLnNjcm9sbFRvcCgwKVxuXG5zY3JvbGxUbyA9IChlbCkgLT5cbiAgYWN0aXZlLnNjcm9sbENvbnRhaW5lciA/PSBmaW5kU2Nyb2xsQ29udGFpbmVyKClcbiAgYm9keVdpZHRoID0gJChcImJvZHlcIikud2lkdGgoKVxuICBtaW5YID0gYWN0aXZlLnNjcm9sbENvbnRhaW5lci5zY3JvbGxMZWZ0KClcbiAgbWF4WCA9IG1pblggKyBib2R5V2lkdGhcbiAgdGFyZ2V0ID0gZWwucG9zaXRpb24oKS5sZWZ0XG4gIHdpZHRoID0gZWwub3V0ZXJXaWR0aCh0cnVlKVxuICBjb250ZW50V2lkdGggPSAkKFwiLnBhZ2VcIikub3V0ZXJXaWR0aCh0cnVlKSAqICQoXCIucGFnZVwiKS5zaXplKClcblxuICBpZiB0YXJnZXQgPCBtaW5YXG4gICAgYWN0aXZlLnNjcm9sbENvbnRhaW5lci5hbmltYXRlIHNjcm9sbExlZnQ6IHRhcmdldFxuICBlbHNlIGlmIHRhcmdldCArIHdpZHRoID4gbWF4WFxuICAgIGFjdGl2ZS5zY3JvbGxDb250YWluZXIuYW5pbWF0ZSBzY3JvbGxMZWZ0OiB0YXJnZXQgLSAoYm9keVdpZHRoIC0gd2lkdGgpXG4gIGVsc2UgaWYgbWF4WCA+ICQoXCIucGFnZXNcIikub3V0ZXJXaWR0aCgpXG4gICAgYWN0aXZlLnNjcm9sbENvbnRhaW5lci5hbmltYXRlIHNjcm9sbExlZnQ6IE1hdGgubWluKHRhcmdldCwgY29udGVudFdpZHRoIC0gYm9keVdpZHRoKVxuXG5hY3RpdmUuc2V0ID0gKGVsKSAtPlxuICBlbCA9ICQoZWwpXG4gICQoXCIuYWN0aXZlXCIpLnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpXG4gIHNjcm9sbFRvIGVsLmFkZENsYXNzKFwiYWN0aXZlXCIpXG5cbiIsInV0aWwgPSByZXF1aXJlICcuL3V0aWwuY29mZmVlJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IChqb3VybmFsRWxlbWVudCwgYWN0aW9uKSAtPlxuICBwYWdlRWxlbWVudCA9IGpvdXJuYWxFbGVtZW50LnBhcmVudHMoJy5wYWdlOmZpcnN0JylcbiAgcHJldiA9IGpvdXJuYWxFbGVtZW50LmZpbmQoXCIuZWRpdFtkYXRhLWlkPSN7YWN0aW9uLmlkIHx8IDB9XVwiKSBpZiBhY3Rpb24udHlwZSA9PSAnZWRpdCdcbiAgYWN0aW9uVGl0bGUgPSBhY3Rpb24udHlwZVxuICBhY3Rpb25UaXRsZSArPSBcIiAje3V0aWwuZm9ybWF0RWxhcHNlZFRpbWUoYWN0aW9uLmRhdGUpfVwiIGlmIGFjdGlvbi5kYXRlP1xuICBhY3Rpb25FbGVtZW50ID0gJChcIlwiXCI8YSBocmVmPVwiI1wiIC8+IFwiXCJcIikuYWRkQ2xhc3MoXCJhY3Rpb25cIikuYWRkQ2xhc3MoYWN0aW9uLnR5cGUpXG4gICAgLnRleHQodXRpbC5zeW1ib2xzW2FjdGlvbi50eXBlXSlcbiAgICAuYXR0cigndGl0bGUnLGFjdGlvblRpdGxlKVxuICAgIC5hdHRyKCdkYXRhLWlkJywgYWN0aW9uLmlkIHx8IFwiMFwiKVxuICAgIC5kYXRhKCdhY3Rpb24nLCBhY3Rpb24pXG4gIGNvbnRyb2xzID0gam91cm5hbEVsZW1lbnQuY2hpbGRyZW4oJy5jb250cm9sLWJ1dHRvbnMnKVxuICBpZiBjb250cm9scy5sZW5ndGggPiAwXG4gICAgYWN0aW9uRWxlbWVudC5pbnNlcnRCZWZvcmUoY29udHJvbHMpXG4gIGVsc2VcbiAgICBhY3Rpb25FbGVtZW50LmFwcGVuZFRvKGpvdXJuYWxFbGVtZW50KVxuICBpZiBhY3Rpb24udHlwZSA9PSAnZm9yaycgYW5kIGFjdGlvbi5zaXRlP1xuICAgIGFjdGlvbkVsZW1lbnRcbiAgICAgIC5jc3MoXCJiYWNrZ3JvdW5kLWltYWdlXCIsIFwidXJsKC8vI3thY3Rpb24uc2l0ZX0vZmF2aWNvbi5wbmcpXCIpXG4gICAgICAuYXR0cihcImhyZWZcIiwgXCIvLyN7YWN0aW9uLnNpdGV9LyN7cGFnZUVsZW1lbnQuYXR0cignaWQnKX0uaHRtbFwiKVxuICAgICAgLmRhdGEoXCJzaXRlXCIsIGFjdGlvbi5zaXRlKVxuICAgICAgLmRhdGEoXCJzbHVnXCIsIHBhZ2VFbGVtZW50LmF0dHIoJ2lkJykpXG5cbiIsIiMgRnVuY3Rpb25zIHRvIG1hbmFnZSBORE4gSW50ZXJmYWNlcywgcmVnaXN0ZXIgcHJlZml4ZXMsIGFuZCBleHByZXNzIGludGVyZXN0c1xucmVwbyA9IHJlcXVpcmUgJy4vcmVwb3NpdG9yeS5jb2ZmZWUnXG5cbndpbmRvdy5pbnRlcmZhY2VzID0ge31cbmludGVyZmFjZXMuZmFjZXMgPSB7fVxuaW50ZXJmYWNlcy5saXN0ID0gW11cbmludGVyZmFjZXMuYWN0aXZlID0gW11cblxuaW50ZXJlc3RIYW5kbGVyID0gKGZhY2UsIHVwY2FsbEluZm8pIC0+XG4gICNsb2dpYyBnb2VzIGhlcmVcbiAgc2VuZERhdGEgPSAoZGF0YSkgLT5cbiAgICBzaWduZWQgPSBuZXcgU2lnbmVkSW5mbygpXG4gICAgc2VudCA9IGZhbHNlXG4gICAgY29uc29sZS5sb2cgZGF0YVxuICAgIGlmIGludGVyZXN0Lm1hdGNoZXNfbmFtZShuZXcgTmFtZShpbnRlcmVzdC5uYW1lLnRvX3VyaSgpICsgJy8nICsgZGF0YS52ZXJzaW9uKSkgPT0gdHJ1ZSAmJiBzZW50ID09IGZhbHNlXG4gICAgICBjb25zb2xlLmxvZyBkYXRhXG4gICAgICBzdHJpbmcgPSBKU09OLnN0cmluZ2lmeShkYXRhKVxuICAgICAgY29uc29sZS5sb2cgc3RyaW5nXG4gICAgICBjbyA9IG5ldyBDb250ZW50T2JqZWN0KG5ldyBOYW1lKHVwY2FsbEluZm8uaW50ZXJlc3QubmFtZS50b191cmkoKSArICcvJyArIGRhdGEudmVyc2lvbiksIHNpZ25lZCwgc3RyaW5nLCBuZXcgU2lnbmF0dXJlKCkpXG4gICAgICBjb25zb2xlLmxvZyBjb1xuICAgICAgY28uc2lnbmVkSW5mby5mcmVzaG5lc3NTZWNvbmRzID0gNjA0ODAwXG4gICAgICBjby5zaWduKClcbiAgICAgIHVwY2FsbEluZm8uY29udGVudE9iamVjdCA9IGNvXG4gICAgICBmYWNlLnRyYW5zcG9ydC5zZW5kKGVuY29kZVRvQmluYXJ5Q29udGVudE9iamVjdCh1cGNhbGxJbmZvLmNvbnRlbnRPYmplY3QpKVxuICBjb250ZW50U3RvcmUgPSBEYXRhVXRpbHMudG9TdHJpbmcodXBjYWxsSW5mby5pbnRlcmVzdC5uYW1lLmNvbXBvbmVudHNbZmFjZS5wcmVmaXguY29tcG9uZW50cy5sZW5ndGhdKVxuICBpbnRlcmVzdCA9IHVwY2FsbEluZm8uaW50ZXJlc3RcbiAgXG4gIGlmIGNvbnRlbnRTdG9yZSA9PSAncGFnZSdcbiAgICBwSSA9IHt9XG4gICAgaWYgRGF0YVV0aWxzLnRvU3RyaW5nKHVwY2FsbEluZm8uaW50ZXJlc3QubmFtZS5jb21wb25lbnRzW2ZhY2UucHJlZml4LmNvbXBvbmVudHMubGVuZ3RoICsgMV0pID09ICd1cGRhdGUnXG4gICAgICB3aXRoSnNvbiA9IERhdGFVdGlscy50b1N0cmluZyh1cGNhbGxJbmZvLmludGVyZXN0Lm5hbWUuY29tcG9uZW50c1tmYWNlLnByZWZpeC5jb21wb25lbnRzLmxlbmd0aCArIDJdKVxuICAgICAgcEkuc2x1ZyA9IHdpdGhKc29uLnNsaWNlKDAsIC01KVxuICAgICAgY29uc29sZS5sb2cgcEkuc2x1Z1xuICAgICAgcmVwby5nZXRQYWdlKHBJICwgc2VuZERhdGEpXG4gICAgICBzbHVnID0gRGF0YVV0aWxzLnRvU3RyaW5nKHVwY2FsbEluZm8uaW50ZXJlc3QubmFtZS5jb21wb25lbnRzW2ZhY2UucHJlZml4LmNvbXBvbmVudHMubGVuZ3RoICsgMl0pXG4gICAgICB1cGRhdGVVUkljaHVua3MgPSB1cGNhbGxJbmZvLmludGVyZXN0Lm5hbWUuZ2V0TmFtZSgpLnNwbGl0KCcvdXBkYXRlJylcbiAgICAgIHBhZ2VVUkkgPSB1cGRhdGVVUkljaHVua3NbMF0gKyB1cGRhdGVVUkljaHVua3NbMV1cbiAgICAgIG5hbWUgPSBuZXcgTmFtZShwYWdlVVJJKVxuICAgICAgaW50ZXJlc3QgPSBuZXcgSW50ZXJlc3QobmFtZSlcbiAgICAgIGNsb3N1cmUgPSBuZXcgQ29udGVudENsb3N1cmUoZmFjZSwgbmFtZSwgaW50ZXJlc3QsIHJlcG8udXBkYXRlUGFnZUZyb21QZWVyKVxuICAgICAgZmFjZS5leHByZXNzSW50ZXJlc3QobmFtZSwgY2xvc3VyZSkgICAgIFxuICAgIGVsc2VcbiAgICAgIHBJID0ge31cbiAgICAgIGlmICh1cGNhbGxJbmZvLmludGVyZXN0Lm5hbWUuY29tcG9uZW50cy5sZW5ndGggLSBmYWNlLnByZWZpeC5jb21wb25lbnRzLmxlbmd0aCkgPT0gMyAjIGludGVyZXN0IGhhcyB2ZXJzaW9uIG51bWJlclxuICAgICAgICBjb25zb2xlLmxvZyBcImdldHRpbmcgcGFnZSByZXF1ZXN0ZWQgd2l0aCB2ZXJzaW9uXCJcbiAgICAgICAgcEkudmVyc2lvbiA9IHBhcnNlSW50KERhdGFVdGlscy50b1N0cmluZyh1cGNhbGxJbmZvLmludGVyZXN0Lm5hbWUuY29tcG9uZW50c1t1cGNhbGxJbmZvLmludGVyZXN0Lm5hbWUuY29tcG9uZW50cy5sZW5ndGggLSAxXSkpXG4gICAgICB3aXRoSnNvbiA9IERhdGFVdGlscy50b1N0cmluZyh1cGNhbGxJbmZvLmludGVyZXN0Lm5hbWUuY29tcG9uZW50c1tmYWNlLnByZWZpeC5jb21wb25lbnRzLmxlbmd0aCArIDFdKVxuICAgICAgcEkuc2x1ZyA9IHdpdGhKc29uLnNsaWNlKDAsIC01KVxuICAgICAgY29uc29sZS5sb2cgcEkuc2x1Z1xuICAgICAgcmVwby5nZXRQYWdlKHBJICwgc2VuZERhdGEpXG4gIGVsc2UgaWYgY29udGVudFN0b3JlID09ICdzeXN0ZW0nXG4gICAgaWYgRGF0YVV0aWxzLnRvU3RyaW5nKHVwY2FsbEluZm8uaW50ZXJlc3QubmFtZS5jb21wb25lbnRzW2ZhY2UucHJlZml4LmNvbXBvbmVudHMubGVuZ3RoICsgMV0pID09ICdzaXRlbWFwLmpzb24nXG4gICAgICByZXBvLmdldFNpdGVtYXAoc2VuZERhdGEpXG4gICAgICBcbmludGVyZmFjZXMucmVnaXN0ZXJGYWNlID0gKHVybCkgLT5cbiAgZmFjZSA9IG5ldyBORE4oe2hvc3Q6IHVybH0pXG4gIGhvc3RQcmVmaXggPSAnJ1xuICBob3N0Q29tcG9uZW50cyA9IHVybC5zcGxpdCgnLicpXG4gIGZvciBjb21wb25lbnQgaW4gaG9zdENvbXBvbmVudHNcbiAgICBpZiBjb21wb25lbnQgIT0gJ3d3dycgJiYgY29tcG9uZW50ICE9ICdodHRwOi8vd3d3JyAmJiBjb21wb25lbnQgIT0gJ2h0dHA6Ly8nXG4gICAgICBob3N0UHJlZml4ID0gXCIvI3tjb21wb25lbnR9XCIgKyBob3N0UHJlZml4XG4gIHByZWZpeCA9IG5ldyBOYW1lKGhvc3RQcmVmaXgpXG4gIGZhY2UucHJlZml4VVJJID0gaG9zdFByZWZpeFxuICBmYWNlLnByZWZpeCA9IHByZWZpeFxuICBpbnRlcmZhY2VzLmZhY2VzW2hvc3RQcmVmaXhdID0gZmFjZVxuICBpbnRlcmZhY2VzLmZhY2VzW2hvc3RQcmVmaXhdLnJlZ2lzdGVyUHJlZml4KHByZWZpeCwgKG5ldyBpbnRlcmZhY2VDbG9zdXJlKGZhY2UsIGludGVyZXN0SGFuZGxlcikpKVxuICBpbnRlcmZhY2VzLmxpc3QucHVzaChob3N0UHJlZml4KVxuICBpbnRlcmZhY2VzLmFjdGl2ZS5wdXNoKGludGVyZmFjZXMuZmFjZXNbaG9zdFByZWZpeF0pXG4gIG9wZW4gPSAoKSAtPlxuICAgIGNvbnNvbGUubG9nKG5ldyBEYXRlKCkpXG4gICAgZXhwcmVzcyA9ICgpIC0+XG4gICAgICBjb25zb2xlLmxvZyhuZXcgRGF0ZSgpKVxuICAgICAgbmFtZSA9IG5ldyBOYW1lKGhvc3RQcmVmaXggKyAnL3BhZ2Uvd2VsY29tZS12aXNpdG9ycy5qc29uJylcbiAgICAgIGludGVyZXN0ID0gbmV3IEludGVyZXN0KG5hbWUpXG4gICAgICBpbnRlcmVzdC5jaGlsZFNlbGVjdG9yID0gMVxuICAgICAgdGVtcGxhdGUgPSB7fVxuICAgICAgdGVtcGxhdGUuY2hpbGRTZWxlY3RvciA9IDFcbiAgICAgIGNsb3N1cmUgPSBuZXcgQ29udGVudENsb3N1cmUoZmFjZSwgbmFtZSwgaW50ZXJlc3QsIHJlcG8udXBkYXRlUGFnZSlcbiAgICAgIGZhY2UuZXhwcmVzc0ludGVyZXN0KG5hbWUsIGNsb3N1cmUsIHRlbXBsYXRlKVxuICAgIHNldFRpbWVvdXQoZXhwcmVzcywgMzAwKVxuICBmYWNlLm9ub3BlbiA9IG9wZW4oKVxuXG5pZiBuYXZpZ2F0b3Iub25MaW5lID09IHRydWVcbiAgY29uc29sZS5sb2cgXCJvbmxpbmU6IHJlZ2lzdGVyaW5nIEZhY2UgYXQgXCIsIGxvY2F0aW9uLmhvc3Quc3BsaXQoJzonKVswXVxuICBpbnRlcmZhY2VzLnJlZ2lzdGVyRmFjZShsb2NhdGlvbi5ob3N0LnNwbGl0KCc6JylbMF0pXG4iLCJ3aWtpID0gcmVxdWlyZSAnLi93aWtpLmNvZmZlZSdcbnV0aWwgPSByZXF1aXJlICcuL3V0aWwuY29mZmVlJ1xucGFnZUhhbmRsZXIgPSB3aWtpLnBhZ2VIYW5kbGVyID0gcmVxdWlyZSAnLi9wYWdlSGFuZGxlci5jb2ZmZWUnXG5wbHVnaW4gPSByZXF1aXJlICcuL3BsdWdpbi5jb2ZmZWUnXG5zdGF0ZSA9IHJlcXVpcmUgJy4vc3RhdGUuY29mZmVlJ1xuYWN0aXZlID0gcmVxdWlyZSAnLi9hY3RpdmUuY29mZmVlJ1xucmVmcmVzaCA9IHJlcXVpcmUgJy4vcmVmcmVzaC5jb2ZmZWUnXG5yZXF1aXJlICcuL2ludGVyZmFjZXMuY29mZmVlJ1xuXG5cbkFycmF5OjpsYXN0ID0gLT5cbiAgdGhpc1tAbGVuZ3RoIC0gMV1cblxuJCAtPlxuIyBFTEVNRU5UUyB1c2VkIGZvciBkZXRhaWxzIHBvcHVwXG5cbiAgIyAjIGV4dGVuc2lvbiBmcm9tIGh0dHA6Ly93d3cuZHJvcHRvZnJhbWUuY29tLz9wPTM1XG4gICMgICAjIC51aS1kaWFsb2cgLnVpLWRpYWxvZy10aXRsZWJhci10cmFuc2ZlcnsgcG9zaXRpb246IGFic29sdXRlOyByaWdodDogMjNweDsgdG9wOiA1MCU7IHdpZHRoOiAxOXB4OyBtYXJnaW46IC0xMHB4IDAgMCAwOyBwYWRkaW5nOiAxcHg7IGhlaWdodDogMThweDsgfVxuICAjICAgIyAudWktZGlhbG9nIC51aS1kaWFsb2ctdGl0bGViYXItdHJhbnNmZXIgc3BhbiB7IGRpc3BsYXk6IGJsb2NrOyBtYXJnaW46IDFweDsgfVxuICAjICAgIyAudWktZGlhbG9nIC51aS1kaWFsb2ctdGl0bGViYXItdHJhbnNmZXI6aG92ZXIsIC51aS1kaWFsb2cgLnVpLWRpYWxvZy10aXRsZWJhci1taW46Zm9jdXMgeyBwYWRkaW5nOiAwOyB9XG4gICMgX2luaXQgPSAkLnVpLmRpYWxvZy5wcm90b3R5cGUuX2luaXRcbiAgIyBfdWlEaWFsb2dUaXRsZWJhciA9IG51bGxcbiAgIyAkLnVpLmRpYWxvZy5wcm90b3R5cGUuX2luaXQgPSAtPlxuICAjICAgc2VsZiA9IHRoaXNcbiAgIyAgIF9pbml0LmFwcGx5IHRoaXMsIGFyZ3VtZW50c1xuICAjICAgdWlEaWFsb2dUaXRsZWJhciA9IHRoaXMudWlEaWFsb2dUaXRsZWJhclxuICAjICAgdWlEaWFsb2dUaXRsZWJhci5hcHBlbmQgJzxhIGhyZWY9XCIjXCIgaWQ9XCJkaWFsb2ctdHJhbnNmZXJcIiBjbGFzcz1cImRpYWxvZy10cmFuc2ZlciB1aS1kaWFsb2ctdGl0bGViYXItdHJhbnNmZXJcIj48c3BhbiBjbGFzcz1cInVpLWljb24gdWktaWNvbi10cmFuc2ZlcnRoaWNrLWUtd1wiPjwvc3Bhbj48L2E+J1xuICAjICQuZXh0ZW5kICQudWkuZGlhbG9nLnByb3RvdHlwZSwgLT5cbiAgIyAgICQoJy5kaWFsb2ctdHJhbnNmZXInLCB0aGlzLnVpRGlhbG9nVGl0bGViYXIpXG4gICMgICAgIC5ob3ZlciAtPiAkKHRoaXMpLnRvZ2dsZUNsYXNzKCd1aS1zdGF0ZS1ob3ZlcicpXG4gICMgICAgIC5jbGljaygpIC0+XG4gICMgICAgICAgc2VsZi50cmFuc2ZlcigpXG4gICMgICAgICAgcmV0dXJuIGZhbHNlXG4gIHdpbmRvdy5kaWFsb2cgPSAkKCc8ZGl2PjwvZGl2PicpXG5cdCAgLmh0bWwoJ1RoaXMgZGlhbG9nIHdpbGwgc2hvdyBldmVyeSB0aW1lIScpXG5cdCAgLmRpYWxvZyB7IGF1dG9PcGVuOiBmYWxzZSwgdGl0bGU6ICdCYXNpYyBEaWFsb2cnLCBoZWlnaHQ6IDYwMCwgd2lkdGg6IDgwMCB9XG4gIHdpa2kuZGlhbG9nID0gKHRpdGxlLCBodG1sKSAtPlxuICAgIHdpbmRvdy5kaWFsb2cuaHRtbCBodG1sXG4gICAgd2luZG93LmRpYWxvZy5kaWFsb2cgXCJvcHRpb25cIiwgXCJ0aXRsZVwiLCB3aWtpLnJlc29sdmVMaW5rcyh0aXRsZSlcbiAgICB3aW5kb3cuZGlhbG9nLmRpYWxvZyAnb3BlbidcblxuIyBGVU5DVElPTlMgdXNlZCBieSBwbHVnaW5zIGFuZCBlbHNld2hlcmVcblxuICBzbGVlcCA9ICh0aW1lLCBkb25lKSAtPiBzZXRUaW1lb3V0IGRvbmUsIHRpbWVcblxuICB3aWtpLnJlbW92ZUl0ZW0gPSAoJGl0ZW0sIGl0ZW0pIC0+XG4gICAgcGFnZUhhbmRsZXIucHV0ICRpdGVtLnBhcmVudHMoJy5wYWdlOmZpcnN0JyksIHt0eXBlOiAncmVtb3ZlJywgaWQ6IGl0ZW0uaWR9XG4gICAgJGl0ZW0ucmVtb3ZlKClcblxuICB3aWtpLmNyZWF0ZUl0ZW0gPSAoJHBhZ2UsICRiZWZvcmUsIGl0ZW0pIC0+XG4gICAgJHBhZ2UgPSAkYmVmb3JlLnBhcmVudHMoJy5wYWdlJykgdW5sZXNzICRwYWdlP1xuICAgIGl0ZW0uaWQgPSB1dGlsLnJhbmRvbUJ5dGVzKDgpXG4gICAgJGl0ZW0gPSAkIFwiXCJcIlxuICAgICAgPGRpdiBjbGFzcz1cIml0ZW0gI3tpdGVtLnR5cGV9XCIgZGF0YS1pZD1cIiN7fVwiPC9kaXY+XG4gICAgXCJcIlwiXG4gICAgJGl0ZW1cbiAgICAgIC5kYXRhKCdpdGVtJywgaXRlbSlcbiAgICAgIC5kYXRhKCdwYWdlRWxlbWVudCcsICRwYWdlKVxuICAgIGlmICRiZWZvcmU/XG4gICAgICAkYmVmb3JlLmFmdGVyICRpdGVtXG4gICAgZWxzZVxuICAgICAgJHBhZ2UuZmluZCgnLnN0b3J5JykuYXBwZW5kICRpdGVtXG4gICAgcGx1Z2luLmRvICRpdGVtLCBpdGVtXG4gICAgYmVmb3JlID0gd2lraS5nZXRJdGVtICRiZWZvcmVcbiAgICBzbGVlcCA1MDAsIC0+XG4gICAgICBwYWdlSGFuZGxlci5wdXQgJHBhZ2UsIHtpdGVtLCBpZDogaXRlbS5pZCwgdHlwZTogJ2FkZCcsIGFmdGVyOiBiZWZvcmU/LmlkfVxuICAgICRpdGVtXG5cbiAgY3JlYXRlVGV4dEVsZW1lbnQgPSAocGFnZUVsZW1lbnQsIGJlZm9yZUVsZW1lbnQsIGluaXRpYWxUZXh0KSAtPlxuICAgIGl0ZW0gPVxuICAgICAgdHlwZTogJ3BhcmFncmFwaCdcbiAgICAgIGlkOiB1dGlsLnJhbmRvbUJ5dGVzKDgpXG4gICAgICB0ZXh0OiBpbml0aWFsVGV4dFxuICAgIGl0ZW1FbGVtZW50ID0gJCBcIlwiXCJcbiAgICAgIDxkaXYgY2xhc3M9XCJpdGVtIHBhcmFncmFwaFwiIGRhdGEtaWQ9I3tpdGVtLmlkfT48L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgXCJcIlwiXG4gICAgaXRlbUVsZW1lbnRcbiAgICAgIC5kYXRhKCdpdGVtJywgaXRlbSlcbiAgICAgIC5kYXRhKCdwYWdlRWxlbWVudCcsIHBhZ2VFbGVtZW50KVxuICAgIGJlZm9yZUVsZW1lbnQuYWZ0ZXIgaXRlbUVsZW1lbnRcbiAgICBwbHVnaW4uZG8gaXRlbUVsZW1lbnQsIGl0ZW1cbiAgICBpdGVtQmVmb3JlID0gd2lraS5nZXRJdGVtIGJlZm9yZUVsZW1lbnRcbiAgICB3aWtpLnRleHRFZGl0b3IgaXRlbUVsZW1lbnQsIGl0ZW1cbiAgICBzbGVlcCA1MDAsIC0+IHBhZ2VIYW5kbGVyLnB1dCBwYWdlRWxlbWVudCwge2l0ZW06IGl0ZW0sIGlkOiBpdGVtLmlkLCB0eXBlOiAnYWRkJywgYWZ0ZXI6IGl0ZW1CZWZvcmU/LmlkfVxuXG4gIHRleHRFZGl0b3IgPSB3aWtpLnRleHRFZGl0b3IgPSAoZGl2LCBpdGVtLCBjYXJldFBvcywgZG91YmxlQ2xpY2tlZCkgLT5cbiAgICByZXR1cm4gaWYgZGl2Lmhhc0NsYXNzICd0ZXh0RWRpdGluZydcbiAgICBkaXYuYWRkQ2xhc3MgJ3RleHRFZGl0aW5nJ1xuICAgIHRleHRhcmVhID0gJChcIjx0ZXh0YXJlYT4je29yaWdpbmFsID0gaXRlbS50ZXh0ID8gJyd9PC90ZXh0YXJlYT5cIilcbiAgICAgIC5mb2N1c291dCAtPlxuICAgICAgICBkaXYucmVtb3ZlQ2xhc3MgJ3RleHRFZGl0aW5nJ1xuICAgICAgICBpZiBpdGVtLnRleHQgPSB0ZXh0YXJlYS52YWwoKVxuICAgICAgICAgIHBsdWdpbi5kbyBkaXYuZW1wdHkoKSwgaXRlbVxuICAgICAgICAgIHJldHVybiBpZiBpdGVtLnRleHQgPT0gb3JpZ2luYWxcbiAgICAgICAgICBwYWdlSGFuZGxlci5wdXQgZGl2LnBhcmVudHMoJy5wYWdlOmZpcnN0JyksIHt0eXBlOiAnZWRpdCcsIGlkOiBpdGVtLmlkLCBpdGVtOiBpdGVtfVxuICAgICAgICBlbHNlXG4gICAgICAgICAgcGFnZUhhbmRsZXIucHV0IGRpdi5wYXJlbnRzKCcucGFnZTpmaXJzdCcpLCB7dHlwZTogJ3JlbW92ZScsIGlkOiBpdGVtLmlkfVxuICAgICAgICAgIGRpdi5yZW1vdmUoKVxuICAgICAgICBudWxsXG4gICAgICAjIC5iaW5kICdwYXN0ZScsIChlKSAtPlxuICAgICAgIyAgIHdpa2kubG9nICd0ZXh0ZWRpdCBwYXN0ZScsIGVcbiAgICAgICMgICB3aWtpLmxvZyBlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0JylcbiAgICAgIC5iaW5kICdrZXlkb3duJywgKGUpIC0+XG4gICAgICAgIGlmIChlLmFsdEtleSB8fCBlLmN0bEtleSB8fCBlLm1ldGFLZXkpIGFuZCBlLndoaWNoID09IDgzICNhbHQtc1xuICAgICAgICAgIHRleHRhcmVhLmZvY3Vzb3V0KClcbiAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgaWYgKGUuYWx0S2V5IHx8IGUuY3RsS2V5IHx8IGUubWV0YUtleSkgYW5kIGUud2hpY2ggPT0gNzMgI2FsdC1pXG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgcGFnZSA9ICQoZS50YXJnZXQpLnBhcmVudHMoJy5wYWdlJykgdW5sZXNzIGUuc2hpZnRLZXlcbiAgICAgICAgICBkb0ludGVybmFsTGluayBcImFib3V0ICN7aXRlbS50eXBlfSBwbHVnaW5cIiwgcGFnZVxuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAjIHByb3ZpZGVzIGF1dG9tYXRpYyBuZXcgcGFyYWdyYXBocyBvbiBlbnRlciBhbmQgY29uY2F0ZW5hdGlvbiBvbiBiYWNrc3BhY2VcbiAgICAgICAgaWYgaXRlbS50eXBlIGlzICdwYXJhZ3JhcGgnIFxuICAgICAgICAgIHNlbCA9IHV0aWwuZ2V0U2VsZWN0aW9uUG9zKHRleHRhcmVhKSAjIHBvc2l0aW9uIG9mIGNhcmV0IG9yIHNlbGVjdGVkIHRleHQgY29vcmRzXG4gICAgICAgICAgaWYgZS53aGljaCBpcyAkLnVpLmtleUNvZGUuQkFDS1NQQUNFIGFuZCBzZWwuc3RhcnQgaXMgMCBhbmQgc2VsLnN0YXJ0IGlzIHNlbC5lbmQgXG4gICAgICAgICAgICBwcmV2SXRlbSA9IHdpa2kuZ2V0SXRlbShkaXYucHJldigpKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlIHVubGVzcyBwcmV2SXRlbS50eXBlIGlzICdwYXJhZ3JhcGgnXG4gICAgICAgICAgICBwcmV2VGV4dExlbiA9IHByZXZJdGVtLnRleHQubGVuZ3RoXG4gICAgICAgICAgICBwcmV2SXRlbS50ZXh0ICs9IHRleHRhcmVhLnZhbCgpXG4gICAgICAgICAgICB0ZXh0YXJlYS52YWwoJycpICMgTmVlZCBjdXJyZW50IHRleHQgYXJlYSB0byBiZSBlbXB0eS4gSXRlbSB0aGVuIGdldHMgZGVsZXRlZC5cbiAgICAgICAgICAgICMgY2FyZXQgbmVlZHMgdG8gYmUgYmV0d2VlbiB0aGUgb2xkIHRleHQgYW5kIHRoZSBuZXcgYXBwZW5kZWQgdGV4dFxuICAgICAgICAgICAgdGV4dEVkaXRvciBkaXYucHJldigpLCBwcmV2SXRlbSwgcHJldlRleHRMZW5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgIGVsc2UgaWYgZS53aGljaCBpcyAkLnVpLmtleUNvZGUuRU5URVIgYW5kIGl0ZW0udHlwZSBpcyAncGFyYWdyYXBoJ1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlIHVubGVzcyBzZWxcbiAgICAgICAgICAgIHRleHQgPSB0ZXh0YXJlYS52YWwoKVxuICAgICAgICAgICAgcHJlZml4ID0gdGV4dC5zdWJzdHJpbmcgMCwgc2VsLnN0YXJ0XG4gICAgICAgICAgICBtaWRkbGUgPSB0ZXh0LnN1YnN0cmluZyhzZWwuc3RhcnQsIHNlbC5lbmQpIGlmIHNlbC5zdGFydCBpc250IHNlbC5lbmRcbiAgICAgICAgICAgIHN1ZmZpeCA9IHRleHQuc3Vic3RyaW5nKHNlbC5lbmQpXG4gICAgICAgICAgICBpZiBwcmVmaXggaXMgJydcbiAgICAgICAgICAgICAgdGV4dGFyZWEudmFsKCcgJylcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgdGV4dGFyZWEudmFsKHByZWZpeClcbiAgICAgICAgICAgIHRleHRhcmVhLmZvY3Vzb3V0KClcbiAgICAgICAgICAgIHBhZ2VFbGVtZW50ID0gZGl2LnBhcmVudCgpLnBhcmVudCgpXG4gICAgICAgICAgICBjcmVhdGVUZXh0RWxlbWVudChwYWdlRWxlbWVudCwgZGl2LCBzdWZmaXgpXG4gICAgICAgICAgICBjcmVhdGVUZXh0RWxlbWVudChwYWdlRWxlbWVudCwgZGl2LCBtaWRkbGUpIGlmIG1pZGRsZT9cbiAgICAgICAgICAgIGNyZWF0ZVRleHRFbGVtZW50KHBhZ2VFbGVtZW50LCBkaXYsICcnKSBpZiBwcmVmaXggaXMgJydcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgIGRpdi5odG1sIHRleHRhcmVhXG4gICAgaWYgY2FyZXRQb3M/XG4gICAgICB1dGlsLnNldENhcmV0UG9zaXRpb24gdGV4dGFyZWEsIGNhcmV0UG9zXG4gICAgZWxzZSBpZiBkb3VibGVDbGlja2VkICMgd2Ugd2FudCB0aGUgY2FyZXQgdG8gYmUgYXQgdGhlIGVuZFxuICAgICAgdXRpbC5zZXRDYXJldFBvc2l0aW9uIHRleHRhcmVhLCB0ZXh0YXJlYS52YWwoKS5sZW5ndGhcbiAgICAgICNzY3JvbGxzIHRvIGJvdHRvbSBvZiB0ZXh0IGFyZWFcbiAgICAgIHRleHRhcmVhLnNjcm9sbFRvcCh0ZXh0YXJlYVswXS5zY3JvbGxIZWlnaHQgLSB0ZXh0YXJlYS5oZWlnaHQoKSlcbiAgICBlbHNlXG4gICAgICB0ZXh0YXJlYS5mb2N1cygpXG5cbiAgZG9JbnRlcm5hbExpbmsgPSB3aWtpLmRvSW50ZXJuYWxMaW5rID0gKG5hbWUsIHBhZ2UsIHNpdGU9bnVsbCwgdmVyc2lvbikgLT5cbiAgICBuYW1lID0gd2lraS5hc1NsdWcobmFtZSlcbiAgICAkKHBhZ2UpLm5leHRBbGwoKS5yZW1vdmUoKSBpZiBwYWdlP1xuICAgIGNvbnNvbGUubG9nIHZlcnNpb25cbiAgICB3aWtpLmNyZWF0ZVBhZ2UobmFtZSxzaXRlLHZlcnNpb24pXG4gICAgICAuYXBwZW5kVG8oJCgnLm1haW4nKSlcbiAgICAgIC5lYWNoIHJlZnJlc2hcbiAgICBhY3RpdmUuc2V0KCQoJy5wYWdlJykubGFzdCgpKVxuXG4gIExFRlRBUlJPVyA9IDM3XG4gIFJJR0hUQVJST1cgPSAzOVxuXG4gICQoZG9jdW1lbnQpLmtleWRvd24gKGV2ZW50KSAtPlxuICAgIGRpcmVjdGlvbiA9IHN3aXRjaCBldmVudC53aGljaFxuICAgICAgd2hlbiBMRUZUQVJST1cgdGhlbiAtMVxuICAgICAgd2hlbiBSSUdIVEFSUk9XIHRoZW4gKzFcbiAgICBpZiBkaXJlY3Rpb24gJiYgbm90IChldmVudC50YXJnZXQudGFnTmFtZSBpcyBcIlRFWFRBUkVBXCIpXG4gICAgICBwYWdlcyA9ICQoJy5wYWdlJylcbiAgICAgIG5ld0luZGV4ID0gcGFnZXMuaW5kZXgoJCgnLmFjdGl2ZScpKSArIGRpcmVjdGlvblxuICAgICAgaWYgMCA8PSBuZXdJbmRleCA8IHBhZ2VzLmxlbmd0aFxuICAgICAgICBhY3RpdmUuc2V0KHBhZ2VzLmVxKG5ld0luZGV4KSlcblxuIyBIQU5ETEVSUyBmb3IgalF1ZXJ5IGV2ZW50c1xuXG4gICQod2luZG93KS5vbiAncG9wc3RhdGUnLCBzdGF0ZS5zaG93XG5cbiAgJChkb2N1bWVudClcbiAgICAuYWpheEVycm9yIChldmVudCwgcmVxdWVzdCwgc2V0dGluZ3MpIC0+XG4gICAgICByZXR1cm4gaWYgcmVxdWVzdC5zdGF0dXMgPT0gMCBvciByZXF1ZXN0LnN0YXR1cyA9PSA0MDRcbiAgICAgIHdpa2kubG9nICdhamF4IGVycm9yJywgZXZlbnQsIHJlcXVlc3QsIHNldHRpbmdzXG4gICAgICAkKCcubWFpbicpLnByZXBlbmQgXCJcIlwiXG4gICAgICAgIDxsaSBjbGFzcz0nZXJyb3InPlxuICAgICAgICAgIEVycm9yIG9uICN7c2V0dGluZ3MudXJsfTogI3tyZXF1ZXN0LnJlc3BvbnNlVGV4dH1cbiAgICAgICAgPC9saT5cbiAgICAgIFwiXCJcIlxuXG4gIGdldFRlbXBsYXRlID0gKHNsdWcsIGRvbmUpIC0+XG4gICAgcmV0dXJuIGRvbmUobnVsbCkgdW5sZXNzIHNsdWdcbiAgICB3aWtpLmxvZyAnZ2V0VGVtcGxhdGUnLCBzbHVnXG4gICAgcGFnZUhhbmRsZXIuZ2V0XG4gICAgICB3aGVuR290dGVuOiAoZGF0YSxzaXRlRm91bmQpIC0+IGRvbmUoZGF0YS5zdG9yeSlcbiAgICAgIHdoZW5Ob3RHb3R0ZW46IC0+IGRvbmUobnVsbClcbiAgICAgIHBhZ2VJbmZvcm1hdGlvbjoge3NsdWc6IHNsdWd9XG5cbiAgZmluaXNoQ2xpY2sgPSAoZSwgbmFtZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBwYWdlID0gJChlLnRhcmdldCkucGFyZW50cygnLnBhZ2UnKSB1bmxlc3MgZS5zaGlmdEtleVxuICAgIGRvSW50ZXJuYWxMaW5rIG5hbWUsIHBhZ2UsICQoZS50YXJnZXQpLmRhdGEoJ3NpdGUnKSwgJChlLnRhcmdldCkuZGF0YSgndmVyc2lvbicpXG4gICAgcmV0dXJuIGZhbHNlXG5cbiAgJCgnLm1haW4nKVxuICAgIC5kZWxlZ2F0ZSAnLnNob3ctcGFnZS1zb3VyY2UnLCAnY2xpY2snLCAoZSkgLT5cbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgcGFnZUVsZW1lbnQgPSAkKHRoaXMpLnBhcmVudCgpLnBhcmVudCgpXG4gICAgICBqc29uID0gcGFnZUVsZW1lbnQuZGF0YSgnZGF0YScpXG4gICAgICB3aWtpLmRpYWxvZyBcIkpTT04gZm9yICN7anNvbi50aXRsZX1cIiwgICQoJzxwcmUvPicpLnRleHQoSlNPTi5zdHJpbmdpZnkoanNvbiwgbnVsbCwgMikpXG5cbiAgICAuZGVsZWdhdGUgJy5wYWdlJywgJ2NsaWNrJywgKGUpIC0+XG4gICAgICBhY3RpdmUuc2V0IHRoaXMgdW5sZXNzICQoZS50YXJnZXQpLmlzKFwiYVwiKVxuXG4gICAgLmRlbGVnYXRlICcuaW50ZXJuYWwnLCAnY2xpY2snLCAoZSkgLT5cbiAgICAgIG5hbWUgPSAkKGUudGFyZ2V0KS5kYXRhICdwYWdlTmFtZSdcbiAgICAgIHBhZ2VIYW5kbGVyLmNvbnRleHQgPSAkKGUudGFyZ2V0KS5hdHRyKCd0aXRsZScpLnNwbGl0KCcgPT4gJylcbiAgICAgIGZpbmlzaENsaWNrIGUsIG5hbWVcblxuICAgIC5kZWxlZ2F0ZSAnaW1nLnJlbW90ZScsICdjbGljaycsIChlKSAtPlxuICAgICAgbmFtZSA9ICQoZS50YXJnZXQpLmRhdGEoJ3NsdWcnKVxuICAgICAgcGFnZUhhbmRsZXIuY29udGV4dCA9IFskKGUudGFyZ2V0KS5kYXRhKCd2ZXJzaW9uJyldXG4gICAgICBmaW5pc2hDbGljayBlLCBuYW1lXG5cbiAgICAuZGVsZWdhdGUgJy5yZXZpc2lvbicsICdkYmxjbGljaycsIChlKSAtPlxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAkcGFnZSA9ICQodGhpcykucGFyZW50cygnLnBhZ2UnKVxuICAgICAgcGFnZSA9ICRwYWdlLmRhdGEoJ2RhdGEnKVxuICAgICAgcmV2ID0gcGFnZS5qb3VybmFsLmxlbmd0aC0xXG4gICAgICBhY3Rpb24gPSBwYWdlLmpvdXJuYWxbcmV2XVxuICAgICAganNvbiA9IEpTT04uc3RyaW5naWZ5KGFjdGlvbiwgbnVsbCwgMilcbiAgICAgIHdpa2kuZGlhbG9nIFwiUmV2aXNpb24gI3tyZXZ9LCAje2FjdGlvbi50eXBlfSBhY3Rpb25cIiwgJCgnPHByZS8+JykudGV4dChqc29uKVxuXG4gICAgLmRlbGVnYXRlICcuYWN0aW9uJywgJ2NsaWNrJywgKGUpIC0+XG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICRhY3Rpb24gPSAkKGUudGFyZ2V0KVxuICAgICAgaWYgJGFjdGlvbi5pcygnLmZvcmsnKSBhbmQgKG5hbWUgPSAkYWN0aW9uLmRhdGEoJ3NsdWcnKSk/XG4gICAgICAgIHBhZ2VIYW5kbGVyLmNvbnRleHQgPSBbJGFjdGlvbi5kYXRhKCdzaXRlJyldXG4gICAgICAgIGZpbmlzaENsaWNrIGUsIChuYW1lLnNwbGl0ICdfJylbMF1cbiAgICAgIGVsc2VcbiAgICAgICAgJHBhZ2UgPSAkKHRoaXMpLnBhcmVudHMoJy5wYWdlJylcbiAgICAgICAgc2x1ZyA9IHdpa2kuYXNTbHVnKCRwYWdlLmRhdGEoJ2RhdGEnKS50aXRsZSlcbiAgICAgICAgcmV2ID0gJCh0aGlzKS5wYXJlbnQoKS5jaGlsZHJlbigpLmluZGV4KCRhY3Rpb24pXG4gICAgICAgICRwYWdlLm5leHRBbGwoKS5yZW1vdmUoKSB1bmxlc3MgZS5zaGlmdEtleVxuICAgICAgICB3aWtpLmNyZWF0ZVBhZ2UoXCIje3NsdWd9X3JldiN7cmV2fVwiLCAkcGFnZS5kYXRhKCdzaXRlJykpXG4gICAgICAgICAgLmFwcGVuZFRvKCQoJy5tYWluJykpXG4gICAgICAgICAgLmVhY2ggcmVmcmVzaFxuICAgICAgICBhY3RpdmUuc2V0KCQoJy5wYWdlJykubGFzdCgpKVxuXG4gICAgLmRlbGVnYXRlICcuZm9yay1wYWdlJywgJ2NsaWNrJywgKGUpIC0+XG4gICAgICBwYWdlRWxlbWVudCA9ICQoZS50YXJnZXQpLnBhcmVudHMoJy5wYWdlJylcbiAgICAgIGlmIHBhZ2VFbGVtZW50Lmhhc0NsYXNzKCdsb2NhbCcpXG4gICAgICAgIHVubGVzcyB3aWtpLnVzZUxvY2FsU3RvcmFnZSgpXG4gICAgICAgICAgaXRlbSA9IHBhZ2VFbGVtZW50LmRhdGEoJ2RhdGEnKVxuICAgICAgICAgIHBhZ2VFbGVtZW50LnJlbW92ZUNsYXNzKCdsb2NhbCcpXG4gICAgICAgICAgcGFnZUhhbmRsZXIucHV0IHBhZ2VFbGVtZW50LCB7dHlwZTogJ2ZvcmsnfSAjIHB1c2hcbiAgICAgIGVsc2VcbiAgICAgICAgaWYgKHJlbW90ZVNpdGUgPSBwYWdlRWxlbWVudC5kYXRhKCdzaXRlJykpP1xuICAgICAgICAgIHBhZ2VIYW5kbGVyLnB1dCBwYWdlRWxlbWVudCwge3R5cGU6J2ZvcmsnLCBzaXRlOiByZW1vdGVTaXRlfSAjIHB1bGxcblxuICAgIC5kZWxlZ2F0ZSAnLmFjdGlvbicsICdob3ZlcicsIC0+XG4gICAgICBpZCA9ICQodGhpcykuYXR0cignZGF0YS1pZCcpXG4gICAgICAkKFwiW2RhdGEtaWQ9I3tpZH1dXCIpLnRvZ2dsZUNsYXNzKCd0YXJnZXQnKVxuICAgICAgJCgnLm1haW4nKS50cmlnZ2VyKCdyZXYnKVxuXG4gICAgLmRlbGVnYXRlICcuaXRlbScsICdob3ZlcicsIC0+XG4gICAgICBpZCA9ICQodGhpcykuYXR0cignZGF0YS1pZCcpXG4gICAgICAkKFwiLmFjdGlvbltkYXRhLWlkPSN7aWR9XVwiKS50b2dnbGVDbGFzcygndGFyZ2V0JylcblxuICAgIC5kZWxlZ2F0ZSAnYnV0dG9uLmNyZWF0ZScsICdjbGljaycsIChlKSAtPlxuICAgICAgZ2V0VGVtcGxhdGUgJChlLnRhcmdldCkuZGF0YSgnc2x1ZycpLCAoc3RvcnkpIC0+XG4gICAgICAgICRwYWdlID0gJChlLnRhcmdldCkucGFyZW50cygnLnBhZ2U6Zmlyc3QnKVxuICAgICAgICAkcGFnZS5yZW1vdmVDbGFzcyAnZ2hvc3QnXG4gICAgICAgIHBhZ2UgPSAkcGFnZS5kYXRhKCdkYXRhJylcbiAgICAgICAgcGFnZS5zdG9yeSA9IHN0b3J5fHxbXVxuICAgICAgICBwYWdlSGFuZGxlci5wdXQgJHBhZ2UsIHt0eXBlOiAnY3JlYXRlJywgaWQ6IHBhZ2UuaWQsIGl0ZW06IHt0aXRsZTpwYWdlLnRpdGxlLCBzdG9yeTogc3Rvcnl8fHVuZGVmaW5lZH19XG4gICAgICAgIHdpa2kuYnVpbGRQYWdlIHBhZ2UsIG51bGwsICRwYWdlLmVtcHR5KClcblxuICAgIC5kZWxlZ2F0ZSAnLmdob3N0JywgJ3JldicsIChlKSAtPlxuICAgICAgd2lraS5sb2cgJ3JldicsIGVcbiAgICAgICRwYWdlID0gJChlLnRhcmdldCkucGFyZW50cygnLnBhZ2U6Zmlyc3QnKVxuICAgICAgJGl0ZW0gPSAkcGFnZS5maW5kKCcudGFyZ2V0JylcbiAgICAgIHBvc2l0aW9uID0gJGl0ZW0ub2Zmc2V0KCkudG9wICsgJHBhZ2Uuc2Nyb2xsVG9wKCkgLSAkcGFnZS5oZWlnaHQoKS8yXG4gICAgICB3aWtpLmxvZyAnc2Nyb2xsJywgJHBhZ2UsICRpdGVtLCBwb3NpdGlvblxuICAgICAgJHBhZ2Uuc3RvcCgpLmFuaW1hdGUge3Njcm9sbFRvcDogcG9zdGlvbn0sICdzbG93J1xuXG4gICAgLmRlbGVnYXRlICcuc2NvcmUnLCAnaG92ZXInLCAoZSkgLT5cbiAgICAgICQoJy5tYWluJykudHJpZ2dlciAndGh1bWInLCAkKGUudGFyZ2V0KS5kYXRhKCd0aHVtYicpXG4gICAgICBcbiAgJCgnLmZvb3RlcicpXG4gICAgLmRlbGVnYXRlICcuZmVkZXJhdGUnLCAnY2xpY2snLCAoZSkgLT5cbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgZm9yIGZhY2UgaW4gaW50ZXJmYWNlcy5saXN0XG4gICAgICAgY29uc29sZS5sb2cgZmFjZVxuICAkKCdpbnB1dC5mZWRlcmF0ZScpLm9uICdrZXlwcmVzcycsIChlKS0+XG4gICAgcmV0dXJuIGlmIGUua2V5Q29kZSAhPSAxMyAjIDEzID09IHJldHVyblxuICAgIGZlZGVyYXRlID0gJCh0aGlzKS52YWwoKVxuICAgIGludGVyZmFjZXMucmVnaXN0ZXJGYWNlKGZlZGVyYXRlKVxuICAgICQodGhpcykudmFsKFwiXCIpXG5cbiAgJChcIi5wcm92aWRlciBpbnB1dFwiKS5jbGljayAtPlxuICAgICQoXCJmb290ZXIgaW5wdXQ6Zmlyc3RcIikudmFsICQodGhpcykuYXR0cignZGF0YS1wcm92aWRlcicpXG4gICAgJChcImZvb3RlciBmb3JtXCIpLnN1Ym1pdCgpXG5cbiAgJCgnYm9keScpLm9uICduZXctbmVpZ2hib3ItZG9uZScsIChlLCBuZWlnaGJvcikgLT5cbiAgICAkKCcucGFnZScpLmVhY2ggKGluZGV4LCBlbGVtZW50KSAtPlxuICAgICAgd2lraS5lbWl0VHdpbnMgJChlbGVtZW50KVxuXG4gICQgLT5cbiAgICBzdGF0ZS5maXJzdCgpXG4gICAgJCgnLnBhZ2UnKS5lYWNoIHJlZnJlc2hcbiAgICBhY3RpdmUuc2V0KCQoJy5wYWdlJykubGFzdCgpKVxuIiwiXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUnXG5cbndpa2kgPSByZXF1aXJlICcuL3dpa2kuY29mZmVlJ1xuYWN0aXZlID0gcmVxdWlyZSAnLi9hY3RpdmUuY29mZmVlJ1xudXRpbCA9IHJlcXVpcmUgJy4vdXRpbC5jb2ZmZWUnXG5jcmVhdGVTZWFyY2ggPSByZXF1aXJlICcuL3NlYXJjaC5jb2ZmZWUnXG5cbm1vZHVsZS5leHBvcnRzID0gbmVpZ2hib3Job29kID0ge31cblxuXG53aWtpLm5laWdoYm9yaG9vZCA/PSB7fVxubmV4dEF2YWlsYWJsZUZldGNoID0gMFxubmV4dEZldGNoSW50ZXJ2YWwgPSAyMDAwXG5cbnBvcHVsYXRlU2l0ZUluZm9Gb3IgPSAoc2l0ZSxuZWlnaGJvckluZm8pLT5cbiAgcmV0dXJuIGlmIG5laWdoYm9ySW5mby5zaXRlbWFwUmVxdWVzdEluZmxpZ2h0XG4gIG5laWdoYm9ySW5mby5zaXRlbWFwUmVxdWVzdEluZmxpZ2h0ID0gdHJ1ZVxuXG4gIHRyYW5zaXRpb24gPSAoc2l0ZSwgZnJvbSwgdG8pIC0+XG4gICAgJChcIlwiXCIubmVpZ2hib3JbZGF0YS1zaXRlPVwiI3tzaXRlfVwiXVwiXCJcIilcbiAgICAgIC5maW5kKCdkaXYnKVxuICAgICAgLnJlbW92ZUNsYXNzKGZyb20pXG4gICAgICAuYWRkQ2xhc3ModG8pXG5cbiAgZmV0Y2hNYXAgPSAtPlxuICAgIHNpdGVtYXBVcmwgPSBcImh0dHA6Ly8je3NpdGV9L3N5c3RlbS9zaXRlbWFwLmpzb25cIlxuICAgIHRyYW5zaXRpb24gc2l0ZSwgJ3dhaXQnLCAnZmV0Y2gnXG4gICAgcmVxdWVzdCA9ICQuYWpheFxuICAgICAgdHlwZTogJ0dFVCdcbiAgICAgIGRhdGFUeXBlOiAnanNvbidcbiAgICAgIHVybDogc2l0ZW1hcFVybFxuICAgIHJlcXVlc3RcbiAgICAgIC5hbHdheXMoIC0+IG5laWdoYm9ySW5mby5zaXRlbWFwUmVxdWVzdEluZmxpZ2h0ID0gZmFsc2UgKVxuICAgICAgLmRvbmUgKGRhdGEpLT5cbiAgICAgICAgbmVpZ2hib3JJbmZvLnNpdGVtYXAgPSBkYXRhXG4gICAgICAgIHRyYW5zaXRpb24gc2l0ZSwgJ2ZldGNoJywgJ2RvbmUnXG4gICAgICAgICQoJ2JvZHknKS50cmlnZ2VyICduZXctbmVpZ2hib3ItZG9uZScsIHNpdGVcbiAgICAgIC5mYWlsIChkYXRhKS0+XG4gICAgICAgIHRyYW5zaXRpb24gc2l0ZSwgJ2ZldGNoJywgJ2ZhaWwnXG5cbiAgbm93ID0gRGF0ZS5ub3coKVxuICBpZiBub3cgPiBuZXh0QXZhaWxhYmxlRmV0Y2hcbiAgICBuZXh0QXZhaWxhYmxlRmV0Y2ggPSBub3cgKyBuZXh0RmV0Y2hJbnRlcnZhbFxuICAgIHNldFRpbWVvdXQgZmV0Y2hNYXAsIDEwMFxuICBlbHNlXG4gICAgc2V0VGltZW91dCBmZXRjaE1hcCwgbmV4dEF2YWlsYWJsZUZldGNoIC0gbm93XG4gICAgbmV4dEF2YWlsYWJsZUZldGNoICs9IG5leHRGZXRjaEludGVydmFsXG5cblxud2lraS5yZWdpc3Rlck5laWdoYm9yID0gbmVpZ2hib3Job29kLnJlZ2lzdGVyTmVpZ2hib3IgPSAoc2l0ZSktPlxuICByZXR1cm4gaWYgd2lraS5uZWlnaGJvcmhvb2Rbc2l0ZV0/XG4gIG5laWdoYm9ySW5mbyA9IHt9XG4gIHdpa2kubmVpZ2hib3Job29kW3NpdGVdID0gbmVpZ2hib3JJbmZvXG4gIHBvcHVsYXRlU2l0ZUluZm9Gb3IoIHNpdGUsIG5laWdoYm9ySW5mbyApXG4gICQoJ2JvZHknKS50cmlnZ2VyICduZXctbmVpZ2hib3InLCBzaXRlXG5cbm5laWdoYm9yaG9vZC5saXN0TmVpZ2hib3JzID0gKCktPlxuICBfLmtleXMoIHdpa2kubmVpZ2hib3Job29kIClcblxubmVpZ2hib3Job29kLnNlYXJjaCA9IChzZWFyY2hRdWVyeSktPlxuICBmaW5kcyA9IFtdXG4gIHRhbGx5ID0ge31cblxuICB0aWNrID0gKGtleSkgLT5cbiAgICBpZiB0YWxseVtrZXldPyB0aGVuIHRhbGx5W2tleV0rKyBlbHNlIHRhbGx5W2tleV0gPSAxXG5cbiAgbWF0Y2ggPSAoa2V5LCB0ZXh0KSAtPlxuICAgIGhpdCA9IHRleHQ/IGFuZCB0ZXh0LnRvTG93ZXJDYXNlKCkuaW5kZXhPZiggc2VhcmNoUXVlcnkudG9Mb3dlckNhc2UoKSApID49IDBcbiAgICB0aWNrIGtleSBpZiBoaXRcbiAgICBoaXRcblxuICBzdGFydCA9IERhdGUubm93KClcbiAgZm9yIG93biBuZWlnaGJvclNpdGUsbmVpZ2hib3JJbmZvIG9mIHdpa2kubmVpZ2hib3Job29kXG4gICAgc2l0ZW1hcCA9IG5laWdoYm9ySW5mby5zaXRlbWFwXG4gICAgdGljayAnc2l0ZXMnIGlmIHNpdGVtYXA/XG4gICAgbWF0Y2hpbmdQYWdlcyA9IF8uZWFjaCBzaXRlbWFwLCAocGFnZSktPlxuICAgICAgdGljayAncGFnZXMnXG4gICAgICByZXR1cm4gdW5sZXNzIG1hdGNoKCd0aXRsZScsIHBhZ2UudGl0bGUpIG9yIG1hdGNoKCd0ZXh0JywgcGFnZS5zeW5vcHNpcykgb3IgbWF0Y2goJ3NsdWcnLCBwYWdlLnNsdWcpXG4gICAgICB0aWNrICdmaW5kcydcbiAgICAgIGZpbmRzLnB1c2hcbiAgICAgICAgcGFnZTogcGFnZSxcbiAgICAgICAgc2l0ZTogbmVpZ2hib3JTaXRlLFxuICAgICAgICByYW5rOiAxICMgSEFSRENPREVEIEZPUiBOT1dcbiAgdGFsbHlbJ21zZWMnXSA9IERhdGUubm93KCkgLSBzdGFydFxuICB7IGZpbmRzLCB0YWxseSB9XG5cblxuJCAtPlxuICAkbmVpZ2hib3Job29kID0gJCgnLm5laWdoYm9yaG9vZCcpXG5cbiAgZmxhZyA9IChzaXRlKSAtPlxuICAgICMgc3RhdHVzIGNsYXNzIHByb2dyZXNzaW9uOiAud2FpdCwgLmZldGNoLCAuZmFpbCBvciAuZG9uZVxuICAgIFwiXCJcIlxuICAgICAgPHNwYW4gY2xhc3M9XCJuZWlnaGJvclwiIGRhdGEtc2l0ZT1cIiN7c2l0ZX1cIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cIndhaXRcIj5cbiAgICAgICAgICA8aW1nIHNyYz1cImh0dHA6Ly8je3NpdGV9L2Zhdmljb24ucG5nXCIgdGl0bGU9XCIje3NpdGV9XCI+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9zcGFuPlxuICAgIFwiXCJcIlxuXG4gICQoJ2JvZHknKVxuICAgIC5vbiAnbmV3LW5laWdoYm9yJywgKGUsIHNpdGUpIC0+XG4gICAgICAkbmVpZ2hib3Job29kLmFwcGVuZCBmbGFnIHNpdGVcbiAgICAuZGVsZWdhdGUgJy5uZWlnaGJvciBpbWcnLCAnY2xpY2snLCAoZSkgLT5cbiAgICAgIHdpa2kuZG9JbnRlcm5hbExpbmsgJ3dlbGNvbWUtdmlzaXRvcnMnLCBudWxsLCBALnRpdGxlXG5cbiAgc2VhcmNoID0gY3JlYXRlU2VhcmNoKHtuZWlnaGJvcmhvb2R9KVxuXG4gICQoJ2lucHV0LnNlYXJjaCcpLm9uICdrZXlwcmVzcycsIChlKS0+XG4gICAgcmV0dXJuIGlmIGUua2V5Q29kZSAhPSAxMyAjIDEzID09IHJldHVyblxuICAgIHNlYXJjaFF1ZXJ5ID0gJCh0aGlzKS52YWwoKVxuICAgIHNlYXJjaC5wZXJmb3JtU2VhcmNoKCBzZWFyY2hRdWVyeSApXG4gICAgJCh0aGlzKS52YWwoXCJcIilcbiIsIl8gPSByZXF1aXJlICd1bmRlcnNjb3JlJ1xuXG53aWtpID0gcmVxdWlyZSAnLi93aWtpLmNvZmZlZSdcbnV0aWwgPSByZXF1aXJlICcuL3V0aWwuY29mZmVlJ1xuc3RhdGUgPSByZXF1aXJlICcuL3N0YXRlLmNvZmZlZSdcbnJldmlzaW9uID0gcmVxdWlyZSAnLi9yZXZpc2lvbi5jb2ZmZWUnXG5hZGRUb0pvdXJuYWwgPSByZXF1aXJlICcuL2FkZFRvSm91cm5hbC5jb2ZmZWUnXG5yZXBvc2l0b3J5ID0gcmVxdWlyZSAnLi9yZXBvc2l0b3J5LmNvZmZlZSdcblxubW9kdWxlLmV4cG9ydHMgPSBwYWdlSGFuZGxlciA9IHt9XG5cbnBhZ2VGcm9tTG9jYWxTdG9yYWdlID0gKHNsdWcpLT5cbiAgaWYganNvbiA9IGxvY2FsU3RvcmFnZVtzbHVnXVxuICAgIEpTT04ucGFyc2UoanNvbilcbiAgZWxzZVxuICAgIHVuZGVmaW5lZFxuXG5yZWN1cnNpdmVHZXQgPSAoe3BhZ2VJbmZvcm1hdGlvbiwgd2hlbkdvdHRlbiwgd2hlbk5vdEdvdHRlbiwgbG9jYWxDb250ZXh0fSkgLT5cbiAge3NsdWcscmV2LHNpdGUsdmVyc2lvbn0gPSBwYWdlSW5mb3JtYXRpb25cbiAgcmVwb3NpdG9yeS5nZXRQYWdlKHBhZ2VJbmZvcm1hdGlvbiwgd2hlbkdvdHRlbiwgd2hlbk5vdEdvdHRlbilcbiAgIyMjXG4gIGlmIHNpdGVcbiAgICBsb2NhbENvbnRleHQgPSBbXVxuICBlbHNlXG4gICAgc2l0ZSA9IGxvY2FsQ29udGV4dC5zaGlmdCgpXG5cbiAgc2l0ZSA9IG51bGwgaWYgc2l0ZT09J3ZpZXcnXG5cbiAgaWYgc2l0ZT9cbiAgICBpZiBzaXRlID09ICdsb2NhbCdcbiAgICAgIHJlcG9zaXRvcnkuY2hlY2socGFnZUluZm9ybWF0aW9uLCB3aGVuR290dGVuLCB3aGVuTm90R290dGVuKVxuICAgIGVsc2VcbiAgICAgIGlmIHNpdGUgPT0gJ29yaWdpbidcbiAgICAgICAgdXJsID0gXCIvI3tzbHVnfS5qc29uXCJcbiAgICAgIGVsc2VcbiAgICAgICAgdXJsID0gXCJodHRwOi8vI3tzaXRlfS8je3NsdWd9Lmpzb25cIlxuICBlbHNlXG4gICAgdXJsID0gXCIvI3tzbHVnfS5qc29uXCJcblxuICAkLmFqYXhcbiAgICB0eXBlOiAnR0VUJ1xuICAgIGRhdGFUeXBlOiAnanNvbidcbiAgICB1cmw6IHVybCArIFwiP3JhbmRvbT0je3V0aWwucmFuZG9tQnl0ZXMoNCl9XCJcbiAgICBzdWNjZXNzOiAocGFnZSkgLT5cbiAgICAgIHBhZ2UgPSByZXZpc2lvbi5jcmVhdGUgcmV2LCBwYWdlIGlmIHJldlxuICAgICAgcmV0dXJuIHdoZW5Hb3R0ZW4ocGFnZSxzaXRlKVxuICAgIGVycm9yOiAoeGhyLCB0eXBlLCBtc2cpIC0+XG4gICAgICBpZiAoeGhyLnN0YXR1cyAhPSA0MDQpIGFuZCAoeGhyLnN0YXR1cyAhPSAwKVxuICAgICAgICB3aWtpLmxvZyAncGFnZUhhbmRsZXIuZ2V0IGVycm9yJywgeGhyLCB4aHIuc3RhdHVzLCB0eXBlLCBtc2dcbiAgICAgICAgcmVwb3J0ID1cbiAgICAgICAgICAndGl0bGUnOiBcIiN7eGhyLnN0YXR1c30gI3ttc2d9XCJcbiAgICAgICAgICAnc3RvcnknOiBbXG4gICAgICAgICAgICAndHlwZSc6ICdwYXJhZ3JhcGgnXG4gICAgICAgICAgICAnaWQnOiAnOTI4NzM5MTg3MjQzJ1xuICAgICAgICAgICAgJ3RleHQnOiBcIjxwcmU+I3t4aHIucmVzcG9uc2VUZXh0fVwiXG4gICAgICAgICAgXVxuICAgICAgICByZXR1cm4gd2hlbkdvdHRlbiByZXBvcnQsICdsb2NhbCdcbiAgICAgIGlmIGxvY2FsQ29udGV4dC5sZW5ndGggPiAwXG4gICAgICAgIHJlY3Vyc2l2ZUdldCgge3BhZ2VJbmZvcm1hdGlvbiwgd2hlbkdvdHRlbiwgd2hlbk5vdEdvdHRlbiwgbG9jYWxDb250ZXh0fSApXG4gICAgICBlbHNlXG4gICAgICAgIHdoZW5Ob3RHb3R0ZW4oKVxuICAjIyNcbnBhZ2VIYW5kbGVyLmdldCA9ICh7d2hlbkdvdHRlbix3aGVuTm90R290dGVuLHBhZ2VJbmZvcm1hdGlvbn0gICkgLT5cblxuICBwYWdlSGFuZGxlci5jb250ZXh0ID0gWyd2aWV3J11cbiAgXG4gIHJlY3Vyc2l2ZUdldFxuICAgIHBhZ2VJbmZvcm1hdGlvbjogcGFnZUluZm9ybWF0aW9uXG4gICAgd2hlbkdvdHRlbjogd2hlbkdvdHRlblxuICAgIHdoZW5Ob3RHb3R0ZW46IHdoZW5Ob3RHb3R0ZW5cbiAgICBsb2NhbENvbnRleHQ6IF8uY2xvbmUocGFnZUhhbmRsZXIuY29udGV4dClcblxuXG5wYWdlSGFuZGxlci5jb250ZXh0ID0gW11cblxucHVzaFRvTG9jYWwgPSAocGFnZUVsZW1lbnQsIHBhZ2VQdXRJbmZvLCBhY3Rpb24pIC0+XG4gIHBhZ2UgPSBwYWdlRWxlbWVudC5kYXRhKFwiZGF0YVwiKVxuICBwYWdlLmpvdXJuYWwgPSBbXSB1bmxlc3MgcGFnZS5qb3VybmFsP1xuICBpZiBhY3Rpb25bJ2ZvcmsnXT9cbiAgICBwYWdlLmpvdXJuYWwgPSBwYWdlLmpvdXJuYWwuY29uY2F0KHsndHlwZSc6J2ZvcmsnLCAnZGF0ZSc6IGFjdGlvbi5kYXRlfSlcbiAgICBkZWxldGUgYWN0aW9uWydmb3JrJ11cbiAgcGFnZS5qb3VybmFsID0gcGFnZS5qb3VybmFsLmNvbmNhdChhY3Rpb24pXG4gIHBhZ2Uuc3RvcnkgPSAkKHBhZ2VFbGVtZW50KS5maW5kKFwiLml0ZW1cIikubWFwKC0+ICQoQCkuZGF0YShcIml0ZW1cIikpLmdldCgpIGlmIGFjdGlvbi50eXBlICE9ICdjcmVhdGUnXG4gIGFkZFRvSm91cm5hbCBwYWdlRWxlbWVudC5maW5kKCcuam91cm5hbCcpLCBhY3Rpb25cbiAgcGFnZS5wYWdlID0gd2lraS5hc1NsdWcocGFnZS50aXRsZSkgKyAnLmpzb24nXG4gIHBhZ2UuZXhjbHVkZXMgPSBbXVxuICBwYWdlLmZhdmljb24gPSByZXBvc2l0b3J5LmZhdmljb25cbiAgZm9ya1JlYWNoZWQgPSBmYWxzZVxuICBmb3IgdmVyc2lvbiBpbiBwYWdlLmpvdXJuYWwgYnkgLTFcbiAgICBpZiB2ZXJzaW9uLnR5cGUgIT0gJ2ZvcmsnICYmIGZvcmtSZWFjaGVkID09IGZhbHNlXG4gICAgICBwYWdlLmV4Y2x1ZGVzLnB1c2godmVyc2lvbi5kYXRlKVxuICAgIGVsc2VcbiAgICAgIGZvcmtSZWFjaGVkID0gdHJ1ZVxuICBjb25zb2xlLmxvZyBwYWdlXG4gIHJlcG9zaXRvcnkudXBkYXRlUGFnZShwYWdlKVxuICBcblxucHVzaFRvU2VydmVyID0gKHBhZ2VFbGVtZW50LCBwYWdlUHV0SW5mbywgYWN0aW9uKSAtPlxuICAkLmFqYXhcbiAgICB0eXBlOiAnUFVUJ1xuICAgIHVybDogXCIvcGFnZS8je3BhZ2VQdXRJbmZvLnNsdWd9L2FjdGlvblwiXG4gICAgZGF0YTpcbiAgICAgICdhY3Rpb24nOiBKU09OLnN0cmluZ2lmeShhY3Rpb24pXG4gICAgc3VjY2VzczogKCkgLT5cbiAgICAgIGFkZFRvSm91cm5hbCBwYWdlRWxlbWVudC5maW5kKCcuam91cm5hbCcpLCBhY3Rpb25cbiAgICAgIGlmIGFjdGlvbi50eXBlID09ICdmb3JrJyAjIHB1c2hcbiAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0gcGFnZUVsZW1lbnQuYXR0cignaWQnKVxuICAgICAgICBzdGF0ZS5zZXRVcmxcbiAgICBlcnJvcjogKHhociwgdHlwZSwgbXNnKSAtPlxuICAgICAgd2lraS5sb2cgXCJwYWdlSGFuZGxlci5wdXQgYWpheCBlcnJvciBjYWxsYmFja1wiLCB0eXBlLCBtc2dcblxucGFnZUhhbmRsZXIucHV0ID0gKHBhZ2VFbGVtZW50LCBhY3Rpb24pIC0+XG4gIGNoZWNrZWRTaXRlID0gKCkgLT5cbiAgICBzd2l0Y2ggc2l0ZSA9IHBhZ2VFbGVtZW50LmRhdGEoJ3NpdGUnKVxuICAgICAgd2hlbiAnb3JpZ2luJywgJ2xvY2FsJywgJ3ZpZXcnIHRoZW4gbnVsbFxuICAgICAgd2hlbiBsb2NhdGlvbi5ob3N0IHRoZW4gbnVsbFxuICAgICAgZWxzZSBzaXRlXG5cbiAgIyBhYm91dCB0aGUgcGFnZSB3ZSBoYXZlXG4gIHBhZ2VQdXRJbmZvID0ge1xuICAgIHNsdWc6IHBhZ2VFbGVtZW50LmF0dHIoJ2lkJykuc3BsaXQoJ19yZXYnKVswXVxuICAgIHJldjogcGFnZUVsZW1lbnQuYXR0cignaWQnKS5zcGxpdCgnX3JldicpWzFdXG4gICAgc2l0ZTogY2hlY2tlZFNpdGUoKVxuICAgIGxvY2FsOiBwYWdlRWxlbWVudC5oYXNDbGFzcygnbG9jYWwnKVxuICB9XG4gIGZvcmtGcm9tID0gcGFnZUVsZW1lbnQuZGF0YSgnZGF0YScpLmZhdmljb25cbiAgY29uc29sZS5sb2cgZm9ya0Zyb21cbiAgd2lraS5sb2cgJ3BhZ2VIYW5kbGVyLnB1dCcsIGFjdGlvbiwgcGFnZVB1dEluZm9cblxuICAjIGRldGVjdCB3aGVuIGZvcmsgdG8gbG9jYWwgc3RvcmFnZVxuICBpZiB3aWtpLnVzZUxvY2FsU3RvcmFnZSgpXG4gICAgaWYgcGFnZVB1dEluZm8uc2l0ZT9cbiAgICAgIHdpa2kubG9nICdyZW1vdGUgPT4gbG9jYWwnXG4gICAgZWxzZSBpZiAhcGFnZVB1dEluZm8ubG9jYWxcbiAgICAgIHdpa2kubG9nICdvcmlnaW4gPT4gbG9jYWwnXG4gICAgICBhY3Rpb24uc2l0ZSA9IGZvcmtGcm9tID0gbG9jYXRpb24uaG9zdFxuICAgICMgZWxzZSBpZiAhcGFnZUZyb21Mb2NhbFN0b3JhZ2UocGFnZVB1dEluZm8uc2x1ZylcbiAgICAjICAgd2lraS5sb2cgJydcbiAgICAjICAgYWN0aW9uLnNpdGUgPSBmb3JrRnJvbSA9IHBhZ2VQdXRJbmZvLnNpdGVcbiAgICAjICAgd2lraS5sb2cgJ2xvY2FsIHN0b3JhZ2UgZmlyc3QgdGltZScsIGFjdGlvbiwgJ2ZvcmtGcm9tJywgZm9ya0Zyb21cblxuICAjIHR3ZWVrIGFjdGlvbiBiZWZvcmUgc2F2aW5nXG4gIGFjdGlvbi5kYXRlID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKVxuICBkZWxldGUgYWN0aW9uLnNpdGUgaWYgYWN0aW9uLnNpdGUgPT0gJ29yaWdpbidcblxuICAjIHVwZGF0ZSBkb20gd2hlbiBmb3JraW5nXG4gIGlmIGZvcmtGcm9tICE9IHJlcG9zaXRvcnkuZmF2aWNvblxuICAgICMgcHVsbCByZW1vdGUgc2l0ZSBjbG9zZXIgdG8gdXNcbiAgICBwYWdlRWxlbWVudC5maW5kKCdoMSBpbWcnKS5hdHRyKCdzcmMnLCByZXBvc2l0b3J5LmZhdmljb24pXG4gICAgcGFnZUVsZW1lbnQuZmluZCgnaDEgYScpLmF0dHIoJ2hyZWYnLCAnLycpXG4gICAgcGFnZUVsZW1lbnQuZGF0YSgnc2l0ZScsIG51bGwpXG4gICAgcGFnZUVsZW1lbnQucmVtb3ZlQ2xhc3MoJ3JlbW90ZScpXG4gICAgc3RhdGUuc2V0VXJsKClcbiAgICBpZiBhY3Rpb24udHlwZSAhPSAnZm9yaydcbiAgICAgICMgYnVuZGxlIGltcGxpY2l0IGZvcmsgd2l0aCBuZXh0IGFjdGlvblxuICAgICAgYWN0aW9uLmZvcmsgPSBmb3JrRnJvbVxuICAgICAgYWRkVG9Kb3VybmFsIHBhZ2VFbGVtZW50LmZpbmQoJy5qb3VybmFsJyksXG4gICAgICAgIHR5cGU6ICdmb3JrJ1xuICAgICAgICBzaXRlOiBmb3JrRnJvbVxuICAgICAgICBkYXRlOiBhY3Rpb24uZGF0ZVxuXG4gICMgc3RvcmUgYXMgYXBwcm9wcmlhdGVcbiAgcHVzaFRvTG9jYWwocGFnZUVsZW1lbnQsIHBhZ2VQdXRJbmZvLCBhY3Rpb24pXG4gIHBhZ2VFbGVtZW50LmFkZENsYXNzKFwibG9jYWxcIilcblxuXG4iLCJ1dGlsID0gcmVxdWlyZSgnLi91dGlsLmNvZmZlZScpXG53aWtpID0gcmVxdWlyZSAnLi93aWtpLmNvZmZlZSdcblxubW9kdWxlLmV4cG9ydHMgPSBwbHVnaW4gPSB7fVxuXG4jIFRPRE86IFJlbW92ZSB0aGVzZSBtZXRob2RzIGZyb20gd2lraSBvYmplY3Q/XG4jXG5cbnNjcmlwdHMgPSB7fVxuZ2V0U2NyaXB0ID0gd2lraS5nZXRTY3JpcHQgPSAodXJsLCBjYWxsYmFjayA9ICgpIC0+KSAtPlxuICBpZiBzY3JpcHRzW3VybF0/XG4gICAgY2FsbGJhY2soKVxuICBlbHNlXG4gICAgJC5nZXRTY3JpcHQodXJsKVxuICAgICAgLmRvbmUgLT5cbiAgICAgICAgc2NyaXB0c1t1cmxdID0gdHJ1ZVxuICAgICAgICBjYWxsYmFjaygpXG4gICAgICAuZmFpbCAtPlxuICAgICAgICBjYWxsYmFjaygpXG5cbnBsdWdpbi5nZXQgPSB3aWtpLmdldFBsdWdpbiA9IChuYW1lLCBjYWxsYmFjaykgLT5cbiAgcmV0dXJuIGNhbGxiYWNrKHdpbmRvdy5wbHVnaW5zW25hbWVdKSBpZiB3aW5kb3cucGx1Z2luc1tuYW1lXVxuICBnZXRTY3JpcHQgXCIvcGx1Z2lucy8je25hbWV9LyN7bmFtZX0uanNcIiwgKCkgLT5cbiAgICByZXR1cm4gY2FsbGJhY2sod2luZG93LnBsdWdpbnNbbmFtZV0pIGlmIHdpbmRvdy5wbHVnaW5zW25hbWVdXG4gICAgZ2V0U2NyaXB0IFwiL3BsdWdpbnMvI3tuYW1lfS5qc1wiLCAoKSAtPlxuICAgICAgY2FsbGJhY2sod2luZG93LnBsdWdpbnNbbmFtZV0pXG5cbnBsdWdpbi5kbyA9IHdpa2kuZG9QbHVnaW4gPSAoZGl2LCBpdGVtLCBkb25lPS0+KSAtPlxuICBlcnJvciA9IChleCkgLT5cbiAgICBlcnJvckVsZW1lbnQgPSAkKFwiPGRpdiAvPlwiKS5hZGRDbGFzcygnZXJyb3InKVxuICAgIGVycm9yRWxlbWVudC50ZXh0KGV4LnRvU3RyaW5nKCkpXG4gICAgZGl2LmFwcGVuZChlcnJvckVsZW1lbnQpXG5cbiAgZGl2LmRhdGEgJ3BhZ2VFbGVtZW50JywgZGl2LnBhcmVudHMoXCIucGFnZVwiKVxuICBkaXYuZGF0YSAnaXRlbScsIGl0ZW1cbiAgcGx1Z2luLmdldCBpdGVtLnR5cGUsIChzY3JpcHQpIC0+XG4gICAgdHJ5XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoXCJDYW4ndCBmaW5kIHBsdWdpbiBmb3IgJyN7aXRlbS50eXBlfSdcIikgdW5sZXNzIHNjcmlwdD9cbiAgICAgIGlmIHNjcmlwdC5lbWl0Lmxlbmd0aCA+IDJcbiAgICAgICAgc2NyaXB0LmVtaXQgZGl2LCBpdGVtLCAtPlxuICAgICAgICAgIHNjcmlwdC5iaW5kIGRpdiwgaXRlbVxuICAgICAgICAgIGRvbmUoKVxuICAgICAgZWxzZVxuICAgICAgICBzY3JpcHQuZW1pdCBkaXYsIGl0ZW1cbiAgICAgICAgc2NyaXB0LmJpbmQgZGl2LCBpdGVtXG4gICAgICAgIGRvbmUoKVxuICAgIGNhdGNoIGVyclxuICAgICAgd2lraS5sb2cgJ3BsdWdpbiBlcnJvcicsIGVyclxuICAgICAgZXJyb3IoZXJyKVxuICAgICAgZG9uZSgpXG5cbndpa2kucmVnaXN0ZXJQbHVnaW4gPSAocGx1Z2luTmFtZSxwbHVnaW5GbiktPlxuICB3aW5kb3cucGx1Z2luc1twbHVnaW5OYW1lXSA9IHBsdWdpbkZuKCQpXG5cblxuIyBQTFVHSU5TIGZvciBlYWNoIHN0b3J5IGl0ZW0gdHlwZVxuXG53aW5kb3cucGx1Z2lucyA9XG4gIHBhcmFncmFwaDpcbiAgICBlbWl0OiAoZGl2LCBpdGVtKSAtPlxuICAgICAgZm9yIHRleHQgaW4gaXRlbS50ZXh0LnNwbGl0IC9cXG5cXG4rL1xuICAgICAgICBkaXYuYXBwZW5kIFwiPHA+I3t3aWtpLnJlc29sdmVMaW5rcyh0ZXh0KX08L3A+XCIgaWYgdGV4dC5tYXRjaCAvXFxTL1xuICAgIGJpbmQ6IChkaXYsIGl0ZW0pIC0+XG4gICAgICBkaXYuZGJsY2xpY2sgLT4gd2lraS50ZXh0RWRpdG9yIGRpdiwgaXRlbSwgbnVsbCwgdHJ1ZVxuICBpbWFnZTpcbiAgICBlbWl0OiAoZGl2LCBpdGVtKSAtPlxuICAgICAgaXRlbS50ZXh0IHx8PSBpdGVtLmNhcHRpb25cbiAgICAgIGRpdi5hcHBlbmQgXCI8aW1nIGNsYXNzPXRodW1ibmFpbCBzcmM9XFxcIiN7aXRlbS51cmx9XFxcIj4gPHA+I3t3aWtpLnJlc29sdmVMaW5rcyhpdGVtLnRleHQpfTwvcD5cIlxuICAgIGJpbmQ6IChkaXYsIGl0ZW0pIC0+XG4gICAgICBkaXYuZGJsY2xpY2sgLT4gd2lraS50ZXh0RWRpdG9yIGRpdiwgaXRlbVxuICAgICAgZGl2LmZpbmQoJ2ltZycpLmRibGNsaWNrIC0+IHdpa2kuZGlhbG9nIGl0ZW0udGV4dCwgdGhpc1xuICBmdXR1cmU6XG4gICAgZW1pdDogKGRpdiwgaXRlbSkgLT5cbiAgICAgIGRpdi5hcHBlbmQgXCJcIlwiI3tpdGVtLnRleHR9PGJyPjxicj48YnV0dG9uIGNsYXNzPVwiY3JlYXRlXCI+Y3JlYXRlPC9idXR0b24+IG5ldyBibGFuayBwYWdlXCJcIlwiXG4gICAgICBpZiAoaW5mbyA9IHdpa2kubmVpZ2hib3Job29kW2xvY2F0aW9uLmhvc3RdKT8gYW5kIGluZm8uc2l0ZW1hcD9cbiAgICAgICAgZm9yIGl0ZW0gaW4gaW5mby5zaXRlbWFwXG4gICAgICAgICAgaWYgaXRlbS5zbHVnLm1hdGNoIC8tdGVtcGxhdGUkL1xuICAgICAgICAgICAgZGl2LmFwcGVuZCBcIlwiXCI8YnI+PGJ1dHRvbiBjbGFzcz1cImNyZWF0ZVwiIGRhdGEtc2x1Zz0je2l0ZW0uc2x1Z30+Y3JlYXRlPC9idXR0b24+IGZyb20gI3t3aWtpLnJlc29sdmVMaW5rcyBcIltbI3tpdGVtLnRpdGxlfV1dXCJ9XCJcIlwiXG4gICAgYmluZDogKGRpdiwgaXRlbSkgLT5cbiIsIl8gPSByZXF1aXJlICd1bmRlcnNjb3JlJ1xuXG51dGlsID0gcmVxdWlyZSAnLi91dGlsLmNvZmZlZSdcbnBhZ2VIYW5kbGVyID0gcmVxdWlyZSAnLi9wYWdlSGFuZGxlci5jb2ZmZWUnXG5wbHVnaW4gPSByZXF1aXJlICcuL3BsdWdpbi5jb2ZmZWUnXG5zdGF0ZSA9IHJlcXVpcmUgJy4vc3RhdGUuY29mZmVlJ1xubmVpZ2hib3Job29kID0gcmVxdWlyZSAnLi9uZWlnaGJvcmhvb2QuY29mZmVlJ1xuYWRkVG9Kb3VybmFsID0gcmVxdWlyZSAnLi9hZGRUb0pvdXJuYWwuY29mZmVlJ1xud2lraSA9IHJlcXVpcmUoJy4vd2lraS5jb2ZmZWUnKVxucmVwb3NpdG9yeSA9IHJlcXVpcmUgJy4vcmVwb3NpdG9yeS5jb2ZmZWUnXG5cbmhhbmRsZURyYWdnaW5nID0gKGV2dCwgdWkpIC0+XG4gIGl0ZW1FbGVtZW50ID0gdWkuaXRlbVxuXG4gIGl0ZW0gPSB3aWtpLmdldEl0ZW0oaXRlbUVsZW1lbnQpXG4gIHRoaXNQYWdlRWxlbWVudCA9ICQodGhpcykucGFyZW50cygnLnBhZ2U6Zmlyc3QnKVxuICBzb3VyY2VQYWdlRWxlbWVudCA9IGl0ZW1FbGVtZW50LmRhdGEoJ3BhZ2VFbGVtZW50JylcbiAgc291cmNlU2l0ZSA9IHNvdXJjZVBhZ2VFbGVtZW50LmRhdGEoJ3NpdGUnKVxuXG4gIGRlc3RpbmF0aW9uUGFnZUVsZW1lbnQgPSBpdGVtRWxlbWVudC5wYXJlbnRzKCcucGFnZTpmaXJzdCcpXG4gIGVxdWFscyA9IChhLCBiKSAtPiBhIGFuZCBiIGFuZCBhLmdldCgwKSA9PSBiLmdldCgwKVxuXG4gIG1vdmVXaXRoaW5QYWdlID0gbm90IHNvdXJjZVBhZ2VFbGVtZW50IG9yIGVxdWFscyhzb3VyY2VQYWdlRWxlbWVudCwgZGVzdGluYXRpb25QYWdlRWxlbWVudClcbiAgbW92ZUZyb21QYWdlID0gbm90IG1vdmVXaXRoaW5QYWdlIGFuZCBlcXVhbHModGhpc1BhZ2VFbGVtZW50LCBzb3VyY2VQYWdlRWxlbWVudClcbiAgbW92ZVRvUGFnZSA9IG5vdCBtb3ZlV2l0aGluUGFnZSBhbmQgZXF1YWxzKHRoaXNQYWdlRWxlbWVudCwgZGVzdGluYXRpb25QYWdlRWxlbWVudClcblxuICBpZiBtb3ZlRnJvbVBhZ2VcbiAgICBpZiBzb3VyY2VQYWdlRWxlbWVudC5oYXNDbGFzcygnZ2hvc3QnKSBvclxuICAgICAgc291cmNlUGFnZUVsZW1lbnQuYXR0cignaWQnKSA9PSBkZXN0aW5hdGlvblBhZ2VFbGVtZW50LmF0dHIoJ2lkJylcbiAgICAgICAgIyBzdGVtIHRoZSBkYW1hZ2UsIGJldHRlciBpZGVhcyBoZXJlOlxuICAgICAgICAjIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMzkxNjA4OS9qcXVlcnktdWktc29ydGFibGVzLWNvbm5lY3QtbGlzdHMtY29weS1pdGVtc1xuICAgICAgICByZXR1cm5cblxuICBhY3Rpb24gPSBpZiBtb3ZlV2l0aGluUGFnZVxuICAgIG9yZGVyID0gJCh0aGlzKS5jaGlsZHJlbigpLm1hcCgoXywgdmFsdWUpIC0+ICQodmFsdWUpLmF0dHIoJ2RhdGEtaWQnKSkuZ2V0KClcbiAgICB7dHlwZTogJ21vdmUnLCBvcmRlcjogb3JkZXJ9XG4gIGVsc2UgaWYgbW92ZUZyb21QYWdlXG4gICAgd2lraS5sb2cgJ2RyYWcgZnJvbScsIHNvdXJjZVBhZ2VFbGVtZW50LmZpbmQoJ2gxJykudGV4dCgpXG4gICAge3R5cGU6ICdyZW1vdmUnfVxuICBlbHNlIGlmIG1vdmVUb1BhZ2VcbiAgICBpdGVtRWxlbWVudC5kYXRhICdwYWdlRWxlbWVudCcsIHRoaXNQYWdlRWxlbWVudFxuICAgIGJlZm9yZUVsZW1lbnQgPSBpdGVtRWxlbWVudC5wcmV2KCcuaXRlbScpXG4gICAgYmVmb3JlID0gd2lraS5nZXRJdGVtKGJlZm9yZUVsZW1lbnQpXG4gICAge3R5cGU6ICdhZGQnLCBpdGVtOiBpdGVtLCBhZnRlcjogYmVmb3JlPy5pZH1cbiAgYWN0aW9uLmlkID0gaXRlbS5pZFxuICBwYWdlSGFuZGxlci5wdXQgdGhpc1BhZ2VFbGVtZW50LCBhY3Rpb25cblxuaW5pdERyYWdnaW5nID0gKCRwYWdlKSAtPlxuICAkc3RvcnkgPSAkcGFnZS5maW5kKCcuc3RvcnknKVxuICAkc3Rvcnkuc29ydGFibGUoY29ubmVjdFdpdGg6ICcucGFnZSAuc3RvcnknKS5vbihcInNvcnR1cGRhdGVcIiwgaGFuZGxlRHJhZ2dpbmcpXG5cblxuaW5pdEFkZEJ1dHRvbiA9ICgkcGFnZSkgLT5cbiAgJHBhZ2UuZmluZChcIi5hZGQtZmFjdG9yeVwiKS5saXZlIFwiY2xpY2tcIiwgKGV2dCkgLT5cbiAgICByZXR1cm4gaWYgJHBhZ2UuaGFzQ2xhc3MgJ2dob3N0J1xuICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpXG4gICAgY3JlYXRlRmFjdG9yeSgkcGFnZSlcblxuY3JlYXRlRmFjdG9yeSA9ICgkcGFnZSkgLT5cbiAgaXRlbSA9XG4gICAgdHlwZTogXCJmYWN0b3J5XCJcbiAgICBpZDogdXRpbC5yYW5kb21CeXRlcyg4KVxuICBpdGVtRWxlbWVudCA9ICQoXCI8ZGl2IC8+XCIsIGNsYXNzOiBcIml0ZW0gZmFjdG9yeVwiKS5kYXRhKCdpdGVtJyxpdGVtKS5hdHRyKCdkYXRhLWlkJywgaXRlbS5pZClcbiAgaXRlbUVsZW1lbnQuZGF0YSAncGFnZUVsZW1lbnQnLCAkcGFnZVxuICAkcGFnZS5maW5kKFwiLnN0b3J5XCIpLmFwcGVuZChpdGVtRWxlbWVudClcbiAgcGx1Z2luLmRvIGl0ZW1FbGVtZW50LCBpdGVtXG4gIGJlZm9yZUVsZW1lbnQgPSBpdGVtRWxlbWVudC5wcmV2KCcuaXRlbScpXG4gIGJlZm9yZSA9IHdpa2kuZ2V0SXRlbShiZWZvcmVFbGVtZW50KVxuICBwYWdlSGFuZGxlci5wdXQgJHBhZ2UsIHtpdGVtOiBpdGVtLCBpZDogaXRlbS5pZCwgdHlwZTogXCJhZGRcIiwgYWZ0ZXI6IGJlZm9yZT8uaWR9XG5cbmJ1aWxkUGFnZUhlYWRlciA9ICh7cGFnZSx0b29sdGlwLGhlYWRlcl9ocmVmLGZhdmljb25fc3JjfSktPlxuICB0b29sdGlwICs9IFwiXFxuI3twYWdlLnBsdWdpbn0gcGx1Z2luXCIgaWYgcGFnZS5wbHVnaW5cbiAgXCJcIlwiPGgxIHRpdGxlPVwiI3t0b29sdGlwfVwiPjxhIGhyZWY9XCIje2hlYWRlcl9ocmVmfVwiPjxpbWcgc3JjPVwiI3tmYXZpY29uX3NyY31cIiBoZWlnaHQ9XCIzMnB4XCIgY2xhc3M9XCJmYXZpY29uXCI+PC9hPiAje3BhZ2UudGl0bGV9PC9oMT5cIlwiXCJcblxuZW1pdEhlYWRlciA9ICgkaGVhZGVyLCAkcGFnZSwgcGFnZSkgLT5cbiAgc2l0ZSA9ICRwYWdlLmRhdGEoJ3NpdGUnKVxuICBpc1JlbW90ZVBhZ2UgPSBzaXRlPyBhbmQgc2l0ZSAhPSAnbG9jYWwnIGFuZCBzaXRlICE9ICdvcmlnaW4nIGFuZCBzaXRlICE9ICd2aWV3J1xuICBoZWFkZXIgPSAnJ1xuICB2aWV3SGVyZSA9IGlmIHdpa2kuYXNTbHVnKHBhZ2UudGl0bGUpIGlzICd3ZWxjb21lLXZpc2l0b3JzJyB0aGVuIFwiXCJcbiAgZWxzZSBcIi92aWV3LyN7d2lraS5hc1NsdWcocGFnZS50aXRsZSl9XCJcbiAgcGFnZUhlYWRlciA9IGlmIGlzUmVtb3RlUGFnZVxuICAgIGJ1aWxkUGFnZUhlYWRlclxuICAgICAgdG9vbHRpcDogc2l0ZVxuICAgICAgaGVhZGVyX2hyZWY6IFwiLy8je3NpdGV9L3ZpZXcvd2VsY29tZS12aXNpdG9ycyN7dmlld0hlcmV9XCJcbiAgICAgIGZhdmljb25fc3JjOiBcIiN7cGFnZS5mYXZpY29ufVwiXG4gICAgICBwYWdlOiBwYWdlXG4gIGVsc2VcbiAgICBidWlsZFBhZ2VIZWFkZXJcbiAgICAgIHRvb2x0aXA6IGxvY2F0aW9uLmhvc3RcbiAgICAgIGhlYWRlcl9ocmVmOiBcIi92aWV3L3dlbGNvbWUtdmlzaXRvcnMje3ZpZXdIZXJlfVwiXG4gICAgICBmYXZpY29uX3NyYzogXCIje3BhZ2UuZmF2aWNvbn1cIlxuICAgICAgcGFnZTogcGFnZVxuXG4gICRoZWFkZXIuYXBwZW5kKCBwYWdlSGVhZGVyIClcbiAgXG4gIHVubGVzcyBpc1JlbW90ZVBhZ2VcbiAgICAkKCdpbWcuZmF2aWNvbicsJHBhZ2UpLmVycm9yIChlKS0+XG4gICAgICAkKCcjZmF2aWNvbicpLmF0dHIoJ2hyZWYnLCBwYWdlLmZhdmljb24pXG4gICAgICAkKCcuZmF2aWNvbicpLmF0dHIoJ3NyYycsIHBhZ2UuZmF2aWNvbilcbiAgaWYgJHBhZ2UuYXR0cignaWQnKS5tYXRjaCAvX3Jldi9cbiAgICByZXYgPSBwYWdlLmpvdXJuYWwubGVuZ3RoLTFcbiAgICBkYXRlID0gcGFnZS5qb3VybmFsW3Jldl0uZGF0ZVxuICAgICRwYWdlLmFkZENsYXNzKCdnaG9zdCcpLmRhdGEoJ3JldicscmV2KVxuICAgICRoZWFkZXIuYXBwZW5kICQgXCJcIlwiXG4gICAgICA8aDIgY2xhc3M9XCJyZXZpc2lvblwiPlxuICAgICAgICA8c3Bhbj5cbiAgICAgICAgICAje2lmIGRhdGU/IHRoZW4gdXRpbC5mb3JtYXREYXRlKGRhdGUpIGVsc2UgXCJSZXZpc2lvbiAje3Jldn1cIn1cbiAgICAgICAgPC9zcGFuPlxuICAgICAgPC9oMj5cbiAgICBcIlwiXCJcblxuZW1pdFR3aW5zID0gd2lraS5lbWl0VHdpbnMgPSAoJHBhZ2UpIC0+XG4gIHBhZ2UgPSAkcGFnZS5kYXRhICdkYXRhJ1xuICBzaXRlID0gJHBhZ2UuZGF0YSgnc2l0ZScpIG9yIHdpbmRvdy5sb2NhdGlvbi5ob3N0XG4gIHNpdGUgPSB3aW5kb3cubG9jYXRpb24uaG9zdCBpZiBzaXRlIGluIFsndmlldycsICdvcmlnaW4nXVxuICBzbHVnID0gd2lraS5hc1NsdWcgcGFnZS50aXRsZVxuICBpZiAoYWN0aW9ucyA9IHBhZ2Uuam91cm5hbD8ubGVuZ3RoKT8gYW5kICh2aWV3aW5nID0gcGFnZS52ZXJzaW9uKT9cbiAgICBiaW5zID0ge25ld2VyOltdLCBzYW1lOltdLCBvbGRlcjpbXX1cbiAgICAjIHtmZWQud2lraS5vcmc6IFt7c2x1ZzogXCJoYXBwZW5pbmdzXCIsIHRpdGxlOiBcIkhhcHBlbmluZ3NcIiwgZGF0ZTogMTM1ODk3NTMwMzAwMCwgc3lub3BzaXM6IFwiQ2hhbmdlcyBoZXJlIC4uLlwifV19XG4gICAgY29uc29sZS5sb2cgd2lraS5uZWlnaGJvcmhvb2RcbiAgICByZXBvc2l0b3J5LmdldFR3aW5zKHNsdWcsIChwYWdlcykgLT5cbiAgICAgIGZvciB0d2luIGluIHBhZ2VzXG4gICAgICAgIGJpbiA9IGlmIHR3aW4udmVyc2lvbiA+IHZpZXdpbmcgdGhlbiBiaW5zLm5ld2VyXG4gICAgICAgIGVsc2UgaWYgdHdpbi52ZXJzaW9uIDwgdmlld2luZyB0aGVuIGJpbnMub2xkZXJcbiAgICAgICAgZWxzZSBiaW5zLnNhbWVcbiAgICAgICAgYmluLnB1c2ggdHdpbiBpZiBiaW4gIT0gYmlucy5zYW1lXG4gICAgICB0d2lucyA9IFtdXG4gICAgICBmb3IgbGVnZW5kLCBiaW4gb2YgYmluc1xuICAgICAgICBjb250aW51ZSB1bmxlc3MgYmluLmxlbmd0aFxuICAgICAgICBiaW4uc29ydCAoYSxiKSAtPlxuICAgICAgICAgIGEudmVyc2lvbiA8IGIudmVyc2lvblxuICAgICAgICBmbGFncyA9IGZvciBwYWdlLCBpIGluIGJpblxuICAgICAgICAgIGJyZWFrIGlmIGkgPj0gOFxuICAgICAgICAgIFwiXCJcIjxpbWcgY2xhc3M9XCJyZW1vdGVcIlxuICAgICAgICAgICAgc3JjPVwiI3twYWdlLmZhdmljb259XCJcbiAgICAgICAgICAgIGRhdGEtc2x1Zz1cIiN7c2x1Z31cIlxuICAgICAgICAgICAgZGF0YS12ZXJzaW9uPVwiI3twYWdlLnZlcnNpb259XCI+XG4gICAgICAgICAgXCJcIlwiXG4gICAgICAgIHR3aW5zLnB1c2ggXCIje2ZsYWdzLmpvaW4gJyZuYnNwOyd9ICN7bGVnZW5kfVwiXG4gICAgICAkcGFnZS5maW5kKCcudHdpbnMnKS5odG1sIFwiXCJcIjxwPiN7dHdpbnMuam9pbiBcIiwgXCJ9PC9wPlwiXCJcIiBpZiB0d2luc1xuICAgIClcblxucmVuZGVyUGFnZUludG9QYWdlRWxlbWVudCA9IChwYWdlRGF0YSwkcGFnZSwgc2l0ZUZvdW5kKSAtPlxuICBwYWdlID0gJC5leHRlbmQodXRpbC5lbXB0eVBhZ2UoKSwgcGFnZURhdGEpXG4gICRwYWdlLmRhdGEoXCJkYXRhXCIsIHBhZ2UpXG4gIHNsdWcgPSAkcGFnZS5hdHRyKCdpZCcpXG4gIHNpdGUgPSAkcGFnZS5kYXRhKCdzaXRlJylcblxuICBjb250ZXh0ID0gWyd2aWV3J11cbiAgY29udGV4dC5wdXNoIHNpdGUgaWYgc2l0ZT9cbiAgYWRkQ29udGV4dCA9IChzaXRlKSAtPiBjb250ZXh0LnB1c2ggc2l0ZSBpZiBzaXRlPyBhbmQgbm90IF8uaW5jbHVkZSBjb250ZXh0LCBzaXRlXG4gIGFkZENvbnRleHQgYWN0aW9uLnNpdGUgZm9yIGFjdGlvbiBpbiBwYWdlLmpvdXJuYWwuc2xpY2UoMCkucmV2ZXJzZSgpXG5cbiAgd2lraS5yZXNvbHV0aW9uQ29udGV4dCA9IGNvbnRleHRcblxuICAkcGFnZS5lbXB0eSgpXG4gIFskdHdpbnMsICRoZWFkZXIsICRzdG9yeSwgJGpvdXJuYWwsICRmb290ZXJdID0gWyd0d2lucycsICdoZWFkZXInLCAnc3RvcnknLCAnam91cm5hbCcsICdmb290ZXInXS5tYXAgKGNsYXNzTmFtZSkgLT5cbiAgICAkKFwiPGRpdiAvPlwiKS5hZGRDbGFzcyhjbGFzc05hbWUpLmFwcGVuZFRvKCRwYWdlKVxuXG4gIGVtaXRIZWFkZXIgJGhlYWRlciwgJHBhZ2UsIHBhZ2VcblxuICBlbWl0SXRlbSA9IChpKSAtPlxuICAgIHJldHVybiBpZiBpID49IHBhZ2Uuc3RvcnkubGVuZ3RoXG4gICAgaXRlbSA9IHBhZ2Uuc3RvcnlbaV1cbiAgICBpZiBpdGVtPy50eXBlIGFuZCBpdGVtPy5pZFxuICAgICAgJGl0ZW0gPSAkIFwiXCJcIjxkaXYgY2xhc3M9XCJpdGVtICN7aXRlbS50eXBlfVwiIGRhdGEtaWQ9XCIje2l0ZW0uaWR9XCI+XCJcIlwiXG4gICAgICAkc3RvcnkuYXBwZW5kICRpdGVtXG4gICAgICBwbHVnaW4uZG8gJGl0ZW0sIGl0ZW0sIC0+IGVtaXRJdGVtIGkrMVxuICAgIGVsc2VcbiAgICAgICRzdG9yeS5hcHBlbmQgJCBcIlwiXCI8ZGl2PjxwIGNsYXNzPVwiZXJyb3JcIj5DYW4ndCBtYWtlIHNlbnNlIG9mIHN0b3J5WyN7aX1dPC9wPjwvZGl2PlwiXCJcIlxuICAgICAgZW1pdEl0ZW0gaSsxXG4gIGVtaXRJdGVtIDBcblxuICBmb3IgYWN0aW9uIGluIHBhZ2Uuam91cm5hbFxuICAgIGFkZFRvSm91cm5hbCAkam91cm5hbCwgYWN0aW9uXG5cbiAgZW1pdFR3aW5zICRwYWdlXG5cbiAgJGpvdXJuYWwuYXBwZW5kIFwiXCJcIlxuICAgIDxkaXYgY2xhc3M9XCJjb250cm9sLWJ1dHRvbnNcIj5cbiAgICAgIDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJidXR0b24gZm9yay1wYWdlXCIgdGl0bGU9XCJmb3JrIHRoaXMgcGFnZVwiPiN7dXRpbC5zeW1ib2xzWydmb3JrJ119PC9hPlxuICAgICAgPGEgaHJlZj1cIiNcIiBjbGFzcz1cImJ1dHRvbiBhZGQtZmFjdG9yeVwiIHRpdGxlPVwiYWRkIHBhcmFncmFwaFwiPiN7dXRpbC5zeW1ib2xzWydhZGQnXX08L2E+XG4gICAgPC9kaXY+XG4gIFwiXCJcIlxuXG4gICRmb290ZXIuYXBwZW5kIFwiXCJcIlxuICAgIDxhIGlkPVwibGljZW5zZVwiIGhyZWY9XCJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9saWNlbnNlcy9ieS1zYS8zLjAvXCI+Q0MgQlktU0EgMy4wPC9hPiAuXG4gICAgPGEgY2xhc3M9XCJzaG93LXBhZ2Utc291cmNlXCIgaHJlZj1cIi8je3NsdWd9Lmpzb24/cmFuZG9tPSN7dXRpbC5yYW5kb21CeXRlcyg0KX1cIiB0aXRsZT1cInNvdXJjZVwiPkpTT048L2E+IC5cbiAgICA8YSBocmVmPSBcIi8vI3tzaXRlRm91bmQgfHwgbG9jYXRpb24uaG9zdH0vI3tzbHVnfS5odG1sXCI+I3tzaXRlRm91bmQgfHwgbG9jYXRpb24uaG9zdH08L2E+XG4gIFwiXCJcIlxuXG5cbndpa2kuYnVpbGRQYWdlID0gKGRhdGEsc2l0ZUZvdW5kLCRwYWdlKSAtPlxuICBpZiBzaXRlRm91bmQgPT0gJ2xvY2FsJ1xuICAgICRwYWdlLmFkZENsYXNzKCdsb2NhbCcpXG4gIGVsc2UgaWYgc2l0ZUZvdW5kXG4gICAgc2l0ZUZvdW5kID0gJ29yaWdpbicgaWYgc2l0ZUZvdW5kIGlzIHdpbmRvdy5sb2NhdGlvbi5ob3N0XG4gICAgJHBhZ2UuYWRkQ2xhc3MoJ3JlbW90ZScpIHVubGVzcyBzaXRlRm91bmQgaW4gWyd2aWV3JywgJ29yaWdpbiddXG4gICAgJHBhZ2UuZGF0YSgnc2l0ZScsIHNpdGVGb3VuZClcbiAgaWYgZGF0YS5wbHVnaW4/XG4gICAgJHBhZ2UuYWRkQ2xhc3MoJ3BsdWdpbicpXG4gICRwYWdlLmFkZENsYXNzKHdpa2kuYXNTbHVnKGRhdGEudGl0bGUpKVxuICAjVE9ETzogYXZvaWQgcGFzc2luZyBzaXRlRm91bmRcbiAgcmVuZGVyUGFnZUludG9QYWdlRWxlbWVudCggZGF0YSwgJHBhZ2UsIHNpdGVGb3VuZCApXG5cbiAgc3RhdGUuc2V0VXJsKClcblxuICBpbml0RHJhZ2dpbmcgJHBhZ2VcbiAgaW5pdEFkZEJ1dHRvbiAkcGFnZVxuICAkcGFnZVxuXG5cbm1vZHVsZS5leHBvcnRzID0gcmVmcmVzaCA9IHdpa2kucmVmcmVzaCA9IC0+XG4gICRwYWdlID0gJCh0aGlzKVxuXG4gIFtzbHVnLCByZXZdID0gJHBhZ2UuYXR0cignaWQnKS5zcGxpdCgnX3JldicpXG4gIHBhZ2VJbmZvcm1hdGlvbiA9IHtcbiAgICBzbHVnOiBzbHVnXG4gICAgcmV2OiByZXZcbiAgICBzaXRlOiAkcGFnZS5kYXRhKCdzaXRlJylcbiAgICB2ZXJzaW9uOiAkcGFnZS5kYXRhKCd2ZXJzaW9uJylcbiAgfVxuICBjb25zb2xlLmxvZyAkcGFnZS5kYXRhKCd2ZXJzaW9uJylcbiAgY3JlYXRlR2hvc3RQYWdlID0gLT5cbiAgICB0aXRsZSA9ICQoXCJcIlwiYVtocmVmPVwiLyN7c2x1Z30uaHRtbFwiXTpsYXN0XCJcIlwiKS50ZXh0KCkgb3Igc2x1Z1xuICAgIHBhZ2UgPVxuICAgICAgJ3RpdGxlJzogdGl0bGVcbiAgICAgICdzdG9yeSc6IFtcbiAgICAgICAgJ2lkJzogdXRpbC5yYW5kb21CeXRlcyA4XG4gICAgICAgICd0eXBlJzogJ2Z1dHVyZSdcbiAgICAgICAgJ3RleHQnOiAnV2UgY291bGQgbm90IGZpbmQgdGhpcyBwYWdlLidcbiAgICAgICAgJ3RpdGxlJzogdGl0bGVcbiAgICAgIF0sXG4gICAgICAnZmF2aWNvbic6IHJlcG9zaXRvcnkuZmF2aWNvblxuICAgIGhlYWRpbmcgPVxuICAgICAgJ3R5cGUnOiAncGFyYWdyYXBoJ1xuICAgICAgJ2lkJzogdXRpbC5yYW5kb21CeXRlcyg4KVxuICAgICAgJ3RleHQnOiBcIldlIGRpZCBmaW5kIHRoZSBwYWdlIGluIHlvdXIgY3VycmVudCBuZWlnaGJvcmhvb2QuXCJcbiAgICBoaXRzID0gW11cbiAgICBmb3Igc2l0ZSwgaW5mbyBvZiB3aWtpLm5laWdoYm9yaG9vZFxuICAgICAgaWYgaW5mby5zaXRlbWFwP1xuICAgICAgICByZXN1bHQgPSBfLmZpbmQgaW5mby5zaXRlbWFwLCAoZWFjaCkgLT5cbiAgICAgICAgICBlYWNoLnNsdWcgPT0gc2x1Z1xuICAgICAgICBpZiByZXN1bHQ/XG4gICAgICAgICAgaGl0cy5wdXNoXG4gICAgICAgICAgICBcInR5cGVcIjogXCJyZWZlcmVuY2VcIlxuICAgICAgICAgICAgXCJpZFwiOiB1dGlsLnJhbmRvbUJ5dGVzKDgpXG4gICAgICAgICAgICBcInNpdGVcIjogc2l0ZVxuICAgICAgICAgICAgXCJzbHVnXCI6IHNsdWdcbiAgICAgICAgICAgIFwidGl0bGVcIjogcmVzdWx0LnRpdGxlIHx8IHNsdWdcbiAgICAgICAgICAgIFwidGV4dFwiOiByZXN1bHQuc3lub3BzaXMgfHwgJydcbiAgICBpZiBoaXRzLmxlbmd0aCA+IDBcbiAgICAgIHBhZ2Uuc3RvcnkucHVzaCBoZWFkaW5nLCBoaXRzLi4uXG4gICAgICBwYWdlLnN0b3J5WzBdLnRleHQgPSAnV2UgY291bGQgbm90IGZpbmQgdGhpcyBwYWdlIGluIHRoZSBleHBlY3RlZCBjb250ZXh0LidcbiAgICB3aWtpLmJ1aWxkUGFnZSggcGFnZSwgdW5kZWZpbmVkLCAkcGFnZSApLmFkZENsYXNzKCdnaG9zdCcpXG5cbiAgcmVnaXN0ZXJOZWlnaGJvcnMgPSAoZGF0YSwgc2l0ZSkgLT5cbiAgICBpZiBfLmluY2x1ZGUgWydsb2NhbCcsICdvcmlnaW4nLCAndmlldycsIG51bGwsIHVuZGVmaW5lZF0sIHNpdGVcbiAgICAgIG5laWdoYm9yaG9vZC5yZWdpc3Rlck5laWdoYm9yIGxvY2F0aW9uLmhvc3RcbiAgICBlbHNlXG4gICAgICBuZWlnaGJvcmhvb2QucmVnaXN0ZXJOZWlnaGJvciBzaXRlXG4gICAgZm9yIGl0ZW0gaW4gKGRhdGEuc3RvcnkgfHwgW10pXG4gICAgICBuZWlnaGJvcmhvb2QucmVnaXN0ZXJOZWlnaGJvciBpdGVtLnNpdGUgaWYgaXRlbS5zaXRlP1xuICAgIGZvciBhY3Rpb24gaW4gKGRhdGEuam91cm5hbCB8fCBbXSlcbiAgICAgIG5laWdoYm9yaG9vZC5yZWdpc3Rlck5laWdoYm9yIGFjdGlvbi5zaXRlIGlmIGFjdGlvbi5zaXRlP1xuXG4gIHdoZW5Hb3R0ZW4gPSAoZGF0YSxzaXRlRm91bmQpIC0+XG4gICAgd2lraS5idWlsZFBhZ2UoIGRhdGEsIHNpdGVGb3VuZCwgJHBhZ2UgKVxuICAgIHJlZ2lzdGVyTmVpZ2hib3JzKCBkYXRhLCBzaXRlRm91bmQgKVxuXG4gIHBhZ2VIYW5kbGVyLmdldFxuICAgIHdoZW5Hb3R0ZW46IHdoZW5Hb3R0ZW5cbiAgICB3aGVuTm90R290dGVuOiBjcmVhdGVHaG9zdFBhZ2VcbiAgICBwYWdlSW5mb3JtYXRpb246IHBhZ2VJbmZvcm1hdGlvblxuXG4iLCIjIyMgUGFnZSBNaXJyb3Jpbmcgd2l0aCBJbmRleGVkREIgIyMjXG4jIEZvciBPZmZsaW5lIG1vZGUsIHdlIG1pcnJvciBhbGwgcGFnZXMgaW4gdGhlIGJyb3dzZXJzIEluZGV4ZWREQiB1c2luZyBJREJXcmFwcGVyIChodHRwczovL2dpdGh1Yi5jb20vamVuc2FycHMvSURCV3JhcHBlcilcblxucmV2aXNpb24gPSByZXF1aXJlICcuL3JldmlzaW9uLmNvZmZlZSdcbnBsdWdpbiA9IHJlcXVpcmUgJy4vcGx1Z2luLmNvZmZlZSdcbm1vZHVsZS5leHBvcnRzID0gd2lraS5yZXBvID0gcmVwbyA9IHt9XG5cblxucGFnZVRvQ29udGVudE9iamVjdCA9IChqc29uKSAtPlxuICBzbHVnID0gd2lraS5hc1NsdWcoanNvbi50aXRsZSlcbiAgbmFtZSA9IG5ldyBOYW1lKHNsdWcpXG4gIHNpZ25lZCA9IG5ldyBTaWduZWRJbmZvKClcbiAgY29udGVudCA9IHt9XG4gIGNvbnRlbnQub2JqZWN0PSBuZXcgQ29udGVudE9iamVjdChuYW1lLCBzaWduZWQsIGpzb24sIG5ldyBTaWduYXR1cmUoKSlcbiAgY29udGVudC5vYmplY3Quc2lnbigpXG4gIGNvbnRlbnQucGFnZSA9IHNsdWdcbiAgcmV0dXJuIGNvbnRlbnRcblxucmVwby5mYXZpY29uID0gJydcblxuXG5cbiNEZWZpbmUgdGhlIHBhZ2UgT2JqZWN0IFN0b3JlLCAgXG5wYWdlU3RvcmVPcHRzID0ge1xuICBkYlZlcnNpb246IDEsXG4gIHN0b3JlTmFtZTogXCJwYWdlXCIsXG4gIGF1dG9JbmNyZW1lbnQ6IHRydWUsXG4gIGluZGV4ZXM6IFtcbiAgICB7bmFtZTogXCJuYW1lXCIsIHVuaXF1ZTogdHJ1ZX1cbiAgXVxufVxuXG5zdGF0dXNPcHRzPSB7XG4gIGRiVmVyc2lvbjogMSxcbiAgc3RvcmVOYW1lOiBcInN0YXR1c1wiLFxuICBrZXlwYXRoOiAnaWQnLFxuICBhdXRvaW5jcmVtZW50OiB0cnVlLFxuICBpbmRleGVzOiBbXG4gICAgeyBuYW1lOiAndHlwZScsIHVuaXF1ZTogZmFsc2UsIG11bHRpRW50cnk6IGZhbHNlIH1cbiAgXSxcbiAgb25TdG9yZVJlYWR5OiAoKSAtPlxuICAgIG9uU3VjY2VzcyA9IChpdGVtKSAtPlxuICAgICAgaWYgaXRlbT9cbiAgICAgICAgcmVwby5mYXZpY29uID0gaXRlbS5kYXRhVXJsXG4gICAgICAgIGNvbnNvbGUubG9nIGl0ZW1cbiAgICAgIGVsc2VcbiAgICAgICAgY29uc29sZS5sb2cgXCIyMjJmYXZpY29uIG5vdCBmb3VuZCwgZ2VuZXJhdGluZy4uLlwiXG4gICAgICAgIHBsdWdpbi5nZXQgJ2Zhdmljb24nLCAoZmF2aWNvbikgLT5cbiAgICAgICAgICBmYXZpY29uLmNyZWF0ZShzdGF0dXMsIHJlcG8pXG4gICAgb25FcnJvciA9ICgpIC0+XG4gICAgICBjb25zb2xlLmxvZyBcIjExMWZhdmljb24gbm90IGZvdW5kLCBnZW5lcmF0aW5nLi4uXCJcbiAgICAgIHBsdWdpbi5nZXQgJ2Zhdmljb24nLCAoZmF2aWNvbikgLT5cbiAgICAgICAgZmF2aWNvbi5jcmVhdGUoc3RhdHVzLCByZXBvKVxuICAgIHN0YXR1cy5nZXQoMSwgb25TdWNjZXNzLCBvbkVycm9yKVxufVxucmVwby5nZXRTaXRlbWFwID0gKHdoZW5Hb3R0ZW4pIC0+XG4gIHNpdGVtYXAgPSBuZXcgSURCU3RvcmUoe1xuICAgIGRiVmVyc2lvbjogMSxcbiAgICBzdG9yZU5hbWU6IFwic3lzdGVtL3NpdGVtYXAuanNvblwiLFxuICAgIGtleVBhdGg6ICd2ZXJzaW9uJyxcbiAgICBhdXRvSW5jcmVtZW50OiBmYWxzZSxcbiAgICBvblN0b3JlUmVhZHk6ICgpIC0+XG4gICAgICBvbnNpdGVtYXBzID0gKHNpdGVtYXBzKSAtPlxuICAgICAgICBjb25zb2xlLmxvZyBzaXRlbWFwc1swXVxuICAgICAgICB3aGVuR290dGVuKHNpdGVtYXBzW3NpdGVtYXBzLmxlbmd0aC0xXSlcbiAgICAgIHNpdGVtYXAuZ2V0QWxsKG9uc2l0ZW1hcHMpXG4gIH0pXG5cbnJlcG8udXBkYXRlU2l0ZW1hcCA9ICgpIC0+XG4gIGZldGNoUGFnZXMgPSAocGFnZXMpIC0+XG4gICAgZm9yIHBhZ2UgaW4gcGFnZXNcbiAgICAgIGNvbnNvbGUubG9nIHBhZ2VcbiAgICAgIHNpdGVtYXAubGlzdC5wdXNoKHBhZ2UubmFtZSlcbiAgICBcbiAgICAgIHNpdGVtYXBzID0gbmV3IElEQlN0b3JlKHtcbiAgICAgICAgZGJWZXJzaW9uOiAxLFxuICAgICAgICBzdG9yZU5hbWU6IFwic3lzdGVtL3NpdGVtYXAuanNvblwiLFxuICAgICAgICBrZXlQYXRoOiBcInZlcnNpb25cIixcbiAgICAgICAgYXV0b0luY3JlbWVudDogZmFsc2UsXG4gICAgICAgIG9uU3RvcmVSZWFkeTogKCkgLT5cbiAgICAgICAgICBvbkl0ZW0gPSAoZGF0YSkgLT5cbiAgICAgICAgICAgIHNpdGVtYXBzLnJlbW92ZShkYXRhLnZlcnNpb24pXG4gICAgICAgICAgc2l0ZW1hcHMuaXRlcmF0ZShvbkl0ZW0se1xuICAgICAgICAgICAgb3JkZXI6ICdERVNDJyxcbiAgICAgICAgICAgIG9uRW5kOiAoKSAtPlxuICAgICAgICAgICAgICBzaXRlbWFwcy5wdXQoc2l0ZW1hcClcbiAgICAgICAgICAgICAgY29uc29sZS5sb2cgXCJwdXQgc2l0ZW1hcFwiXG4gICAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgcmVwb3NpdG9yeS5nZXRBbGwoZmV0Y2hQYWdlcylcbiAgICBjb25zb2xlLmxvZyAndGhlcmUnXG4gIFxuXG53aWtpLnJlcG8udXBkYXRlUGFnZUZyb21QZWVyID0gKGpzb24pIC0+XG4gIGlmIGpzb24/XG4gICAgcmVwb3NpdG9yeSA9IG5ldyBJREJTdG9yZShwYWdlU3RvcmVPcHRzLCAoKSAtPlxuICAgICAgY29uc29sZS5sb2cganNvbi5wYWdlXG4gICAgICBjb25zb2xlLmxvZyByZXBvc2l0b3J5XG4gICAgICBvblN1Y2Nlc3MgPSAoKSAtPlxuICAgICAgICBjb25zb2xlLmxvZyBcInN1Y2Nlc3MhXCJcbiAgICAgIG9uRXJyb3IgPSAoKSAtPlxuICAgICAgICBjb25zb2xlLmxvZyBcImFscmVhZHkgZ290IHBhZ2UhXCJcbiAgICAgIHJlcG9zaXRvcnkucHV0KHtuYW1lOiBqc29uLnBhZ2V9LCBvblN1Y2Nlc3MsIG9uRXJyb3IgKVxuICAgICAgcGFnZSA9IG5ldyBJREJTdG9yZSh7XG4gICAgICAgIGRiVmVyc2lvbjogMSxcbiAgICAgICAgc3RvcmVOYW1lOiBcInBhZ2UvI3tqc29uLnBhZ2V9XCIsXG4gICAgICAgIGtleVBhdGg6ICd2ZXJzaW9uJyxcbiAgICAgICAgYXV0b0luY3JlbWVudDogZmFsc2UsXG4gICAgICAgIG9uU3RvcmVSZWFkeTogKCkgLT5cbiAgICAgICAgICBqc29uLnZlcnNpb24gPSBqc29uLmpvdXJuYWxbanNvbi5qb3VybmFsLmxlbmd0aCAtIDFdLmRhdGVcbiAgICAgICAgICBmb3IgdmVyc2lvbiBpbiBqc29uLmV4Y2x1ZGVzXG4gICAgICAgICAgICBwYWdlLnJlbW92ZSAodmVyc2lvbilcbiAgICAgICAgICBjb25zb2xlLmxvZyBcInB1dHRpbmdcIiwganNvblxuICAgICAgICAgIG9uU3VjY2VzcyA9ICgpIC0+XG4gICAgICAgICAgICBjb25zb2xlLmxvZyBcInN1Y2Nlc3NmdWxseSBwdXQgXCIsIGpzb25cbiAgICAgICAgICAgIHdpa2kuZW1pdFR3aW5zKCQoXCIjI3t3aWtpLmFzU2x1Zyhqc29uLnRpdGxlKX1cIikpXG4gICAgICAgICAgICBpZiAkKFwiLiN7d2lraS5hc1NsdWcoanNvbi50aXRsZSl9XCIpLmhhc0NsYXNzKFwiZ2hvc3RcIilcbiAgICAgICAgICAgICAgY29uc29sZS5sb2cgXCJ1cGRhdGVkIGdob3N0IHBhZ2VcIlxuICAgICAgICAgICAgICB3aWtpLmJ1aWxkUGFnZShqc29uLCBudWxsLCAkKFwiLiN7d2lraS5hc1NsdWcoanNvbi50aXRsZSl9XCIpKVxuICAgICAgICAgICAgICAkKFwiLiN7d2lraS5hc1NsdWcoanNvbi50aXRsZSl9XCIpLnJlbW92ZUNsYXNzKFwiZ2hvc3RcIilcbiAgICAgICAgICBwYWdlLnB1dCBqc29uLCBvblN1Y2Nlc3NcbiAgICAgICAgICBcbiAgICAgIH0pXG4gICAgKVxuXG5cbnJlcG8uc2VuZFVwZGF0ZU5vdGlmaWVyID0gKGpzb24pIC0+XG4gIGZvciBmYWNlIGluIGludGVyZmFjZXMuYWN0aXZlXG4gICAgcHJlZml4ID0gd2lraS51cmxUb1ByZWZpeChmYWNlLmhvc3QpXG4gICAgdXJpID0gcHJlZml4ICsgXCIvcGFnZS91cGRhdGUvXCIgKyBqc29uLnBhZ2UgKyAnLycgKyBqc29uLnZlcnNpb25cbiAgICBuYW1lID0gbmV3IE5hbWUodXJpKVxuICAgIHRlbXBsYXRlID0ge31cbiAgICB0ZW1wbGF0ZS5jaGlsZFNlbGVjdG9yID0gMVxuICAgIGludGVyZXN0ID0gbmV3IEludGVyZXN0KG5hbWUpXG4gICAgaW50ZXJlc3QuY2hpbGRTZWxlY3RvciA9IDFcbiAgICBjbG9zdXJlID0gbmV3IENvbnRlbnRDbG9zdXJlKGZhY2UsIG5hbWUsIGludGVyZXN0LCB3aWtpLnJlcG8udXBkYXRlUGFnZUZyb21QZWVyKVxuICAgIGZhY2UuZXhwcmVzc0ludGVyZXN0KG5hbWUsIGNsb3N1cmUsIHRlbXBsYXRlKVxuXG53aWtpLnJlcG8udXBkYXRlUGFnZSA9IChqc29uKSAtPlxuICBpZiBqc29uP1xuICAgIHJlcG9zaXRvcnkgPSBuZXcgSURCU3RvcmUocGFnZVN0b3JlT3B0cywgKCkgLT5cbiAgICAgIGNvbnNvbGUubG9nIGpzb24ucGFnZVxuICAgICAgY29uc29sZS5sb2cgcmVwb3NpdG9yeVxuICAgICAgb25TdWNjZXNzID0gKCkgLT5cbiAgICAgICAgY29uc29sZS5sb2cgXCJzdWNjZXNzIVwiXG4gICAgICBvbkVycm9yID0gKCkgLT5cbiAgICAgICAgY29uc29sZS5sb2cgXCJhbHJlYWR5IGdvdCBwYWdlIVwiXG4gICAgICByZXBvc2l0b3J5LnB1dCh7bmFtZToganNvbi5wYWdlfSwgb25TdWNjZXNzLCBvbkVycm9yIClcbiAgICAgIHBhZ2UgPSBuZXcgSURCU3RvcmUoe1xuICAgICAgICBkYlZlcnNpb246IDEsXG4gICAgICAgIHN0b3JlTmFtZTogXCJwYWdlLyN7anNvbi5wYWdlfVwiLFxuICAgICAgICBrZXlQYXRoOiAndmVyc2lvbicsXG4gICAgICAgIGF1dG9JbmNyZW1lbnQ6IGZhbHNlLFxuICAgICAgICBvblN0b3JlUmVhZHk6ICgpIC0+XG4gICAgICAgICAganNvbi52ZXJzaW9uID0ganNvbi5qb3VybmFsW2pzb24uam91cm5hbC5sZW5ndGggLSAxXS5kYXRlXG4gICAgICAgICAgZm9yIHZlcnNpb24gaW4ganNvbi5leGNsdWRlc1xuICAgICAgICAgICAgcGFnZS5yZW1vdmUgKHZlcnNpb24pXG4gICAgICAgICAgY29uc29sZS5sb2cgXCJ1cGRhdGluZyBcIiwganNvbi50aXRsZVxuICAgICAgICAgIG9uU3VjY2VzcyA9ICgpIC0+XG4gICAgICAgICAgICB3aWtpLmVtaXRUd2lucygkKFwiIyN7d2lraS5hc1NsdWcoanNvbi50aXRsZSl9XCIpKVxuICAgICAgICAgICAgaWYgJChcIi4je3dpa2kuYXNTbHVnKGpzb24udGl0bGUpfVwiKS5oYXNDbGFzcyhcImdob3N0XCIpXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nIFwidXBkYXRlZCBnaG9zdCBwYWdlXCJcbiAgICAgICAgICAgICAgd2lraS5idWlsZFBhZ2UoanNvbiwgbnVsbCwgJChcIi4je3dpa2kuYXNTbHVnKGpzb24udGl0bGUpfVwiKSlcbiAgICAgICAgICAgICAgJChcIi4je3dpa2kuYXNTbHVnKGpzb24udGl0bGUpfVwiKS5yZW1vdmVDbGFzcyhcImdob3N0XCIpXG4gICAgICAgICAgICBpZiBuYXZpZ2F0b3Iub25MaW5lID09IHRydWVcbiAgICAgICAgICAgICAgY29uc29sZS5sb2cgXCJvbmxpbmU6IHN1Y2Nlc3NmdWxseSB1cGRhdGVkIFwiLCBqc29uLnRpdGxlLCBcIiwgc2VuZGluZyB1cGRhdGUgbm90aWZpZXIuXCJcbiAgICAgICAgICAgICAgcmVwby5zZW5kVXBkYXRlTm90aWZpZXIoanNvbilcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgY29uc29sZS5sb2cgXCJvZmZsaW5lOiBzdWNjZXNzZnVsbHkgdXBkYXRlZCBcIiwganNvbi50aXRsZSwgXCIgbG9jYWxseS5cIlxuICAgICAgICAgIHBhZ2UucHV0IGpzb24sIG9uU3VjY2Vzc1xuICAgICAgICAgIFxuICAgICAgfSlcbiAgICApXG5cblxucmVwby5nZXRUd2lucyA9IChzbHVnLCBjYWxsYmFjaykgLT5cbiAgdHdpbnMgPSBuZXcgSURCU3RvcmUgKHtcbiAgICBkYlZlcnNpb246IDEsXG4gICAgc3RvcmVOYW1lOiBcInBhZ2UvI3tzbHVnfS5qc29uXCIsXG4gICAga2V5UGF0aDogJ3ZlcnNpb24nLFxuICAgIGF1dG9JbmNyZW1lbnQ6IGZhbHNlLFxuICAgIG9uU3RvcmVSZWFkeTogKCkgLT5cbiAgICAgIGNvbnNvbGUubG9nIHR3aW5zXG4gICAgICB0d2lucy5nZXRBbGwoY2FsbGJhY2spXG4gICAgICBjb25zb2xlLmxvZyAnZ290IGhlcmUnXG4gIH0pXG5cbnJlcG8uZ2V0UGFnZSA9IChwYWdlSW5mb3JtYXRpb24sIHdoZW5Hb3R0ZW4sIHdoZW5Ob3RHb3R0ZW4pIC0+XG4gIHBhZ2UgPSBuZXcgSURCU3RvcmUoe1xuICAgIGRiVmVyc2lvbjogMSxcbiAgICBzdG9yZU5hbWU6IFwicGFnZS8je3BhZ2VJbmZvcm1hdGlvbi5zbHVnfS5qc29uXCIsXG4gICAga2V5UGF0aDogJ3ZlcnNpb24nLFxuICAgIGF1dG9JbmNyZW1lbnQ6IGZhbHNlLFxuICAgIG9uU3RvcmVSZWFkeTogKCkgLT5cbiAgICAgIG5hbWUgPSBcIi9sb2NhbGhvc3QvcGFnZS8je3BhZ2VJbmZvcm1hdGlvbi5zbHVnfS5qc29uXCJcbiAgICAgIGlmIHBhZ2VJbmZvcm1hdGlvbi52ZXJzaW9uP1xuICAgICAgICBjb25zb2xlLmxvZyAncmVxdWVzdGluZyBzcGVjaWZpYyB2ZXJzaW9uJywgcGFnZUluZm9ybWF0aW9uXG4gICAgICAgIHBhZ2UuZ2V0KHBhZ2VJbmZvcm1hdGlvbi52ZXJzaW9uLCAocGFnZSkgLT5cbiAgICAgICAgICBjb25zb2xlLmxvZyBwYWdlXG4gICAgICAgICAgd2hlbkdvdHRlbihwYWdlKVxuICAgICAgICApXG4gICAgICBlbHNlXG4gICAgICAgIGZvdW5kID0gZmFsc2VcbiAgICAgICAgb25JdGVtMSA9IChjb250ZW50LCBjdXJzb3IsIHRyYW5zYWN0aW9uKSAtPlxuICAgICAgICAgIGNvbnNvbGUubG9nIGNvbnRlbnRcbiAgICAgICAgICBpZiBjb250ZW50ICE9IG51bGxcbiAgICAgICAgICAgIGlmIGNvbnRlbnQuZmF2aWNvbiA9PSByZXBvLmZhdmljb25cbiAgICAgICAgICAgICAgaWYgZm91bmQgPT0gZmFsc2VcbiAgICAgICAgICAgICAgICBmb3VuZCA9IHRydWVcbiAgICAgICAgICAgICAgICB3aGVuR290dGVuKGNvbnRlbnQpXG4gICAgICAgIG9uSXRlbTIgPSAoY29udGVudCwgY3Vyc29yLCB0cmFuc2FjdGlvbikgLT5cbiAgICAgICAgICBpZiBjb250ZW50ICE9IG51bGxcbiAgICAgICAgICAgIGlmIGZvdW5kID09IGZhbHNlXG4gICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZVxuICAgICAgICAgICAgICB3aGVuR290dGVuKGNvbnRlbnQpXG4gICAgICAgIG9uQ2hlY2tFbmQxID0gKCkgLT5cbiAgICAgICAgICBpZiBmb3VuZCA9PSBmYWxzZVxuICAgICAgICAgICAgY29uc29sZS5sb2cgJ2ZvdW5kOiAnLCBmb3VuZFxuICAgICAgICAgICAgcGFnZS5pdGVyYXRlKG9uSXRlbTIsIHtcbiAgICAgICAgICAgICAgb3JkZXI6ICdERVNDJyxcbiAgICAgICAgICAgICAgb25FbmQ6IG9uQ2hlY2tFbmQyXG4gICAgICAgICAgICB9KVxuICAgICAgICBvbkNoZWNrRW5kMiA9ICgpIC0+XG4gICAgICAgICAgaWYgZm91bmQgPT0gZmFsc2VcbiAgICAgICAgICAgIGNvbnNvbGUubG9nICdEaWRudCBGaW5kIFBhZ2UhJ1xuICAgICAgICAgICAgd2hlbk5vdEdvdHRlbigpIGlmIHdoZW5Ob3RHb3R0ZW4/XG4gICAgICAgIHBhZ2UuaXRlcmF0ZShvbkl0ZW0xLCB7XG4gICAgICAgICAgb3JkZXI6ICdERVNDJyxcbiAgICAgICAgICBvbkVuZDogb25DaGVja0VuZDEoKVxuICAgICAgICB9KVxuICB9KVxuXG5cbnN0YXR1cyA9IG5ldyBJREJTdG9yZShzdGF0dXNPcHRzKVxucmVwb3NpdG9yeSA9IG5ldyBJREJTdG9yZShwYWdlU3RvcmVPcHRzLCAoKSAtPlxuICAjIyNcbiAgaWYgbmF2aWdhdG9yLm9uTGluZSA9PSB0cnVlXG4gICAgY29uc29sZS5sb2cgXCJvbmxpbmU6IGFubm91bmNpbmcgcGFnZXNcIlxuICAgIGZldGNoUGFnZXMgPSAocGFnZXMpIC0+XG4gICAgICBmb3IgcGFnZSBpbiBwYWdlc1xuICAgICAgICBwSSA9IHt9XG4gICAgICAgIHBJLnNsdWcgPSBwYWdlLm5hbWUuc2xpY2UoMCwgLTUpXG4gICAgICAgIGNvbnNvbGUubG9nIHBJICAgICAgXG4gICAgICAgIHJlcG8uZ2V0UGFnZShwSSwgcmVwby5zZW5kVXBkYXRlTm90aWZpZXIpXG4gICAgcmVwb3NpdG9yeS5nZXRBbGwoZmV0Y2hQYWdlcylcbiAgZWxzZVxuICAgIGNvbnNvbGUubG9nIFwib2ZmbGluZTogcmVwb3NpdG9yeSBpbmRleCBpbml0aWFsaXplZFwiXG4gICMjI1xuKVxuIyBUYWtlIGEgcGFnZSBKU09OIG9iamVjdCBhbmQgY29udmVydCBpdCB0byBhbiBlbnRyeSB3aXRoIHN0cmluZyB1cmkgYW5kIE5ETiBjb250ZW50T2JqZWN0XG4jIFRPRE86IHNlZ21lbnRhdGlvbiBhbmQgdGltZXN0YW1waW5nXG5cbiIsIiMgKipyZXZpc2lvbi5jb2ZmZWUqKlxuIyBUaGlzIG1vZHVsZSBnZW5lcmF0ZXMgYSBwYXN0IHJldmlzaW9uIG9mIGEgZGF0YSBmaWxlIGFuZCBjYWNoZXMgaXQgaW4gJ2RhdGEvcmV2Jy5cbiNcbiMgVGhlIHNhdmVkIGZpbGUgaGFzIHRoZSBuYW1lIG9mIHRoZSBpZCBvZiB0aGUgcG9pbnQgaW4gdGhlIGpvdXJuYWwncyBoaXN0b3J5XG4jIHRoYXQgdGhlIHJldmlzaW9uIHJlcHJlc2VudHMuXG5cbmNyZWF0ZSA9IChyZXZJbmRleCwgZGF0YSkgLT5cbiAgam91cm5hbCA9IGRhdGEuam91cm5hbFxuICByZXZUaXRsZSA9IGRhdGEudGl0bGVcbiAgcmV2U3RvcnkgPSBbXVxuICByZXZKb3VybmFsID0gam91cm5hbFswLi4oK3JldkluZGV4KV1cbiAgZm9yIGpvdXJuYWxFbnRyeSBpbiByZXZKb3VybmFsXG4gICAgcmV2U3RvcnlJZHMgPSByZXZTdG9yeS5tYXAgKHN0b3J5SXRlbSkgLT4gc3RvcnlJdGVtLmlkXG4gICAgc3dpdGNoIGpvdXJuYWxFbnRyeS50eXBlXG4gICAgICB3aGVuICdjcmVhdGUnXG4gICAgICAgIGlmIGpvdXJuYWxFbnRyeS5pdGVtLnRpdGxlP1xuICAgICAgICAgIHJldlRpdGxlID0gam91cm5hbEVudHJ5Lml0ZW0udGl0bGVcbiAgICAgICAgICByZXZTdG9yeSA9IGpvdXJuYWxFbnRyeS5pdGVtLnN0b3J5IHx8IFtdXG4gICAgICB3aGVuICdhZGQnXG4gICAgICAgIGlmIChhZnRlckluZGV4ID0gcmV2U3RvcnlJZHMuaW5kZXhPZiBqb3VybmFsRW50cnkuYWZ0ZXIpICE9IC0xXG4gICAgICAgICAgcmV2U3Rvcnkuc3BsaWNlKGFmdGVySW5kZXgrMSwwLGpvdXJuYWxFbnRyeS5pdGVtKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgcmV2U3RvcnkucHVzaCBqb3VybmFsRW50cnkuaXRlbVxuICAgICAgd2hlbiAnZWRpdCdcbiAgICAgICAgaWYgKGVkaXRJbmRleCA9IHJldlN0b3J5SWRzLmluZGV4T2Ygam91cm5hbEVudHJ5LmlkKSAhPSAtMVxuICAgICAgICAgIHJldlN0b3J5LnNwbGljZShlZGl0SW5kZXgsMSxqb3VybmFsRW50cnkuaXRlbSlcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHJldlN0b3J5LnB1c2ggam91cm5hbEVudHJ5Lml0ZW1cbiAgICAgIHdoZW4gJ21vdmUnXG4gICAgICAgIGl0ZW1zID0ge31cbiAgICAgICAgZm9yIHN0b3J5SXRlbSBpbiByZXZTdG9yeVxuICAgICAgICAgIGl0ZW1zW3N0b3J5SXRlbS5pZF0gPSBzdG9yeUl0ZW1cbiAgICAgICAgcmV2U3RvcnkgPSBbXVxuICAgICAgICBmb3IgaXRlbUlkIGluIGpvdXJuYWxFbnRyeS5vcmRlclxuICAgICAgICAgIHJldlN0b3J5LnB1c2goaXRlbXNbaXRlbUlkXSkgaWYgaXRlbXNbaXRlbUlkXT9cbiAgICAgIHdoZW4gJ3JlbW92ZSdcbiAgICAgICAgaWYgKHJlbW92ZUluZGV4ID0gcmV2U3RvcnlJZHMuaW5kZXhPZiBqb3VybmFsRW50cnkuaWQpICE9IC0xXG4gICAgICAgICAgcmV2U3Rvcnkuc3BsaWNlKHJlbW92ZUluZGV4LDEpXG4gICAgICAjd2hlbiAnZm9yaycgICAjIGRvIG5vdGhpbmcgd2hlbiBmb3JrXG4gIHJldHVybiB7c3Rvcnk6IHJldlN0b3J5LCBqb3VybmFsOiByZXZKb3VybmFsLCB0aXRsZTogcmV2VGl0bGV9XG5cbmV4cG9ydHMuY3JlYXRlID0gY3JlYXRlIiwid2lraSA9IHJlcXVpcmUgJy4vd2lraS5jb2ZmZWUnXG51dGlsID0gcmVxdWlyZSAnLi91dGlsLmNvZmZlZSdcbmFjdGl2ZSA9IHJlcXVpcmUgJy4vYWN0aXZlLmNvZmZlZSdcblxuY3JlYXRlU2VhcmNoID0gKHtuZWlnaGJvcmhvb2R9KS0+XG4gIHBlcmZvcm1TZWFyY2ggPSAoc2VhcmNoUXVlcnkpLT5cbiAgICBzZWFyY2hSZXN1bHRzID0gbmVpZ2hib3Job29kLnNlYXJjaChzZWFyY2hRdWVyeSlcbiAgICB0YWxseSA9IHNlYXJjaFJlc3VsdHMudGFsbHlcblxuXG4gICAgZXhwbGFuYXRvcnlQYXJhID0ge1xuICAgICAgdHlwZTogJ3BhcmFncmFwaCdcbiAgICAgIGlkOiB1dGlsLnJhbmRvbUJ5dGVzKDgpXG4gICAgICB0ZXh0OiBcIlwiXCJcbiAgICAgICAgU3RyaW5nICcje3NlYXJjaFF1ZXJ5fScgZm91bmQgb24gI3t0YWxseS5maW5kc3x8J25vbmUnfSBvZiAje3RhbGx5LnBhZ2VzfHwnbm8nfSBwYWdlcyBmcm9tICN7dGFsbHkuc2l0ZXN8fCdubyd9IHNpdGVzLlxuICAgICAgICBUZXh0IG1hdGNoZWQgb24gI3t0YWxseS50aXRsZXx8J25vJ30gdGl0bGVzLCAje3RhbGx5LnRleHR8fCdubyd9IHBhcmFncmFwaHMsIGFuZCAje3RhbGx5LnNsdWd8fCdubyd9IHNsdWdzLlxuICAgICAgICBFbGFwc2VkIHRpbWUgI3t0YWxseS5tc2VjfSBtaWxsaXNlY29uZHMuXG4gICAgICBcIlwiXCJcbiAgICB9XG4gICAgc2VhcmNoUmVzdWx0UmVmZXJlbmNlcyA9IGZvciByZXN1bHQgaW4gc2VhcmNoUmVzdWx0cy5maW5kc1xuICAgICAge1xuICAgICAgICBcInR5cGVcIjogXCJyZWZlcmVuY2VcIlxuICAgICAgICBcImlkXCI6IHV0aWwucmFuZG9tQnl0ZXMoOClcbiAgICAgICAgXCJzaXRlXCI6IHJlc3VsdC5zaXRlXG4gICAgICAgIFwic2x1Z1wiOiByZXN1bHQucGFnZS5zbHVnXG4gICAgICAgIFwidGl0bGVcIjogcmVzdWx0LnBhZ2UudGl0bGVcbiAgICAgICAgXCJ0ZXh0XCI6IHJlc3VsdC5wYWdlLnN5bm9wc2lzIHx8ICcnXG4gICAgICB9XG4gICAgc2VhcmNoUmVzdWx0UGFnZURhdGEgPSB7XG4gICAgICB0aXRsZTogXCJTZWFyY2ggUmVzdWx0c1wiXG4gICAgICBzdG9yeTogW2V4cGxhbmF0b3J5UGFyYV0uY29uY2F0KHNlYXJjaFJlc3VsdFJlZmVyZW5jZXMpXG4gICAgfVxuICAgICRzZWFyY2hSZXN1bHRQYWdlID0gd2lraS5jcmVhdGVQYWdlKCdzZWFyY2gtcmVzdWx0cycpLmFkZENsYXNzKCdnaG9zdCcpXG4gICAgJHNlYXJjaFJlc3VsdFBhZ2UuYXBwZW5kVG8oJCgnLm1haW4nKSlcbiAgICB3aWtpLmJ1aWxkUGFnZSggc2VhcmNoUmVzdWx0UGFnZURhdGEsIG51bGwsICRzZWFyY2hSZXN1bHRQYWdlIClcbiAgICBhY3RpdmUuc2V0KCQoJy5wYWdlJykubGFzdCgpKVxuXG5cbiAge1xuICAgIHBlcmZvcm1TZWFyY2hcbiAgfVxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVTZWFyY2hcbiIsIndpa2kgPSByZXF1aXJlICcuL3dpa2kuY29mZmVlJ1xuYWN0aXZlID0gcmVxdWlyZSAnLi9hY3RpdmUuY29mZmVlJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IHN0YXRlID0ge31cblxuIyBGVU5DVElPTlMgYW5kIEhBTkRMRVJTIHRvIG1hbmFnZSBsb2NhdGlvbiBiYXIgYW5kIGJhY2sgYnV0dG9uXG5cbnN0YXRlLnBhZ2VzSW5Eb20gPSAtPlxuICAkLm1ha2VBcnJheSAkKFwiLnBhZ2VcIikubWFwIChfLCBlbCkgLT4gZWwuaWRcblxuc3RhdGUudXJsUGFnZXMgPSAtPlxuICAoaSBmb3IgaSBpbiAkKGxvY2F0aW9uKS5hdHRyKCdwYXRobmFtZScpLnNwbGl0KCcvJykgYnkgMilbMS4uXVxuXG5zdGF0ZS5sb2NzSW5Eb20gPSAtPlxuICAkLm1ha2VBcnJheSAkKFwiLnBhZ2VcIikubWFwIChfLCBlbCkgLT5cbiAgICAkKGVsKS5kYXRhKCdzaXRlJykgb3IgJ3ZpZXcnXG5cbnN0YXRlLnVybExvY3MgPSAtPlxuICAoaiBmb3IgaiBpbiAkKGxvY2F0aW9uKS5hdHRyKCdwYXRobmFtZScpLnNwbGl0KCcvJylbMS4uXSBieSAyKVxuXG5zdGF0ZS5zZXRVcmwgPSAtPlxuICBkb2N1bWVudC50aXRsZSA9ICQoJy5wYWdlOmxhc3QnKS5kYXRhKCdkYXRhJyk/LnRpdGxlXG4gIGlmIGhpc3RvcnkgYW5kIGhpc3RvcnkucHVzaFN0YXRlXG4gICAgbG9jcyA9IHN0YXRlLmxvY3NJbkRvbSgpXG4gICAgcGFnZXMgPSBzdGF0ZS5wYWdlc0luRG9tKClcbiAgICB1cmwgPSAoXCIvI3tsb2NzP1tpZHhdIG9yICd2aWV3J30vI3twYWdlfVwiIGZvciBwYWdlLCBpZHggaW4gcGFnZXMpLmpvaW4oJycpXG4gICAgdW5sZXNzIHVybCBpcyAkKGxvY2F0aW9uKS5hdHRyKCdwYXRobmFtZScpXG4gICAgICBoaXN0b3J5LnB1c2hTdGF0ZShudWxsLCBudWxsLCB1cmwpXG5cbnN0YXRlLnNob3cgPSAoZSkgLT5cbiAgb2xkUGFnZXMgPSBzdGF0ZS5wYWdlc0luRG9tKClcbiAgbmV3UGFnZXMgPSBzdGF0ZS51cmxQYWdlcygpXG4gIG9sZExvY3MgPSBzdGF0ZS5sb2NzSW5Eb20oKVxuICBuZXdMb2NzID0gc3RhdGUudXJsTG9jcygpXG5cbiAgcmV0dXJuIGlmICghbG9jYXRpb24ucGF0aG5hbWUgb3IgbG9jYXRpb24ucGF0aG5hbWUgaXMgJy8nKVxuXG4gIHByZXZpb3VzID0gJCgnLnBhZ2UnKS5lcSgwKVxuXG4gIGZvciBuYW1lLCBpZHggaW4gbmV3UGFnZXNcbiAgICB1bmxlc3MgbmFtZSBpcyBvbGRQYWdlc1tpZHhdXG4gICAgICBvbGQgPSAkKCcucGFnZScpLmVxKGlkeClcbiAgICAgIG9sZC5yZW1vdmUoKSBpZiBvbGRcbiAgICAgIHdpa2kuY3JlYXRlUGFnZShuYW1lLCBuZXdMb2NzW2lkeF0pLmluc2VydEFmdGVyKHByZXZpb3VzKS5lYWNoIHdpa2kucmVmcmVzaFxuICAgIHByZXZpb3VzID0gJCgnLnBhZ2UnKS5lcShpZHgpXG5cbiAgcHJldmlvdXMubmV4dEFsbCgpLnJlbW92ZSgpXG5cbiAgYWN0aXZlLnNldCgkKCcucGFnZScpLmxhc3QoKSlcbiAgZG9jdW1lbnQudGl0bGUgPSAkKCcucGFnZTpsYXN0JykuZGF0YSgnZGF0YScpPy50aXRsZVxuXG5zdGF0ZS5maXJzdCA9IC0+XG4gIHN0YXRlLnNldFVybCgpXG4gIGZpcnN0VXJsUGFnZXMgPSBzdGF0ZS51cmxQYWdlcygpXG4gIGZpcnN0VXJsTG9jcyA9IHN0YXRlLnVybExvY3MoKVxuICBvbGRQYWdlcyA9IHN0YXRlLnBhZ2VzSW5Eb20oKVxuICBmb3IgdXJsUGFnZSwgaWR4IGluIGZpcnN0VXJsUGFnZXMgd2hlbiB1cmxQYWdlIG5vdCBpbiBvbGRQYWdlc1xuICAgIHdpa2kuY3JlYXRlUGFnZSh1cmxQYWdlLCBmaXJzdFVybExvY3NbaWR4XSkuYXBwZW5kVG8oJy5tYWluJykgdW5sZXNzIHVybFBhZ2UgaXMgJydcblxuIiwibW9kdWxlLmV4cG9ydHMgPSAocGFnZSkgLT5cbiAgc3lub3BzaXMgPSBwYWdlLnN5bm9wc2lzXG4gIGlmIHBhZ2U/ICYmIHBhZ2Uuc3Rvcnk/XG4gICAgcDEgPSBwYWdlLnN0b3J5WzBdXG4gICAgcDIgPSBwYWdlLnN0b3J5WzFdXG4gICAgc3lub3BzaXMgfHw9IHAxLnRleHQgaWYgcDEgJiYgcDEudHlwZSA9PSAncGFyYWdyYXBoJ1xuICAgIHN5bm9wc2lzIHx8PSBwMi50ZXh0IGlmIHAyICYmIHAyLnR5cGUgPT0gJ3BhcmFncmFwaCdcbiAgICBzeW5vcHNpcyB8fD0gcDEudGV4dCBpZiBwMSAmJiBwMS50ZXh0P1xuICAgIHN5bm9wc2lzIHx8PSBwMi50ZXh0IGlmIHAyICYmIHAyLnRleHQ/XG4gICAgc3lub3BzaXMgfHw9IHBhZ2Uuc3Rvcnk/ICYmIFwiQSBwYWdlIHdpdGggI3twYWdlLnN0b3J5Lmxlbmd0aH0gaXRlbXMuXCJcbiAgZWxzZVxuICAgIHN5bm9wc2lzID0gJ0EgcGFnZSB3aXRoIG5vIHN0b3J5LidcbiAgcmV0dXJuIHN5bm9wc2lzXG5cbiIsIndpa2kgPSByZXF1aXJlICcuL3dpa2kuY29mZmVlJ1xubW9kdWxlLmV4cG9ydHMgPSB3aWtpLnV0aWwgPSB1dGlsID0ge31cblxudXRpbC5zeW1ib2xzID1cbiAgY3JlYXRlOiAn4pi8J1xuICBhZGQ6ICcrJ1xuICBlZGl0OiAn4pyOJ1xuICBmb3JrOiAn4pqRJ1xuICBtb3ZlOiAn4oaVJ1xuICByZW1vdmU6ICfinJUnXG5cbnV0aWwucmFuZG9tQnl0ZSA9IC0+XG4gICgoKDErTWF0aC5yYW5kb20oKSkqMHgxMDApfDApLnRvU3RyaW5nKDE2KS5zdWJzdHJpbmcoMSlcblxudXRpbC5yYW5kb21CeXRlcyA9IChuKSAtPlxuICAodXRpbC5yYW5kb21CeXRlKCkgZm9yIFsxLi5uXSkuam9pbignJylcblxuIyBmb3IgY2hhcnQgcGx1Zy1pblxudXRpbC5mb3JtYXRUaW1lID0gKHRpbWUpIC0+XG4gIGQgPSBuZXcgRGF0ZSAoaWYgdGltZSA+IDEwMDAwMDAwMDAwIHRoZW4gdGltZSBlbHNlIHRpbWUqMTAwMClcbiAgbW8gPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJywgJ09jdCcsICdOb3YnLCAnRGVjJ11bZC5nZXRNb250aCgpXVxuICBoID0gZC5nZXRIb3VycygpXG4gIGFtID0gaWYgaCA8IDEyIHRoZW4gJ0FNJyBlbHNlICdQTSdcbiAgaCA9IGlmIGggPT0gMCB0aGVuIDEyIGVsc2UgaWYgaCA+IDEyIHRoZW4gaCAtIDEyIGVsc2UgaFxuICBtaSA9IChpZiBkLmdldE1pbnV0ZXMoKSA8IDEwIHRoZW4gXCIwXCIgZWxzZSBcIlwiKSArIGQuZ2V0TWludXRlcygpXG4gIFwiI3tofToje21pfSAje2FtfTxicj4je2QuZ2V0RGF0ZSgpfSAje21vfSAje2QuZ2V0RnVsbFllYXIoKX1cIlxuXG4jIGZvciBqb3VybmFsIG1vdXNlLW92ZXJzIGFuZCBwb3NzaWJseSBmb3IgZGF0ZSBoZWFkZXJcbnV0aWwuZm9ybWF0RGF0ZSA9IChtc1NpbmNlRXBvY2gpIC0+XG4gIGQgPSBuZXcgRGF0ZShtc1NpbmNlRXBvY2gpXG4gIHdrID0gWydTdW4nLCAnTW9uJywgJ1R1ZScsICdXZWQnLCAnVGh1JywgJ0ZyaScsICdTYXQnXVtkLmdldERheSgpXVxuICBtbyA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLCAnT2N0JywgJ05vdicsICdEZWMnXVtkLmdldE1vbnRoKCldXG4gIGRheSA9IGQuZ2V0RGF0ZSgpO1xuICB5ciA9IGQuZ2V0RnVsbFllYXIoKTtcbiAgaCA9IGQuZ2V0SG91cnMoKVxuICBhbSA9IGlmIGggPCAxMiB0aGVuICdBTScgZWxzZSAnUE0nXG4gIGggPSBpZiBoID09IDAgdGhlbiAxMiBlbHNlIGlmIGggPiAxMiB0aGVuIGggLSAxMiBlbHNlIGhcbiAgbWkgPSAoaWYgZC5nZXRNaW51dGVzKCkgPCAxMCB0aGVuIFwiMFwiIGVsc2UgXCJcIikgKyBkLmdldE1pbnV0ZXMoKVxuICBzZWMgPSAoaWYgZC5nZXRTZWNvbmRzKCkgPCAxMCB0aGVuIFwiMFwiIGVsc2UgXCJcIikgKyBkLmdldFNlY29uZHMoKVxuICBcIiN7d2t9ICN7bW99ICN7ZGF5fSwgI3t5cn08YnI+I3tofToje21pfToje3NlY30gI3thbX1cIlxuXG51dGlsLmZvcm1hdEVsYXBzZWRUaW1lID0gKG1zU2luY2VFcG9jaCkgLT5cbiAgbXNlY3MgPSAobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBtc1NpbmNlRXBvY2gpXG4gIHJldHVybiBcIiN7TWF0aC5mbG9vciBtc2Vjc30gbWlsbGlzZWNvbmRzIGFnb1wiIGlmIChzZWNzID0gbXNlY3MvMTAwMCkgPCAyXG4gIHJldHVybiBcIiN7TWF0aC5mbG9vciBzZWNzfSBzZWNvbmRzIGFnb1wiIGlmIChtaW5zID0gc2Vjcy82MCkgPCAyXG4gIHJldHVybiBcIiN7TWF0aC5mbG9vciBtaW5zfSBtaW51dGVzIGFnb1wiIGlmIChocnMgPSBtaW5zLzYwKSA8IDJcbiAgcmV0dXJuIFwiI3tNYXRoLmZsb29yIGhyc30gaG91cnMgYWdvXCIgaWYgKGRheXMgPSBocnMvMjQpIDwgMlxuICByZXR1cm4gXCIje01hdGguZmxvb3IgZGF5c30gZGF5cyBhZ29cIiBpZiAod2Vla3MgPSBkYXlzLzcpIDwgMlxuICByZXR1cm4gXCIje01hdGguZmxvb3Igd2Vla3N9IHdlZWtzIGFnb1wiIGlmIChtb250aHMgPSBkYXlzLzMxKSA8IDJcbiAgcmV0dXJuIFwiI3tNYXRoLmZsb29yIG1vbnRoc30gbW9udGhzIGFnb1wiIGlmICh5ZWFycyA9IGRheXMvMzY1KSA8IDJcbiAgcmV0dXJuIFwiI3tNYXRoLmZsb29yIHllYXJzfSB5ZWFycyBhZ29cIlxuXG4jIERFRkFVTFRTIGZvciByZXF1aXJlZCBmaWVsZHNcblxudXRpbC5lbXB0eVBhZ2UgPSAoKSAtPlxuICB0aXRsZTogJ2VtcHR5J1xuICBzdG9yeTogW11cbiAgam91cm5hbDogW11cblxuXG4jIElmIHRoZSBzZWxlY3Rpb24gc3RhcnQgYW5kIHNlbGVjdGlvbiBlbmQgYXJlIGJvdGggdGhlIHNhbWUsXG4jIHRoZW4geW91IGhhdmUgdGhlIGNhcmV0IHBvc2l0aW9uLiBJZiB0aGVyZSBpcyBzZWxlY3RlZCB0ZXh0LCBcbiMgdGhlIGJyb3dzZXIgd2lsbCBub3QgdGVsbCB5b3Ugd2hlcmUgdGhlIGNhcmV0IGlzLCBidXQgaXQgd2lsbCBcbiMgZWl0aGVyIGJlIGF0IHRoZSBiZWdpbm5pbmcgb3IgdGhlIGVuZCBvZiB0aGUgc2VsZWN0aW9uIFxuIyhkZXBlbmRpbmcgb24gdGhlIGRpcmVjdGlvbiBvZiB0aGUgc2VsZWN0aW9uKS5cbnV0aWwuZ2V0U2VsZWN0aW9uUG9zID0gKGpRdWVyeUVsZW1lbnQpIC0+IFxuICBlbCA9IGpRdWVyeUVsZW1lbnQuZ2V0KDApICMgZ2V0cyBET00gTm9kZSBmcm9tIGZyb20galF1ZXJ5IHdyYXBwZXJcbiAgaWYgZG9jdW1lbnQuc2VsZWN0aW9uICMgSUVcbiAgICBlbC5mb2N1cygpXG4gICAgc2VsID0gZG9jdW1lbnQuc2VsZWN0aW9uLmNyZWF0ZVJhbmdlKClcbiAgICBzZWwubW92ZVN0YXJ0ICdjaGFyYWN0ZXInLCAtZWwudmFsdWUubGVuZ3RoXG4gICAgaWVQb3MgPSBzZWwudGV4dC5sZW5ndGhcbiAgICB7c3RhcnQ6IGllUG9zLCBlbmQ6IGllUG9zfVxuICBlbHNlXG4gICAge3N0YXJ0OiBlbC5zZWxlY3Rpb25TdGFydCwgZW5kOiBlbC5zZWxlY3Rpb25FbmR9XG5cbnV0aWwuc2V0Q2FyZXRQb3NpdGlvbiA9IChqUXVlcnlFbGVtZW50LCBjYXJldFBvcykgLT5cbiAgZWwgPSBqUXVlcnlFbGVtZW50LmdldCgwKVxuICBpZiBlbD9cbiAgICBpZiBlbC5jcmVhdGVUZXh0UmFuZ2UgIyBJRVxuICAgICAgcmFuZ2UgPSBlbC5jcmVhdGVUZXh0UmFuZ2UoKVxuICAgICAgcmFuZ2UubW92ZSBcImNoYXJhY3RlclwiLCBjYXJldFBvc1xuICAgICAgcmFuZ2Uuc2VsZWN0KClcbiAgICBlbHNlICMgcmVzdCBvZiB0aGUgd29ybGRcbiAgICAgIGVsLnNldFNlbGVjdGlvblJhbmdlIGNhcmV0UG9zLCBjYXJldFBvc1xuICAgIGVsLmZvY3VzKClcblxuIiwiY3JlYXRlU3lub3BzaXMgPSByZXF1aXJlICcuL3N5bm9wc2lzLmNvZmZlZSdcblxud2lraSA9IHsgY3JlYXRlU3lub3BzaXMgfVxuXG53aWtpLmxvZyA9ICh0aGluZ3MuLi4pIC0+XG4gIGNvbnNvbGUubG9nIHRoaW5ncy4uLiBpZiBjb25zb2xlPy5sb2c/XG5cbndpa2kuYXNTbHVnID0gKG5hbWUpIC0+XG4gIG5hbWUucmVwbGFjZSgvXFxzL2csICctJykucmVwbGFjZSgvW15BLVphLXowLTktXS9nLCAnJykudG9Mb3dlckNhc2UoKVxuXG5cbndpa2kudXNlTG9jYWxTdG9yYWdlID0gLT5cbiAgJChcIi5sb2dpblwiKS5sZW5ndGggPiAwXG4gIFxud2lraS51cmxUb1ByZWZpeCA9ICh1cmwpIC0+XG4gIHByZWZpeCA9ICcnXG4gIGhvc3RDb21wb25lbnRzID0gdXJsLnNwbGl0KCcuJylcbiAgZm9yIGNvbXBvbmVudCBpbiBob3N0Q29tcG9uZW50c1xuICAgIGlmIGNvbXBvbmVudCAhPSAnd3d3J1xuICAgICAgaWYgY29tcG9uZW50ICE9ICdodHRwOi8vd3d3J1xuICAgICAgICBpZiBjb21wb25lbnQgIT0gJ2h0dHA6Ly8nXG4gICAgICAgICAgcHJlZml4ID0gXCIvI3tjb21wb25lbnR9XCIgKyBwcmVmaXhcbiAgcmV0dXJuIHByZWZpeFxuXG53aWtpLnJlc29sdXRpb25Db250ZXh0ID0gW11cblxud2lraS5yZXNvbHZlRnJvbSA9IChhZGRpdGlvbiwgY2FsbGJhY2spIC0+XG4gIHdpa2kucmVzb2x1dGlvbkNvbnRleHQucHVzaCBhZGRpdGlvblxuICB0cnlcbiAgICBjYWxsYmFjaygpXG4gIGZpbmFsbHlcbiAgICB3aWtpLnJlc29sdXRpb25Db250ZXh0LnBvcCgpXG5cbndpa2kuZ2V0RGF0YSA9ICh2aXMpIC0+XG4gIGlmIHZpc1xuICAgIGlkeCA9ICQoJy5pdGVtJykuaW5kZXgodmlzKVxuICAgIHdobyA9ICQoXCIuaXRlbTpsdCgje2lkeH0pXCIpLmZpbHRlcignLmNoYXJ0LC5kYXRhLC5jYWxjdWxhdG9yJykubGFzdCgpXG4gICAgaWYgd2hvPyB0aGVuIHdoby5kYXRhKCdpdGVtJykuZGF0YSBlbHNlIHt9XG4gIGVsc2VcbiAgICB3aG8gPSAkKCcuY2hhcnQsLmRhdGEsLmNhbGN1bGF0b3InKS5sYXN0KClcbiAgICBpZiB3aG8/IHRoZW4gd2hvLmRhdGEoJ2l0ZW0nKS5kYXRhIGVsc2Uge31cblxud2lraS5nZXREYXRhTm9kZXMgPSAodmlzKSAtPlxuICBpZiB2aXNcbiAgICBpZHggPSAkKCcuaXRlbScpLmluZGV4KHZpcylcbiAgICB3aG8gPSAkKFwiLml0ZW06bHQoI3tpZHh9KVwiKS5maWx0ZXIoJy5jaGFydCwuZGF0YSwuY2FsY3VsYXRvcicpLnRvQXJyYXkoKS5yZXZlcnNlKClcbiAgICAkKHdobylcbiAgZWxzZVxuICAgIHdobyA9ICQoJy5jaGFydCwuZGF0YSwuY2FsY3VsYXRvcicpLnRvQXJyYXkoKS5yZXZlcnNlKClcbiAgICAkKHdobylcblxud2lraS5jcmVhdGVQYWdlID0gKG5hbWUsIGxvYywgdmVyc2lvbikgLT5cbiAgc2l0ZSA9IGxvYyBpZiBsb2MgYW5kIGxvYyBpc250ICd2aWV3J1xuICBjb25zb2xlLmxvZyB2ZXJzaW9uXG4gICRwYWdlID0gJCBcIlwiXCJcbiAgICA8ZGl2IGNsYXNzPVwicGFnZVwiIGlkPVwiI3tuYW1lfVwiPlxuICAgICAgPGRpdiBjbGFzcz1cInR3aW5zXCI+IDxwPiA8L3A+IDwvZGl2PlxuICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPlxuICAgICAgICA8aDE+IDxpbWcgY2xhc3M9XCJmYXZpY29uXCIgc3JjPVwiI3sgaWYgc2l0ZSB0aGVuIFwiLy8je3NpdGV9XCIgZWxzZSBcIlwiIH0vZmF2aWNvbi5wbmdcIiBoZWlnaHQ9XCIzMnB4XCI+ICN7bmFtZX0gPC9oMT5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICBcIlwiXCJcbiAgJHBhZ2UuZGF0YSgndmVyc2lvbicsIHZlcnNpb24pIGlmIHZlcnNpb25cbiAgJHBhZ2UuZmluZCgnLnBhZ2UnKS5hdHRyKCdkYXRhLXNpdGUnLCBzaXRlKSBpZiBzaXRlXG4gIGNvbnNvbGUubG9nICRwYWdlLmZpbmQoJy5wYWdlJykuZGF0YSgndmVyc2lvbicpXG4gICRwYWdlXG5cbndpa2kuZ2V0SXRlbSA9IChlbGVtZW50KSAtPlxuICAkKGVsZW1lbnQpLmRhdGEoXCJpdGVtXCIpIG9yICQoZWxlbWVudCkuZGF0YSgnc3RhdGljSXRlbScpIGlmICQoZWxlbWVudCkubGVuZ3RoID4gMFxuXG53aWtpLnJlc29sdmVMaW5rcyA9IChzdHJpbmcpIC0+XG4gIHJlbmRlckludGVybmFsTGluayA9IChtYXRjaCwgbmFtZSkgLT5cbiAgICAjIHNwYWNlcyBiZWNvbWUgJ3NsdWdzJywgbm9uLWFscGhhLW51bSBnZXQgcmVtb3ZlZFxuICAgIHNsdWcgPSB3aWtpLmFzU2x1ZyBuYW1lXG4gICAgaWYgbmF2aWdhdG9yLm9uTGluZSA9PSB0cnVlXG4gICAgICBjb25zb2xlLmxvZyBcIm9ubGluZTogcmV0cmlldmluZyBwYWdlcyBmcm9tIHJlbmRlcmVkIGxpbmtzXCJcbiAgICAgIGlmIGludGVyZmFjZXMgIT0gJ3NlcnZlcidcbiAgICAgICAgZm9yIGZhY2UgaW4gaW50ZXJmYWNlcy5hY3RpdmVcbiAgICAgICAgICBwYWdlVVJJID0gZmFjZS5wcmVmaXhVUkkgKyAnL3BhZ2UvJyArIHNsdWcgKyAnLmpzb24nXG4gICAgICAgICAgY2NuTmFtZSA9IG5ldyBOYW1lKHBhZ2VVUkkpXG4gICAgICAgICAgaW50ZXJlc3QgPSBuZXcgSW50ZXJlc3QoY2NuTmFtZSlcbiAgICAgICAgICBpbnRlcmVzdC5jaGlsZFNlbGVjdG9yID0gMVxuICAgICAgICAgIHRlbXBsYXRlID0ge31cbiAgICAgICAgICB0ZW1wbGF0ZS5jaGlsZFNlbGVjdG9yID0gaW50ZXJlc3QuY2hpbGRTZWxlY3RvclxuICAgICAgICAgIGNsb3N1cmUgPSBuZXcgQ29udGVudENsb3N1cmUoZmFjZSwgY2NuTmFtZSwgaW50ZXJlc3QsIHdpa2kucmVwby51cGRhdGVQYWdlKVxuICAgICAgICAgIGlmIGZhY2UudHJhbnNwb3J0LndzICE9IG51bGxcbiAgICAgICAgICAgIGZhY2UuZXhwcmVzc0ludGVyZXN0KGNjbk5hbWUsIGNsb3N1cmUsIHRlbXBsYXRlKSAgICBcbiAgICBcIjxhIGNsYXNzPVxcXCJpbnRlcm5hbFxcXCIgaHJlZj1cXFwiLyN7c2x1Z30uaHRtbFxcXCIgZGF0YS1wYWdlLW5hbWU9XFxcIiN7c2x1Z31cXFwiIHRpdGxlPVxcXCIje3dpa2kucmVzb2x1dGlvbkNvbnRleHQuam9pbignID0+ICcpfVxcXCI+I3tuYW1lfTwvYT5cIlxuICBzdHJpbmdcbiAgICAucmVwbGFjZSgvXFxbXFxbKFteXFxdXSspXFxdXFxdL2dpLCByZW5kZXJJbnRlcm5hbExpbmspXG4gICAgLnJlcGxhY2UoL1xcWyhodHRwLio/KSAoLio/KVxcXS9naSwgXCJcIlwiPGEgY2xhc3M9XCJleHRlcm5hbFwiIHRhcmdldD1cIl9ibGFua1wiIGhyZWY9XCIkMVwiIHRpdGxlPVwiJDFcIiByZWw9XCJub2ZvbGxvd1wiPiQyIDxpbWcgc3JjPVwiL2ltYWdlcy9leHRlcm5hbC1saW5rLWx0ci1pY29uLnBuZ1wiPjwvYT5cIlwiXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gd2lraVxuXG4iLCIvLyAgICAgVW5kZXJzY29yZS5qcyAxLjUuMVxuLy8gICAgIGh0dHA6Ly91bmRlcnNjb3JlanMub3JnXG4vLyAgICAgKGMpIDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuLy8gICAgIFVuZGVyc2NvcmUgbWF5IGJlIGZyZWVseSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG5cbihmdW5jdGlvbigpIHtcblxuICAvLyBCYXNlbGluZSBzZXR1cFxuICAvLyAtLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEVzdGFibGlzaCB0aGUgcm9vdCBvYmplY3QsIGB3aW5kb3dgIGluIHRoZSBicm93c2VyLCBvciBgZ2xvYmFsYCBvbiB0aGUgc2VydmVyLlxuICB2YXIgcm9vdCA9IHRoaXM7XG5cbiAgLy8gU2F2ZSB0aGUgcHJldmlvdXMgdmFsdWUgb2YgdGhlIGBfYCB2YXJpYWJsZS5cbiAgdmFyIHByZXZpb3VzVW5kZXJzY29yZSA9IHJvb3QuXztcblxuICAvLyBFc3RhYmxpc2ggdGhlIG9iamVjdCB0aGF0IGdldHMgcmV0dXJuZWQgdG8gYnJlYWsgb3V0IG9mIGEgbG9vcCBpdGVyYXRpb24uXG4gIHZhciBicmVha2VyID0ge307XG5cbiAgLy8gU2F2ZSBieXRlcyBpbiB0aGUgbWluaWZpZWQgKGJ1dCBub3QgZ3ppcHBlZCkgdmVyc2lvbjpcbiAgdmFyIEFycmF5UHJvdG8gPSBBcnJheS5wcm90b3R5cGUsIE9ialByb3RvID0gT2JqZWN0LnByb3RvdHlwZSwgRnVuY1Byb3RvID0gRnVuY3Rpb24ucHJvdG90eXBlO1xuXG4gIC8vIENyZWF0ZSBxdWljayByZWZlcmVuY2UgdmFyaWFibGVzIGZvciBzcGVlZCBhY2Nlc3MgdG8gY29yZSBwcm90b3R5cGVzLlxuICB2YXJcbiAgICBwdXNoICAgICAgICAgICAgID0gQXJyYXlQcm90by5wdXNoLFxuICAgIHNsaWNlICAgICAgICAgICAgPSBBcnJheVByb3RvLnNsaWNlLFxuICAgIGNvbmNhdCAgICAgICAgICAgPSBBcnJheVByb3RvLmNvbmNhdCxcbiAgICB0b1N0cmluZyAgICAgICAgID0gT2JqUHJvdG8udG9TdHJpbmcsXG4gICAgaGFzT3duUHJvcGVydHkgICA9IE9ialByb3RvLmhhc093blByb3BlcnR5O1xuXG4gIC8vIEFsbCAqKkVDTUFTY3JpcHQgNSoqIG5hdGl2ZSBmdW5jdGlvbiBpbXBsZW1lbnRhdGlvbnMgdGhhdCB3ZSBob3BlIHRvIHVzZVxuICAvLyBhcmUgZGVjbGFyZWQgaGVyZS5cbiAgdmFyXG4gICAgbmF0aXZlRm9yRWFjaCAgICAgID0gQXJyYXlQcm90by5mb3JFYWNoLFxuICAgIG5hdGl2ZU1hcCAgICAgICAgICA9IEFycmF5UHJvdG8ubWFwLFxuICAgIG5hdGl2ZVJlZHVjZSAgICAgICA9IEFycmF5UHJvdG8ucmVkdWNlLFxuICAgIG5hdGl2ZVJlZHVjZVJpZ2h0ICA9IEFycmF5UHJvdG8ucmVkdWNlUmlnaHQsXG4gICAgbmF0aXZlRmlsdGVyICAgICAgID0gQXJyYXlQcm90by5maWx0ZXIsXG4gICAgbmF0aXZlRXZlcnkgICAgICAgID0gQXJyYXlQcm90by5ldmVyeSxcbiAgICBuYXRpdmVTb21lICAgICAgICAgPSBBcnJheVByb3RvLnNvbWUsXG4gICAgbmF0aXZlSW5kZXhPZiAgICAgID0gQXJyYXlQcm90by5pbmRleE9mLFxuICAgIG5hdGl2ZUxhc3RJbmRleE9mICA9IEFycmF5UHJvdG8ubGFzdEluZGV4T2YsXG4gICAgbmF0aXZlSXNBcnJheSAgICAgID0gQXJyYXkuaXNBcnJheSxcbiAgICBuYXRpdmVLZXlzICAgICAgICAgPSBPYmplY3Qua2V5cyxcbiAgICBuYXRpdmVCaW5kICAgICAgICAgPSBGdW5jUHJvdG8uYmluZDtcblxuICAvLyBDcmVhdGUgYSBzYWZlIHJlZmVyZW5jZSB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QgZm9yIHVzZSBiZWxvdy5cbiAgdmFyIF8gPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqIGluc3RhbmNlb2YgXykgcmV0dXJuIG9iajtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgXykpIHJldHVybiBuZXcgXyhvYmopO1xuICAgIHRoaXMuX3dyYXBwZWQgPSBvYmo7XG4gIH07XG5cbiAgLy8gRXhwb3J0IHRoZSBVbmRlcnNjb3JlIG9iamVjdCBmb3IgKipOb2RlLmpzKiosIHdpdGhcbiAgLy8gYmFja3dhcmRzLWNvbXBhdGliaWxpdHkgZm9yIHRoZSBvbGQgYHJlcXVpcmUoKWAgQVBJLiBJZiB3ZSdyZSBpblxuICAvLyB0aGUgYnJvd3NlciwgYWRkIGBfYCBhcyBhIGdsb2JhbCBvYmplY3QgdmlhIGEgc3RyaW5nIGlkZW50aWZpZXIsXG4gIC8vIGZvciBDbG9zdXJlIENvbXBpbGVyIFwiYWR2YW5jZWRcIiBtb2RlLlxuICBpZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICBleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBfO1xuICAgIH1cbiAgICBleHBvcnRzLl8gPSBfO1xuICB9IGVsc2Uge1xuICAgIHJvb3QuXyA9IF87XG4gIH1cblxuICAvLyBDdXJyZW50IHZlcnNpb24uXG4gIF8uVkVSU0lPTiA9ICcxLjUuMSc7XG5cbiAgLy8gQ29sbGVjdGlvbiBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBUaGUgY29ybmVyc3RvbmUsIGFuIGBlYWNoYCBpbXBsZW1lbnRhdGlvbiwgYWthIGBmb3JFYWNoYC5cbiAgLy8gSGFuZGxlcyBvYmplY3RzIHdpdGggdGhlIGJ1aWx0LWluIGBmb3JFYWNoYCwgYXJyYXlzLCBhbmQgcmF3IG9iamVjdHMuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBmb3JFYWNoYCBpZiBhdmFpbGFibGUuXG4gIHZhciBlYWNoID0gXy5lYWNoID0gXy5mb3JFYWNoID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuO1xuICAgIGlmIChuYXRpdmVGb3JFYWNoICYmIG9iai5mb3JFYWNoID09PSBuYXRpdmVGb3JFYWNoKSB7XG4gICAgICBvYmouZm9yRWFjaChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmIChvYmoubGVuZ3RoID09PSArb2JqLmxlbmd0aCkge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBvYmoubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGlmIChpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9ialtpXSwgaSwgb2JqKSA9PT0gYnJlYWtlcikgcmV0dXJuO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgIGlmIChfLmhhcyhvYmosIGtleSkpIHtcbiAgICAgICAgICBpZiAoaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmpba2V5XSwga2V5LCBvYmopID09PSBicmVha2VyKSByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSByZXN1bHRzIG9mIGFwcGx5aW5nIHRoZSBpdGVyYXRvciB0byBlYWNoIGVsZW1lbnQuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBtYXBgIGlmIGF2YWlsYWJsZS5cbiAgXy5tYXAgPSBfLmNvbGxlY3QgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHRzO1xuICAgIGlmIChuYXRpdmVNYXAgJiYgb2JqLm1hcCA9PT0gbmF0aXZlTWFwKSByZXR1cm4gb2JqLm1hcChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmVzdWx0cy5wdXNoKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgdmFyIHJlZHVjZUVycm9yID0gJ1JlZHVjZSBvZiBlbXB0eSBhcnJheSB3aXRoIG5vIGluaXRpYWwgdmFsdWUnO1xuXG4gIC8vICoqUmVkdWNlKiogYnVpbGRzIHVwIGEgc2luZ2xlIHJlc3VsdCBmcm9tIGEgbGlzdCBvZiB2YWx1ZXMsIGFrYSBgaW5qZWN0YCxcbiAgLy8gb3IgYGZvbGRsYC4gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYHJlZHVjZWAgaWYgYXZhaWxhYmxlLlxuICBfLnJlZHVjZSA9IF8uZm9sZGwgPSBfLmluamVjdCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIG1lbW8sIGNvbnRleHQpIHtcbiAgICB2YXIgaW5pdGlhbCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyO1xuICAgIGlmIChvYmogPT0gbnVsbCkgb2JqID0gW107XG4gICAgaWYgKG5hdGl2ZVJlZHVjZSAmJiBvYmoucmVkdWNlID09PSBuYXRpdmVSZWR1Y2UpIHtcbiAgICAgIGlmIChjb250ZXh0KSBpdGVyYXRvciA9IF8uYmluZChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgICByZXR1cm4gaW5pdGlhbCA/IG9iai5yZWR1Y2UoaXRlcmF0b3IsIG1lbW8pIDogb2JqLnJlZHVjZShpdGVyYXRvcik7XG4gICAgfVxuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmICghaW5pdGlhbCkge1xuICAgICAgICBtZW1vID0gdmFsdWU7XG4gICAgICAgIGluaXRpYWwgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWVtbyA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgbWVtbywgdmFsdWUsIGluZGV4LCBsaXN0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIWluaXRpYWwpIHRocm93IG5ldyBUeXBlRXJyb3IocmVkdWNlRXJyb3IpO1xuICAgIHJldHVybiBtZW1vO1xuICB9O1xuXG4gIC8vIFRoZSByaWdodC1hc3NvY2lhdGl2ZSB2ZXJzaW9uIG9mIHJlZHVjZSwgYWxzbyBrbm93biBhcyBgZm9sZHJgLlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgcmVkdWNlUmlnaHRgIGlmIGF2YWlsYWJsZS5cbiAgXy5yZWR1Y2VSaWdodCA9IF8uZm9sZHIgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBtZW1vLCBjb250ZXh0KSB7XG4gICAgdmFyIGluaXRpYWwgPSBhcmd1bWVudHMubGVuZ3RoID4gMjtcbiAgICBpZiAob2JqID09IG51bGwpIG9iaiA9IFtdO1xuICAgIGlmIChuYXRpdmVSZWR1Y2VSaWdodCAmJiBvYmoucmVkdWNlUmlnaHQgPT09IG5hdGl2ZVJlZHVjZVJpZ2h0KSB7XG4gICAgICBpZiAoY29udGV4dCkgaXRlcmF0b3IgPSBfLmJpbmQoaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgICAgcmV0dXJuIGluaXRpYWwgPyBvYmoucmVkdWNlUmlnaHQoaXRlcmF0b3IsIG1lbW8pIDogb2JqLnJlZHVjZVJpZ2h0KGl0ZXJhdG9yKTtcbiAgICB9XG4gICAgdmFyIGxlbmd0aCA9IG9iai5sZW5ndGg7XG4gICAgaWYgKGxlbmd0aCAhPT0gK2xlbmd0aCkge1xuICAgICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICAgIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIH1cbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpbmRleCA9IGtleXMgPyBrZXlzWy0tbGVuZ3RoXSA6IC0tbGVuZ3RoO1xuICAgICAgaWYgKCFpbml0aWFsKSB7XG4gICAgICAgIG1lbW8gPSBvYmpbaW5kZXhdO1xuICAgICAgICBpbml0aWFsID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1lbW8gPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIG1lbW8sIG9ialtpbmRleF0sIGluZGV4LCBsaXN0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIWluaXRpYWwpIHRocm93IG5ldyBUeXBlRXJyb3IocmVkdWNlRXJyb3IpO1xuICAgIHJldHVybiBtZW1vO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgZmlyc3QgdmFsdWUgd2hpY2ggcGFzc2VzIGEgdHJ1dGggdGVzdC4gQWxpYXNlZCBhcyBgZGV0ZWN0YC5cbiAgXy5maW5kID0gXy5kZXRlY3QgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdDtcbiAgICBhbnkob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmIChpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpIHtcbiAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGFsbCB0aGUgZWxlbWVudHMgdGhhdCBwYXNzIGEgdHJ1dGggdGVzdC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGZpbHRlcmAgaWYgYXZhaWxhYmxlLlxuICAvLyBBbGlhc2VkIGFzIGBzZWxlY3RgLlxuICBfLmZpbHRlciA9IF8uc2VsZWN0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHRzID0gW107XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0cztcbiAgICBpZiAobmF0aXZlRmlsdGVyICYmIG9iai5maWx0ZXIgPT09IG5hdGl2ZUZpbHRlcikgcmV0dXJuIG9iai5maWx0ZXIoaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmIChpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpIHJlc3VsdHMucHVzaCh2YWx1ZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGFsbCB0aGUgZWxlbWVudHMgZm9yIHdoaWNoIGEgdHJ1dGggdGVzdCBmYWlscy5cbiAgXy5yZWplY3QgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIF8uZmlsdGVyKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICByZXR1cm4gIWl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KTtcbiAgICB9LCBjb250ZXh0KTtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgd2hldGhlciBhbGwgb2YgdGhlIGVsZW1lbnRzIG1hdGNoIGEgdHJ1dGggdGVzdC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGV2ZXJ5YCBpZiBhdmFpbGFibGUuXG4gIC8vIEFsaWFzZWQgYXMgYGFsbGAuXG4gIF8uZXZlcnkgPSBfLmFsbCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRvciB8fCAoaXRlcmF0b3IgPSBfLmlkZW50aXR5KTtcbiAgICB2YXIgcmVzdWx0ID0gdHJ1ZTtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHQ7XG4gICAgaWYgKG5hdGl2ZUV2ZXJ5ICYmIG9iai5ldmVyeSA9PT0gbmF0aXZlRXZlcnkpIHJldHVybiBvYmouZXZlcnkoaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmICghKHJlc3VsdCA9IHJlc3VsdCAmJiBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpKSByZXR1cm4gYnJlYWtlcjtcbiAgICB9KTtcbiAgICByZXR1cm4gISFyZXN1bHQ7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIGlmIGF0IGxlYXN0IG9uZSBlbGVtZW50IGluIHRoZSBvYmplY3QgbWF0Y2hlcyBhIHRydXRoIHRlc3QuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBzb21lYCBpZiBhdmFpbGFibGUuXG4gIC8vIEFsaWFzZWQgYXMgYGFueWAuXG4gIHZhciBhbnkgPSBfLnNvbWUgPSBfLmFueSA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRvciB8fCAoaXRlcmF0b3IgPSBfLmlkZW50aXR5KTtcbiAgICB2YXIgcmVzdWx0ID0gZmFsc2U7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmIChuYXRpdmVTb21lICYmIG9iai5zb21lID09PSBuYXRpdmVTb21lKSByZXR1cm4gb2JqLnNvbWUoaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmIChyZXN1bHQgfHwgKHJlc3VsdCA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkpIHJldHVybiBicmVha2VyO1xuICAgIH0pO1xuICAgIHJldHVybiAhIXJlc3VsdDtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgaWYgdGhlIGFycmF5IG9yIG9iamVjdCBjb250YWlucyBhIGdpdmVuIHZhbHVlICh1c2luZyBgPT09YCkuXG4gIC8vIEFsaWFzZWQgYXMgYGluY2x1ZGVgLlxuICBfLmNvbnRhaW5zID0gXy5pbmNsdWRlID0gZnVuY3Rpb24ob2JqLCB0YXJnZXQpIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiBmYWxzZTtcbiAgICBpZiAobmF0aXZlSW5kZXhPZiAmJiBvYmouaW5kZXhPZiA9PT0gbmF0aXZlSW5kZXhPZikgcmV0dXJuIG9iai5pbmRleE9mKHRhcmdldCkgIT0gLTE7XG4gICAgcmV0dXJuIGFueShvYmosIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWUgPT09IHRhcmdldDtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBJbnZva2UgYSBtZXRob2QgKHdpdGggYXJndW1lbnRzKSBvbiBldmVyeSBpdGVtIGluIGEgY29sbGVjdGlvbi5cbiAgXy5pbnZva2UgPSBmdW5jdGlvbihvYmosIG1ldGhvZCkge1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHZhciBpc0Z1bmMgPSBfLmlzRnVuY3Rpb24obWV0aG9kKTtcbiAgICByZXR1cm4gXy5tYXAob2JqLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIChpc0Z1bmMgPyBtZXRob2QgOiB2YWx1ZVttZXRob2RdKS5hcHBseSh2YWx1ZSwgYXJncyk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgbWFwYDogZmV0Y2hpbmcgYSBwcm9wZXJ0eS5cbiAgXy5wbHVjayA9IGZ1bmN0aW9uKG9iaiwga2V5KSB7XG4gICAgcmV0dXJuIF8ubWFwKG9iaiwgZnVuY3Rpb24odmFsdWUpeyByZXR1cm4gdmFsdWVba2V5XTsgfSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgZmlsdGVyYDogc2VsZWN0aW5nIG9ubHkgb2JqZWN0c1xuICAvLyBjb250YWluaW5nIHNwZWNpZmljIGBrZXk6dmFsdWVgIHBhaXJzLlxuICBfLndoZXJlID0gZnVuY3Rpb24ob2JqLCBhdHRycywgZmlyc3QpIHtcbiAgICBpZiAoXy5pc0VtcHR5KGF0dHJzKSkgcmV0dXJuIGZpcnN0ID8gdm9pZCAwIDogW107XG4gICAgcmV0dXJuIF9bZmlyc3QgPyAnZmluZCcgOiAnZmlsdGVyJ10ob2JqLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgZm9yICh2YXIga2V5IGluIGF0dHJzKSB7XG4gICAgICAgIGlmIChhdHRyc1trZXldICE9PSB2YWx1ZVtrZXldKSByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBmaW5kYDogZ2V0dGluZyB0aGUgZmlyc3Qgb2JqZWN0XG4gIC8vIGNvbnRhaW5pbmcgc3BlY2lmaWMgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8uZmluZFdoZXJlID0gZnVuY3Rpb24ob2JqLCBhdHRycykge1xuICAgIHJldHVybiBfLndoZXJlKG9iaiwgYXR0cnMsIHRydWUpO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbWF4aW11bSBlbGVtZW50IG9yIChlbGVtZW50LWJhc2VkIGNvbXB1dGF0aW9uKS5cbiAgLy8gQ2FuJ3Qgb3B0aW1pemUgYXJyYXlzIG9mIGludGVnZXJzIGxvbmdlciB0aGFuIDY1LDUzNSBlbGVtZW50cy5cbiAgLy8gU2VlIFtXZWJLaXQgQnVnIDgwNzk3XShodHRwczovL2J1Z3Mud2Via2l0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9ODA3OTcpXG4gIF8ubWF4ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGlmICghaXRlcmF0b3IgJiYgXy5pc0FycmF5KG9iaikgJiYgb2JqWzBdID09PSArb2JqWzBdICYmIG9iai5sZW5ndGggPCA2NTUzNSkge1xuICAgICAgcmV0dXJuIE1hdGgubWF4LmFwcGx5KE1hdGgsIG9iaik7XG4gICAgfVxuICAgIGlmICghaXRlcmF0b3IgJiYgXy5pc0VtcHR5KG9iaikpIHJldHVybiAtSW5maW5pdHk7XG4gICAgdmFyIHJlc3VsdCA9IHtjb21wdXRlZCA6IC1JbmZpbml0eSwgdmFsdWU6IC1JbmZpbml0eX07XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgdmFyIGNvbXB1dGVkID0gaXRlcmF0b3IgPyBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkgOiB2YWx1ZTtcbiAgICAgIGNvbXB1dGVkID4gcmVzdWx0LmNvbXB1dGVkICYmIChyZXN1bHQgPSB7dmFsdWUgOiB2YWx1ZSwgY29tcHV0ZWQgOiBjb21wdXRlZH0pO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQudmFsdWU7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBtaW5pbXVtIGVsZW1lbnQgKG9yIGVsZW1lbnQtYmFzZWQgY29tcHV0YXRpb24pLlxuICBfLm1pbiA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAoIWl0ZXJhdG9yICYmIF8uaXNBcnJheShvYmopICYmIG9ialswXSA9PT0gK29ialswXSAmJiBvYmoubGVuZ3RoIDwgNjU1MzUpIHtcbiAgICAgIHJldHVybiBNYXRoLm1pbi5hcHBseShNYXRoLCBvYmopO1xuICAgIH1cbiAgICBpZiAoIWl0ZXJhdG9yICYmIF8uaXNFbXB0eShvYmopKSByZXR1cm4gSW5maW5pdHk7XG4gICAgdmFyIHJlc3VsdCA9IHtjb21wdXRlZCA6IEluZmluaXR5LCB2YWx1ZTogSW5maW5pdHl9O1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHZhciBjb21wdXRlZCA9IGl0ZXJhdG9yID8gaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpIDogdmFsdWU7XG4gICAgICBjb21wdXRlZCA8IHJlc3VsdC5jb21wdXRlZCAmJiAocmVzdWx0ID0ge3ZhbHVlIDogdmFsdWUsIGNvbXB1dGVkIDogY29tcHV0ZWR9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0LnZhbHVlO1xuICB9O1xuXG4gIC8vIFNodWZmbGUgYW4gYXJyYXkuXG4gIF8uc2h1ZmZsZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciByYW5kO1xuICAgIHZhciBpbmRleCA9IDA7XG4gICAgdmFyIHNodWZmbGVkID0gW107XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByYW5kID0gXy5yYW5kb20oaW5kZXgrKyk7XG4gICAgICBzaHVmZmxlZFtpbmRleCAtIDFdID0gc2h1ZmZsZWRbcmFuZF07XG4gICAgICBzaHVmZmxlZFtyYW5kXSA9IHZhbHVlO1xuICAgIH0pO1xuICAgIHJldHVybiBzaHVmZmxlZDtcbiAgfTtcblxuICAvLyBBbiBpbnRlcm5hbCBmdW5jdGlvbiB0byBnZW5lcmF0ZSBsb29rdXAgaXRlcmF0b3JzLlxuICB2YXIgbG9va3VwSXRlcmF0b3IgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiBfLmlzRnVuY3Rpb24odmFsdWUpID8gdmFsdWUgOiBmdW5jdGlvbihvYmopeyByZXR1cm4gb2JqW3ZhbHVlXTsgfTtcbiAgfTtcblxuICAvLyBTb3J0IHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24gcHJvZHVjZWQgYnkgYW4gaXRlcmF0b3IuXG4gIF8uc29ydEJ5ID0gZnVuY3Rpb24ob2JqLCB2YWx1ZSwgY29udGV4dCkge1xuICAgIHZhciBpdGVyYXRvciA9IGxvb2t1cEl0ZXJhdG9yKHZhbHVlKTtcbiAgICByZXR1cm4gXy5wbHVjayhfLm1hcChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdmFsdWUgOiB2YWx1ZSxcbiAgICAgICAgaW5kZXggOiBpbmRleCxcbiAgICAgICAgY3JpdGVyaWEgOiBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdClcbiAgICAgIH07XG4gICAgfSkuc29ydChmdW5jdGlvbihsZWZ0LCByaWdodCkge1xuICAgICAgdmFyIGEgPSBsZWZ0LmNyaXRlcmlhO1xuICAgICAgdmFyIGIgPSByaWdodC5jcml0ZXJpYTtcbiAgICAgIGlmIChhICE9PSBiKSB7XG4gICAgICAgIGlmIChhID4gYiB8fCBhID09PSB2b2lkIDApIHJldHVybiAxO1xuICAgICAgICBpZiAoYSA8IGIgfHwgYiA9PT0gdm9pZCAwKSByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgICByZXR1cm4gbGVmdC5pbmRleCA8IHJpZ2h0LmluZGV4ID8gLTEgOiAxO1xuICAgIH0pLCAndmFsdWUnKTtcbiAgfTtcblxuICAvLyBBbiBpbnRlcm5hbCBmdW5jdGlvbiB1c2VkIGZvciBhZ2dyZWdhdGUgXCJncm91cCBieVwiIG9wZXJhdGlvbnMuXG4gIHZhciBncm91cCA9IGZ1bmN0aW9uKG9iaiwgdmFsdWUsIGNvbnRleHQsIGJlaGF2aW9yKSB7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIHZhciBpdGVyYXRvciA9IGxvb2t1cEl0ZXJhdG9yKHZhbHVlID09IG51bGwgPyBfLmlkZW50aXR5IDogdmFsdWUpO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgIHZhciBrZXkgPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgb2JqKTtcbiAgICAgIGJlaGF2aW9yKHJlc3VsdCwga2V5LCB2YWx1ZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBHcm91cHMgdGhlIG9iamVjdCdzIHZhbHVlcyBieSBhIGNyaXRlcmlvbi4gUGFzcyBlaXRoZXIgYSBzdHJpbmcgYXR0cmlidXRlXG4gIC8vIHRvIGdyb3VwIGJ5LCBvciBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGUgY3JpdGVyaW9uLlxuICBfLmdyb3VwQnkgPSBmdW5jdGlvbihvYmosIHZhbHVlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIGdyb3VwKG9iaiwgdmFsdWUsIGNvbnRleHQsIGZ1bmN0aW9uKHJlc3VsdCwga2V5LCB2YWx1ZSkge1xuICAgICAgKF8uaGFzKHJlc3VsdCwga2V5KSA/IHJlc3VsdFtrZXldIDogKHJlc3VsdFtrZXldID0gW10pKS5wdXNoKHZhbHVlKTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBDb3VudHMgaW5zdGFuY2VzIG9mIGFuIG9iamVjdCB0aGF0IGdyb3VwIGJ5IGEgY2VydGFpbiBjcml0ZXJpb24uIFBhc3NcbiAgLy8gZWl0aGVyIGEgc3RyaW5nIGF0dHJpYnV0ZSB0byBjb3VudCBieSwgb3IgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlXG4gIC8vIGNyaXRlcmlvbi5cbiAgXy5jb3VudEJ5ID0gZnVuY3Rpb24ob2JqLCB2YWx1ZSwgY29udGV4dCkge1xuICAgIHJldHVybiBncm91cChvYmosIHZhbHVlLCBjb250ZXh0LCBmdW5jdGlvbihyZXN1bHQsIGtleSkge1xuICAgICAgaWYgKCFfLmhhcyhyZXN1bHQsIGtleSkpIHJlc3VsdFtrZXldID0gMDtcbiAgICAgIHJlc3VsdFtrZXldKys7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gVXNlIGEgY29tcGFyYXRvciBmdW5jdGlvbiB0byBmaWd1cmUgb3V0IHRoZSBzbWFsbGVzdCBpbmRleCBhdCB3aGljaFxuICAvLyBhbiBvYmplY3Qgc2hvdWxkIGJlIGluc2VydGVkIHNvIGFzIHRvIG1haW50YWluIG9yZGVyLiBVc2VzIGJpbmFyeSBzZWFyY2guXG4gIF8uc29ydGVkSW5kZXggPSBmdW5jdGlvbihhcnJheSwgb2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGl0ZXJhdG9yID0gaXRlcmF0b3IgPT0gbnVsbCA/IF8uaWRlbnRpdHkgOiBsb29rdXBJdGVyYXRvcihpdGVyYXRvcik7XG4gICAgdmFyIHZhbHVlID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmopO1xuICAgIHZhciBsb3cgPSAwLCBoaWdoID0gYXJyYXkubGVuZ3RoO1xuICAgIHdoaWxlIChsb3cgPCBoaWdoKSB7XG4gICAgICB2YXIgbWlkID0gKGxvdyArIGhpZ2gpID4+PiAxO1xuICAgICAgaXRlcmF0b3IuY2FsbChjb250ZXh0LCBhcnJheVttaWRdKSA8IHZhbHVlID8gbG93ID0gbWlkICsgMSA6IGhpZ2ggPSBtaWQ7XG4gICAgfVxuICAgIHJldHVybiBsb3c7XG4gIH07XG5cbiAgLy8gU2FmZWx5IGNyZWF0ZSBhIHJlYWwsIGxpdmUgYXJyYXkgZnJvbSBhbnl0aGluZyBpdGVyYWJsZS5cbiAgXy50b0FycmF5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFvYmopIHJldHVybiBbXTtcbiAgICBpZiAoXy5pc0FycmF5KG9iaikpIHJldHVybiBzbGljZS5jYWxsKG9iaik7XG4gICAgaWYgKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSByZXR1cm4gXy5tYXAob2JqLCBfLmlkZW50aXR5KTtcbiAgICByZXR1cm4gXy52YWx1ZXMob2JqKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG51bWJlciBvZiBlbGVtZW50cyBpbiBhbiBvYmplY3QuXG4gIF8uc2l6ZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIDA7XG4gICAgcmV0dXJuIChvYmoubGVuZ3RoID09PSArb2JqLmxlbmd0aCkgPyBvYmoubGVuZ3RoIDogXy5rZXlzKG9iaikubGVuZ3RoO1xuICB9O1xuXG4gIC8vIEFycmF5IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS1cblxuICAvLyBHZXQgdGhlIGZpcnN0IGVsZW1lbnQgb2YgYW4gYXJyYXkuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gdGhlIGZpcnN0IE5cbiAgLy8gdmFsdWVzIGluIHRoZSBhcnJheS4gQWxpYXNlZCBhcyBgaGVhZGAgYW5kIGB0YWtlYC4gVGhlICoqZ3VhcmQqKiBjaGVja1xuICAvLyBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBfLm1hcGAuXG4gIF8uZmlyc3QgPSBfLmhlYWQgPSBfLnRha2UgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICByZXR1cm4gKG4gIT0gbnVsbCkgJiYgIWd1YXJkID8gc2xpY2UuY2FsbChhcnJheSwgMCwgbikgOiBhcnJheVswXTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGV2ZXJ5dGhpbmcgYnV0IHRoZSBsYXN0IGVudHJ5IG9mIHRoZSBhcnJheS4gRXNwZWNpYWxseSB1c2VmdWwgb25cbiAgLy8gdGhlIGFyZ3VtZW50cyBvYmplY3QuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gYWxsIHRoZSB2YWx1ZXMgaW5cbiAgLy8gdGhlIGFycmF5LCBleGNsdWRpbmcgdGhlIGxhc3QgTi4gVGhlICoqZ3VhcmQqKiBjaGVjayBhbGxvd3MgaXQgdG8gd29yayB3aXRoXG4gIC8vIGBfLm1hcGAuXG4gIF8uaW5pdGlhbCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCAwLCBhcnJheS5sZW5ndGggLSAoKG4gPT0gbnVsbCkgfHwgZ3VhcmQgPyAxIDogbikpO1xuICB9O1xuXG4gIC8vIEdldCB0aGUgbGFzdCBlbGVtZW50IG9mIGFuIGFycmF5LiBQYXNzaW5nICoqbioqIHdpbGwgcmV0dXJuIHRoZSBsYXN0IE5cbiAgLy8gdmFsdWVzIGluIHRoZSBhcnJheS4gVGhlICoqZ3VhcmQqKiBjaGVjayBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBfLm1hcGAuXG4gIF8ubGFzdCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIGlmICgobiAhPSBudWxsKSAmJiAhZ3VhcmQpIHtcbiAgICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCBNYXRoLm1heChhcnJheS5sZW5ndGggLSBuLCAwKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBhcnJheVthcnJheS5sZW5ndGggLSAxXTtcbiAgICB9XG4gIH07XG5cbiAgLy8gUmV0dXJucyBldmVyeXRoaW5nIGJ1dCB0aGUgZmlyc3QgZW50cnkgb2YgdGhlIGFycmF5LiBBbGlhc2VkIGFzIGB0YWlsYCBhbmQgYGRyb3BgLlxuICAvLyBFc3BlY2lhbGx5IHVzZWZ1bCBvbiB0aGUgYXJndW1lbnRzIG9iamVjdC4gUGFzc2luZyBhbiAqKm4qKiB3aWxsIHJldHVyblxuICAvLyB0aGUgcmVzdCBOIHZhbHVlcyBpbiB0aGUgYXJyYXkuIFRoZSAqKmd1YXJkKipcbiAgLy8gY2hlY2sgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgXy5tYXBgLlxuICBfLnJlc3QgPSBfLnRhaWwgPSBfLmRyb3AgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICByZXR1cm4gc2xpY2UuY2FsbChhcnJheSwgKG4gPT0gbnVsbCkgfHwgZ3VhcmQgPyAxIDogbik7XG4gIH07XG5cbiAgLy8gVHJpbSBvdXQgYWxsIGZhbHN5IHZhbHVlcyBmcm9tIGFuIGFycmF5LlxuICBfLmNvbXBhY3QgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHJldHVybiBfLmZpbHRlcihhcnJheSwgXy5pZGVudGl0eSk7XG4gIH07XG5cbiAgLy8gSW50ZXJuYWwgaW1wbGVtZW50YXRpb24gb2YgYSByZWN1cnNpdmUgYGZsYXR0ZW5gIGZ1bmN0aW9uLlxuICB2YXIgZmxhdHRlbiA9IGZ1bmN0aW9uKGlucHV0LCBzaGFsbG93LCBvdXRwdXQpIHtcbiAgICBpZiAoc2hhbGxvdyAmJiBfLmV2ZXJ5KGlucHV0LCBfLmlzQXJyYXkpKSB7XG4gICAgICByZXR1cm4gY29uY2F0LmFwcGx5KG91dHB1dCwgaW5wdXQpO1xuICAgIH1cbiAgICBlYWNoKGlucHV0LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkgfHwgXy5pc0FyZ3VtZW50cyh2YWx1ZSkpIHtcbiAgICAgICAgc2hhbGxvdyA/IHB1c2guYXBwbHkob3V0cHV0LCB2YWx1ZSkgOiBmbGF0dGVuKHZhbHVlLCBzaGFsbG93LCBvdXRwdXQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0cHV0LnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvdXRwdXQ7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgY29tcGxldGVseSBmbGF0dGVuZWQgdmVyc2lvbiBvZiBhbiBhcnJheS5cbiAgXy5mbGF0dGVuID0gZnVuY3Rpb24oYXJyYXksIHNoYWxsb3cpIHtcbiAgICByZXR1cm4gZmxhdHRlbihhcnJheSwgc2hhbGxvdywgW10pO1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHZlcnNpb24gb2YgdGhlIGFycmF5IHRoYXQgZG9lcyBub3QgY29udGFpbiB0aGUgc3BlY2lmaWVkIHZhbHVlKHMpLlxuICBfLndpdGhvdXQgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHJldHVybiBfLmRpZmZlcmVuY2UoYXJyYXksIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gIH07XG5cbiAgLy8gUHJvZHVjZSBhIGR1cGxpY2F0ZS1mcmVlIHZlcnNpb24gb2YgdGhlIGFycmF5LiBJZiB0aGUgYXJyYXkgaGFzIGFscmVhZHlcbiAgLy8gYmVlbiBzb3J0ZWQsIHlvdSBoYXZlIHRoZSBvcHRpb24gb2YgdXNpbmcgYSBmYXN0ZXIgYWxnb3JpdGhtLlxuICAvLyBBbGlhc2VkIGFzIGB1bmlxdWVgLlxuICBfLnVuaXEgPSBfLnVuaXF1ZSA9IGZ1bmN0aW9uKGFycmF5LCBpc1NvcnRlZCwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGlzU29ydGVkKSkge1xuICAgICAgY29udGV4dCA9IGl0ZXJhdG9yO1xuICAgICAgaXRlcmF0b3IgPSBpc1NvcnRlZDtcbiAgICAgIGlzU29ydGVkID0gZmFsc2U7XG4gICAgfVxuICAgIHZhciBpbml0aWFsID0gaXRlcmF0b3IgPyBfLm1hcChhcnJheSwgaXRlcmF0b3IsIGNvbnRleHQpIDogYXJyYXk7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICB2YXIgc2VlbiA9IFtdO1xuICAgIGVhY2goaW5pdGlhbCwgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICBpZiAoaXNTb3J0ZWQgPyAoIWluZGV4IHx8IHNlZW5bc2Vlbi5sZW5ndGggLSAxXSAhPT0gdmFsdWUpIDogIV8uY29udGFpbnMoc2VlbiwgdmFsdWUpKSB7XG4gICAgICAgIHNlZW4ucHVzaCh2YWx1ZSk7XG4gICAgICAgIHJlc3VsdHMucHVzaChhcnJheVtpbmRleF0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYW4gYXJyYXkgdGhhdCBjb250YWlucyB0aGUgdW5pb246IGVhY2ggZGlzdGluY3QgZWxlbWVudCBmcm9tIGFsbCBvZlxuICAvLyB0aGUgcGFzc2VkLWluIGFycmF5cy5cbiAgXy51bmlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfLnVuaXEoXy5mbGF0dGVuKGFyZ3VtZW50cywgdHJ1ZSkpO1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYW4gYXJyYXkgdGhhdCBjb250YWlucyBldmVyeSBpdGVtIHNoYXJlZCBiZXR3ZWVuIGFsbCB0aGVcbiAgLy8gcGFzc2VkLWluIGFycmF5cy5cbiAgXy5pbnRlcnNlY3Rpb24gPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHZhciByZXN0ID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIHJldHVybiBfLmZpbHRlcihfLnVuaXEoYXJyYXkpLCBmdW5jdGlvbihpdGVtKSB7XG4gICAgICByZXR1cm4gXy5ldmVyeShyZXN0LCBmdW5jdGlvbihvdGhlcikge1xuICAgICAgICByZXR1cm4gXy5pbmRleE9mKG90aGVyLCBpdGVtKSA+PSAwO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gVGFrZSB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIG9uZSBhcnJheSBhbmQgYSBudW1iZXIgb2Ygb3RoZXIgYXJyYXlzLlxuICAvLyBPbmx5IHRoZSBlbGVtZW50cyBwcmVzZW50IGluIGp1c3QgdGhlIGZpcnN0IGFycmF5IHdpbGwgcmVtYWluLlxuICBfLmRpZmZlcmVuY2UgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHZhciByZXN0ID0gY29uY2F0LmFwcGx5KEFycmF5UHJvdG8sIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgcmV0dXJuIF8uZmlsdGVyKGFycmF5LCBmdW5jdGlvbih2YWx1ZSl7IHJldHVybiAhXy5jb250YWlucyhyZXN0LCB2YWx1ZSk7IH0pO1xuICB9O1xuXG4gIC8vIFppcCB0b2dldGhlciBtdWx0aXBsZSBsaXN0cyBpbnRvIGEgc2luZ2xlIGFycmF5IC0tIGVsZW1lbnRzIHRoYXQgc2hhcmVcbiAgLy8gYW4gaW5kZXggZ28gdG9nZXRoZXIuXG4gIF8uemlwID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGxlbmd0aCA9IF8ubWF4KF8ucGx1Y2soYXJndW1lbnRzLCBcImxlbmd0aFwiKS5jb25jYXQoMCkpO1xuICAgIHZhciByZXN1bHRzID0gbmV3IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcmVzdWx0c1tpXSA9IF8ucGx1Y2soYXJndW1lbnRzLCAnJyArIGkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBDb252ZXJ0cyBsaXN0cyBpbnRvIG9iamVjdHMuIFBhc3MgZWl0aGVyIGEgc2luZ2xlIGFycmF5IG9mIGBba2V5LCB2YWx1ZV1gXG4gIC8vIHBhaXJzLCBvciB0d28gcGFyYWxsZWwgYXJyYXlzIG9mIHRoZSBzYW1lIGxlbmd0aCAtLSBvbmUgb2Yga2V5cywgYW5kIG9uZSBvZlxuICAvLyB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZXMuXG4gIF8ub2JqZWN0ID0gZnVuY3Rpb24obGlzdCwgdmFsdWVzKSB7XG4gICAgaWYgKGxpc3QgPT0gbnVsbCkgcmV0dXJuIHt9O1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGxpc3QubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBpZiAodmFsdWVzKSB7XG4gICAgICAgIHJlc3VsdFtsaXN0W2ldXSA9IHZhbHVlc1tpXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdFtsaXN0W2ldWzBdXSA9IGxpc3RbaV1bMV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gSWYgdGhlIGJyb3dzZXIgZG9lc24ndCBzdXBwbHkgdXMgd2l0aCBpbmRleE9mIChJJ20gbG9va2luZyBhdCB5b3UsICoqTVNJRSoqKSxcbiAgLy8gd2UgbmVlZCB0aGlzIGZ1bmN0aW9uLiBSZXR1cm4gdGhlIHBvc2l0aW9uIG9mIHRoZSBmaXJzdCBvY2N1cnJlbmNlIG9mIGFuXG4gIC8vIGl0ZW0gaW4gYW4gYXJyYXksIG9yIC0xIGlmIHRoZSBpdGVtIGlzIG5vdCBpbmNsdWRlZCBpbiB0aGUgYXJyYXkuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBpbmRleE9mYCBpZiBhdmFpbGFibGUuXG4gIC8vIElmIHRoZSBhcnJheSBpcyBsYXJnZSBhbmQgYWxyZWFkeSBpbiBzb3J0IG9yZGVyLCBwYXNzIGB0cnVlYFxuICAvLyBmb3IgKippc1NvcnRlZCoqIHRvIHVzZSBiaW5hcnkgc2VhcmNoLlxuICBfLmluZGV4T2YgPSBmdW5jdGlvbihhcnJheSwgaXRlbSwgaXNTb3J0ZWQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIC0xO1xuICAgIHZhciBpID0gMCwgbCA9IGFycmF5Lmxlbmd0aDtcbiAgICBpZiAoaXNTb3J0ZWQpIHtcbiAgICAgIGlmICh0eXBlb2YgaXNTb3J0ZWQgPT0gJ251bWJlcicpIHtcbiAgICAgICAgaSA9IChpc1NvcnRlZCA8IDAgPyBNYXRoLm1heCgwLCBsICsgaXNTb3J0ZWQpIDogaXNTb3J0ZWQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaSA9IF8uc29ydGVkSW5kZXgoYXJyYXksIGl0ZW0pO1xuICAgICAgICByZXR1cm4gYXJyYXlbaV0gPT09IGl0ZW0gPyBpIDogLTE7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChuYXRpdmVJbmRleE9mICYmIGFycmF5LmluZGV4T2YgPT09IG5hdGl2ZUluZGV4T2YpIHJldHVybiBhcnJheS5pbmRleE9mKGl0ZW0sIGlzU29ydGVkKTtcbiAgICBmb3IgKDsgaSA8IGw7IGkrKykgaWYgKGFycmF5W2ldID09PSBpdGVtKSByZXR1cm4gaTtcbiAgICByZXR1cm4gLTE7XG4gIH07XG5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGxhc3RJbmRleE9mYCBpZiBhdmFpbGFibGUuXG4gIF8ubGFzdEluZGV4T2YgPSBmdW5jdGlvbihhcnJheSwgaXRlbSwgZnJvbSkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gLTE7XG4gICAgdmFyIGhhc0luZGV4ID0gZnJvbSAhPSBudWxsO1xuICAgIGlmIChuYXRpdmVMYXN0SW5kZXhPZiAmJiBhcnJheS5sYXN0SW5kZXhPZiA9PT0gbmF0aXZlTGFzdEluZGV4T2YpIHtcbiAgICAgIHJldHVybiBoYXNJbmRleCA/IGFycmF5Lmxhc3RJbmRleE9mKGl0ZW0sIGZyb20pIDogYXJyYXkubGFzdEluZGV4T2YoaXRlbSk7XG4gICAgfVxuICAgIHZhciBpID0gKGhhc0luZGV4ID8gZnJvbSA6IGFycmF5Lmxlbmd0aCk7XG4gICAgd2hpbGUgKGktLSkgaWYgKGFycmF5W2ldID09PSBpdGVtKSByZXR1cm4gaTtcbiAgICByZXR1cm4gLTE7XG4gIH07XG5cbiAgLy8gR2VuZXJhdGUgYW4gaW50ZWdlciBBcnJheSBjb250YWluaW5nIGFuIGFyaXRobWV0aWMgcHJvZ3Jlc3Npb24uIEEgcG9ydCBvZlxuICAvLyB0aGUgbmF0aXZlIFB5dGhvbiBgcmFuZ2UoKWAgZnVuY3Rpb24uIFNlZVxuICAvLyBbdGhlIFB5dGhvbiBkb2N1bWVudGF0aW9uXShodHRwOi8vZG9jcy5weXRob24ub3JnL2xpYnJhcnkvZnVuY3Rpb25zLmh0bWwjcmFuZ2UpLlxuICBfLnJhbmdlID0gZnVuY3Rpb24oc3RhcnQsIHN0b3AsIHN0ZXApIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8PSAxKSB7XG4gICAgICBzdG9wID0gc3RhcnQgfHwgMDtcbiAgICAgIHN0YXJ0ID0gMDtcbiAgICB9XG4gICAgc3RlcCA9IGFyZ3VtZW50c1syXSB8fCAxO1xuXG4gICAgdmFyIGxlbiA9IE1hdGgubWF4KE1hdGguY2VpbCgoc3RvcCAtIHN0YXJ0KSAvIHN0ZXApLCAwKTtcbiAgICB2YXIgaWR4ID0gMDtcbiAgICB2YXIgcmFuZ2UgPSBuZXcgQXJyYXkobGVuKTtcblxuICAgIHdoaWxlKGlkeCA8IGxlbikge1xuICAgICAgcmFuZ2VbaWR4KytdID0gc3RhcnQ7XG4gICAgICBzdGFydCArPSBzdGVwO1xuICAgIH1cblxuICAgIHJldHVybiByYW5nZTtcbiAgfTtcblxuICAvLyBGdW5jdGlvbiAoYWhlbSkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFJldXNhYmxlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIGZvciBwcm90b3R5cGUgc2V0dGluZy5cbiAgdmFyIGN0b3IgPSBmdW5jdGlvbigpe307XG5cbiAgLy8gQ3JlYXRlIGEgZnVuY3Rpb24gYm91bmQgdG8gYSBnaXZlbiBvYmplY3QgKGFzc2lnbmluZyBgdGhpc2AsIGFuZCBhcmd1bWVudHMsXG4gIC8vIG9wdGlvbmFsbHkpLiBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgRnVuY3Rpb24uYmluZGAgaWZcbiAgLy8gYXZhaWxhYmxlLlxuICBfLmJpbmQgPSBmdW5jdGlvbihmdW5jLCBjb250ZXh0KSB7XG4gICAgdmFyIGFyZ3MsIGJvdW5kO1xuICAgIGlmIChuYXRpdmVCaW5kICYmIGZ1bmMuYmluZCA9PT0gbmF0aXZlQmluZCkgcmV0dXJuIG5hdGl2ZUJpbmQuYXBwbHkoZnVuYywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICBpZiAoIV8uaXNGdW5jdGlvbihmdW5jKSkgdGhyb3cgbmV3IFR5cGVFcnJvcjtcbiAgICBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHJldHVybiBib3VuZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIGJvdW5kKSkgcmV0dXJuIGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncy5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gICAgICBjdG9yLnByb3RvdHlwZSA9IGZ1bmMucHJvdG90eXBlO1xuICAgICAgdmFyIHNlbGYgPSBuZXcgY3RvcjtcbiAgICAgIGN0b3IucHJvdG90eXBlID0gbnVsbDtcbiAgICAgIHZhciByZXN1bHQgPSBmdW5jLmFwcGx5KHNlbGYsIGFyZ3MuY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgICAgaWYgKE9iamVjdChyZXN1bHQpID09PSByZXN1bHQpIHJldHVybiByZXN1bHQ7XG4gICAgICByZXR1cm4gc2VsZjtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFBhcnRpYWxseSBhcHBseSBhIGZ1bmN0aW9uIGJ5IGNyZWF0aW5nIGEgdmVyc2lvbiB0aGF0IGhhcyBoYWQgc29tZSBvZiBpdHNcbiAgLy8gYXJndW1lbnRzIHByZS1maWxsZWQsIHdpdGhvdXQgY2hhbmdpbmcgaXRzIGR5bmFtaWMgYHRoaXNgIGNvbnRleHQuXG4gIF8ucGFydGlhbCA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzLCBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIEJpbmQgYWxsIG9mIGFuIG9iamVjdCdzIG1ldGhvZHMgdG8gdGhhdCBvYmplY3QuIFVzZWZ1bCBmb3IgZW5zdXJpbmcgdGhhdFxuICAvLyBhbGwgY2FsbGJhY2tzIGRlZmluZWQgb24gYW4gb2JqZWN0IGJlbG9uZyB0byBpdC5cbiAgXy5iaW5kQWxsID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGZ1bmNzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIGlmIChmdW5jcy5sZW5ndGggPT09IDApIHRocm93IG5ldyBFcnJvcihcImJpbmRBbGwgbXVzdCBiZSBwYXNzZWQgZnVuY3Rpb24gbmFtZXNcIik7XG4gICAgZWFjaChmdW5jcywgZnVuY3Rpb24oZikgeyBvYmpbZl0gPSBfLmJpbmQob2JqW2ZdLCBvYmopOyB9KTtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIE1lbW9pemUgYW4gZXhwZW5zaXZlIGZ1bmN0aW9uIGJ5IHN0b3JpbmcgaXRzIHJlc3VsdHMuXG4gIF8ubWVtb2l6ZSA9IGZ1bmN0aW9uKGZ1bmMsIGhhc2hlcikge1xuICAgIHZhciBtZW1vID0ge307XG4gICAgaGFzaGVyIHx8IChoYXNoZXIgPSBfLmlkZW50aXR5KTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIga2V5ID0gaGFzaGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICByZXR1cm4gXy5oYXMobWVtbywga2V5KSA/IG1lbW9ba2V5XSA6IChtZW1vW2tleV0gPSBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO1xuICAgIH07XG4gIH07XG5cbiAgLy8gRGVsYXlzIGEgZnVuY3Rpb24gZm9yIHRoZSBnaXZlbiBudW1iZXIgb2YgbWlsbGlzZWNvbmRzLCBhbmQgdGhlbiBjYWxsc1xuICAvLyBpdCB3aXRoIHRoZSBhcmd1bWVudHMgc3VwcGxpZWQuXG4gIF8uZGVsYXkgPSBmdW5jdGlvbihmdW5jLCB3YWl0KSB7XG4gICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24oKXsgcmV0dXJuIGZ1bmMuYXBwbHkobnVsbCwgYXJncyk7IH0sIHdhaXQpO1xuICB9O1xuXG4gIC8vIERlZmVycyBhIGZ1bmN0aW9uLCBzY2hlZHVsaW5nIGl0IHRvIHJ1biBhZnRlciB0aGUgY3VycmVudCBjYWxsIHN0YWNrIGhhc1xuICAvLyBjbGVhcmVkLlxuICBfLmRlZmVyID0gZnVuY3Rpb24oZnVuYykge1xuICAgIHJldHVybiBfLmRlbGF5LmFwcGx5KF8sIFtmdW5jLCAxXS5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKSk7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uLCB0aGF0LCB3aGVuIGludm9rZWQsIHdpbGwgb25seSBiZSB0cmlnZ2VyZWQgYXQgbW9zdCBvbmNlXG4gIC8vIGR1cmluZyBhIGdpdmVuIHdpbmRvdyBvZiB0aW1lLiBOb3JtYWxseSwgdGhlIHRocm90dGxlZCBmdW5jdGlvbiB3aWxsIHJ1blxuICAvLyBhcyBtdWNoIGFzIGl0IGNhbiwgd2l0aG91dCBldmVyIGdvaW5nIG1vcmUgdGhhbiBvbmNlIHBlciBgd2FpdGAgZHVyYXRpb247XG4gIC8vIGJ1dCBpZiB5b3UnZCBsaWtlIHRvIGRpc2FibGUgdGhlIGV4ZWN1dGlvbiBvbiB0aGUgbGVhZGluZyBlZGdlLCBwYXNzXG4gIC8vIGB7bGVhZGluZzogZmFsc2V9YC4gVG8gZGlzYWJsZSBleGVjdXRpb24gb24gdGhlIHRyYWlsaW5nIGVkZ2UsIGRpdHRvLlxuICBfLnRocm90dGxlID0gZnVuY3Rpb24oZnVuYywgd2FpdCwgb3B0aW9ucykge1xuICAgIHZhciBjb250ZXh0LCBhcmdzLCByZXN1bHQ7XG4gICAgdmFyIHRpbWVvdXQgPSBudWxsO1xuICAgIHZhciBwcmV2aW91cyA9IDA7XG4gICAgb3B0aW9ucyB8fCAob3B0aW9ucyA9IHt9KTtcbiAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHByZXZpb3VzID0gb3B0aW9ucy5sZWFkaW5nID09PSBmYWxzZSA/IDAgOiBuZXcgRGF0ZTtcbiAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICB9O1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBub3cgPSBuZXcgRGF0ZTtcbiAgICAgIGlmICghcHJldmlvdXMgJiYgb3B0aW9ucy5sZWFkaW5nID09PSBmYWxzZSkgcHJldmlvdXMgPSBub3c7XG4gICAgICB2YXIgcmVtYWluaW5nID0gd2FpdCAtIChub3cgLSBwcmV2aW91cyk7XG4gICAgICBjb250ZXh0ID0gdGhpcztcbiAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICBpZiAocmVtYWluaW5nIDw9IDApIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgcHJldmlvdXMgPSBub3c7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICB9IGVsc2UgaWYgKCF0aW1lb3V0ICYmIG9wdGlvbnMudHJhaWxpbmcgIT09IGZhbHNlKSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCByZW1haW5pbmcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiwgdGhhdCwgYXMgbG9uZyBhcyBpdCBjb250aW51ZXMgdG8gYmUgaW52b2tlZCwgd2lsbCBub3RcbiAgLy8gYmUgdHJpZ2dlcmVkLiBUaGUgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgYWZ0ZXIgaXQgc3RvcHMgYmVpbmcgY2FsbGVkIGZvclxuICAvLyBOIG1pbGxpc2Vjb25kcy4gSWYgYGltbWVkaWF0ZWAgaXMgcGFzc2VkLCB0cmlnZ2VyIHRoZSBmdW5jdGlvbiBvbiB0aGVcbiAgLy8gbGVhZGluZyBlZGdlLCBpbnN0ZWFkIG9mIHRoZSB0cmFpbGluZy5cbiAgXy5kZWJvdW5jZSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQsIGltbWVkaWF0ZSkge1xuICAgIHZhciByZXN1bHQ7XG4gICAgdmFyIHRpbWVvdXQgPSBudWxsO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjb250ZXh0ID0gdGhpcywgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIHZhciBsYXRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgaWYgKCFpbW1lZGlhdGUpIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICB9O1xuICAgICAgdmFyIGNhbGxOb3cgPSBpbW1lZGlhdGUgJiYgIXRpbWVvdXQ7XG4gICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgd2FpdCk7XG4gICAgICBpZiAoY2FsbE5vdykgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aWxsIGJlIGV4ZWN1dGVkIGF0IG1vc3Qgb25lIHRpbWUsIG5vIG1hdHRlciBob3dcbiAgLy8gb2Z0ZW4geW91IGNhbGwgaXQuIFVzZWZ1bCBmb3IgbGF6eSBpbml0aWFsaXphdGlvbi5cbiAgXy5vbmNlID0gZnVuY3Rpb24oZnVuYykge1xuICAgIHZhciByYW4gPSBmYWxzZSwgbWVtbztcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAocmFuKSByZXR1cm4gbWVtbztcbiAgICAgIHJhbiA9IHRydWU7XG4gICAgICBtZW1vID0gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgZnVuYyA9IG51bGw7XG4gICAgICByZXR1cm4gbWVtbztcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgdGhlIGZpcnN0IGZ1bmN0aW9uIHBhc3NlZCBhcyBhbiBhcmd1bWVudCB0byB0aGUgc2Vjb25kLFxuICAvLyBhbGxvd2luZyB5b3UgdG8gYWRqdXN0IGFyZ3VtZW50cywgcnVuIGNvZGUgYmVmb3JlIGFuZCBhZnRlciwgYW5kXG4gIC8vIGNvbmRpdGlvbmFsbHkgZXhlY3V0ZSB0aGUgb3JpZ2luYWwgZnVuY3Rpb24uXG4gIF8ud3JhcCA9IGZ1bmN0aW9uKGZ1bmMsIHdyYXBwZXIpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncyA9IFtmdW5jXTtcbiAgICAgIHB1c2guYXBwbHkoYXJncywgYXJndW1lbnRzKTtcbiAgICAgIHJldHVybiB3cmFwcGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgaXMgdGhlIGNvbXBvc2l0aW9uIG9mIGEgbGlzdCBvZiBmdW5jdGlvbnMsIGVhY2hcbiAgLy8gY29uc3VtaW5nIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZ1bmN0aW9uIHRoYXQgZm9sbG93cy5cbiAgXy5jb21wb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZ1bmNzID0gYXJndW1lbnRzO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgZm9yICh2YXIgaSA9IGZ1bmNzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIGFyZ3MgPSBbZnVuY3NbaV0uYXBwbHkodGhpcywgYXJncyldO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGFyZ3NbMF07XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aWxsIG9ubHkgYmUgZXhlY3V0ZWQgYWZ0ZXIgYmVpbmcgY2FsbGVkIE4gdGltZXMuXG4gIF8uYWZ0ZXIgPSBmdW5jdGlvbih0aW1lcywgZnVuYykge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgtLXRpbWVzIDwgMSkge1xuICAgICAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfVxuICAgIH07XG4gIH07XG5cbiAgLy8gT2JqZWN0IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUmV0cmlldmUgdGhlIG5hbWVzIG9mIGFuIG9iamVjdCdzIHByb3BlcnRpZXMuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBPYmplY3Qua2V5c2BcbiAgXy5rZXlzID0gbmF0aXZlS2V5cyB8fCBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqICE9PSBPYmplY3Qob2JqKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBvYmplY3QnKTtcbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIGlmIChfLmhhcyhvYmosIGtleSkpIGtleXMucHVzaChrZXkpO1xuICAgIHJldHVybiBrZXlzO1xuICB9O1xuXG4gIC8vIFJldHJpZXZlIHRoZSB2YWx1ZXMgb2YgYW4gb2JqZWN0J3MgcHJvcGVydGllcy5cbiAgXy52YWx1ZXMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgdmFsdWVzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgaWYgKF8uaGFzKG9iaiwga2V5KSkgdmFsdWVzLnB1c2gob2JqW2tleV0pO1xuICAgIHJldHVybiB2YWx1ZXM7XG4gIH07XG5cbiAgLy8gQ29udmVydCBhbiBvYmplY3QgaW50byBhIGxpc3Qgb2YgYFtrZXksIHZhbHVlXWAgcGFpcnMuXG4gIF8ucGFpcnMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgcGFpcnMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSBpZiAoXy5oYXMob2JqLCBrZXkpKSBwYWlycy5wdXNoKFtrZXksIG9ialtrZXldXSk7XG4gICAgcmV0dXJuIHBhaXJzO1xuICB9O1xuXG4gIC8vIEludmVydCB0aGUga2V5cyBhbmQgdmFsdWVzIG9mIGFuIG9iamVjdC4gVGhlIHZhbHVlcyBtdXN0IGJlIHNlcmlhbGl6YWJsZS5cbiAgXy5pbnZlcnQgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgaWYgKF8uaGFzKG9iaiwga2V5KSkgcmVzdWx0W29ialtrZXldXSA9IGtleTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHNvcnRlZCBsaXN0IG9mIHRoZSBmdW5jdGlvbiBuYW1lcyBhdmFpbGFibGUgb24gdGhlIG9iamVjdC5cbiAgLy8gQWxpYXNlZCBhcyBgbWV0aG9kc2BcbiAgXy5mdW5jdGlvbnMgPSBfLm1ldGhvZHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgbmFtZXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICBpZiAoXy5pc0Z1bmN0aW9uKG9ialtrZXldKSkgbmFtZXMucHVzaChrZXkpO1xuICAgIH1cbiAgICByZXR1cm4gbmFtZXMuc29ydCgpO1xuICB9O1xuXG4gIC8vIEV4dGVuZCBhIGdpdmVuIG9iamVjdCB3aXRoIGFsbCB0aGUgcHJvcGVydGllcyBpbiBwYXNzZWQtaW4gb2JqZWN0KHMpLlxuICBfLmV4dGVuZCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGVhY2goc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLCBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICAgIGlmIChzb3VyY2UpIHtcbiAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgICAgICBvYmpbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIFJldHVybiBhIGNvcHkgb2YgdGhlIG9iamVjdCBvbmx5IGNvbnRhaW5pbmcgdGhlIHdoaXRlbGlzdGVkIHByb3BlcnRpZXMuXG4gIF8ucGljayA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBjb3B5ID0ge307XG4gICAgdmFyIGtleXMgPSBjb25jYXQuYXBwbHkoQXJyYXlQcm90bywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICBlYWNoKGtleXMsIGZ1bmN0aW9uKGtleSkge1xuICAgICAgaWYgKGtleSBpbiBvYmopIGNvcHlba2V5XSA9IG9ialtrZXldO1xuICAgIH0pO1xuICAgIHJldHVybiBjb3B5O1xuICB9O1xuXG4gICAvLyBSZXR1cm4gYSBjb3B5IG9mIHRoZSBvYmplY3Qgd2l0aG91dCB0aGUgYmxhY2tsaXN0ZWQgcHJvcGVydGllcy5cbiAgXy5vbWl0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGNvcHkgPSB7fTtcbiAgICB2YXIga2V5cyA9IGNvbmNhdC5hcHBseShBcnJheVByb3RvLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgIGlmICghXy5jb250YWlucyhrZXlzLCBrZXkpKSBjb3B5W2tleV0gPSBvYmpba2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIGNvcHk7XG4gIH07XG5cbiAgLy8gRmlsbCBpbiBhIGdpdmVuIG9iamVjdCB3aXRoIGRlZmF1bHQgcHJvcGVydGllcy5cbiAgXy5kZWZhdWx0cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGVhY2goc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLCBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICAgIGlmIChzb3VyY2UpIHtcbiAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgICAgICBpZiAob2JqW3Byb3BdID09PSB2b2lkIDApIG9ialtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gQ3JlYXRlIGEgKHNoYWxsb3ctY2xvbmVkKSBkdXBsaWNhdGUgb2YgYW4gb2JqZWN0LlxuICBfLmNsb25lID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFfLmlzT2JqZWN0KG9iaikpIHJldHVybiBvYmo7XG4gICAgcmV0dXJuIF8uaXNBcnJheShvYmopID8gb2JqLnNsaWNlKCkgOiBfLmV4dGVuZCh7fSwgb2JqKTtcbiAgfTtcblxuICAvLyBJbnZva2VzIGludGVyY2VwdG9yIHdpdGggdGhlIG9iaiwgYW5kIHRoZW4gcmV0dXJucyBvYmouXG4gIC8vIFRoZSBwcmltYXJ5IHB1cnBvc2Ugb2YgdGhpcyBtZXRob2QgaXMgdG8gXCJ0YXAgaW50b1wiIGEgbWV0aG9kIGNoYWluLCBpblxuICAvLyBvcmRlciB0byBwZXJmb3JtIG9wZXJhdGlvbnMgb24gaW50ZXJtZWRpYXRlIHJlc3VsdHMgd2l0aGluIHRoZSBjaGFpbi5cbiAgXy50YXAgPSBmdW5jdGlvbihvYmosIGludGVyY2VwdG9yKSB7XG4gICAgaW50ZXJjZXB0b3Iob2JqKTtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIEludGVybmFsIHJlY3Vyc2l2ZSBjb21wYXJpc29uIGZ1bmN0aW9uIGZvciBgaXNFcXVhbGAuXG4gIHZhciBlcSA9IGZ1bmN0aW9uKGEsIGIsIGFTdGFjaywgYlN0YWNrKSB7XG4gICAgLy8gSWRlbnRpY2FsIG9iamVjdHMgYXJlIGVxdWFsLiBgMCA9PT0gLTBgLCBidXQgdGhleSBhcmVuJ3QgaWRlbnRpY2FsLlxuICAgIC8vIFNlZSB0aGUgW0hhcm1vbnkgYGVnYWxgIHByb3Bvc2FsXShodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OmVnYWwpLlxuICAgIGlmIChhID09PSBiKSByZXR1cm4gYSAhPT0gMCB8fCAxIC8gYSA9PSAxIC8gYjtcbiAgICAvLyBBIHN0cmljdCBjb21wYXJpc29uIGlzIG5lY2Vzc2FyeSBiZWNhdXNlIGBudWxsID09IHVuZGVmaW5lZGAuXG4gICAgaWYgKGEgPT0gbnVsbCB8fCBiID09IG51bGwpIHJldHVybiBhID09PSBiO1xuICAgIC8vIFVud3JhcCBhbnkgd3JhcHBlZCBvYmplY3RzLlxuICAgIGlmIChhIGluc3RhbmNlb2YgXykgYSA9IGEuX3dyYXBwZWQ7XG4gICAgaWYgKGIgaW5zdGFuY2VvZiBfKSBiID0gYi5fd3JhcHBlZDtcbiAgICAvLyBDb21wYXJlIGBbW0NsYXNzXV1gIG5hbWVzLlxuICAgIHZhciBjbGFzc05hbWUgPSB0b1N0cmluZy5jYWxsKGEpO1xuICAgIGlmIChjbGFzc05hbWUgIT0gdG9TdHJpbmcuY2FsbChiKSkgcmV0dXJuIGZhbHNlO1xuICAgIHN3aXRjaCAoY2xhc3NOYW1lKSB7XG4gICAgICAvLyBTdHJpbmdzLCBudW1iZXJzLCBkYXRlcywgYW5kIGJvb2xlYW5zIGFyZSBjb21wYXJlZCBieSB2YWx1ZS5cbiAgICAgIGNhc2UgJ1tvYmplY3QgU3RyaW5nXSc6XG4gICAgICAgIC8vIFByaW1pdGl2ZXMgYW5kIHRoZWlyIGNvcnJlc3BvbmRpbmcgb2JqZWN0IHdyYXBwZXJzIGFyZSBlcXVpdmFsZW50OyB0aHVzLCBgXCI1XCJgIGlzXG4gICAgICAgIC8vIGVxdWl2YWxlbnQgdG8gYG5ldyBTdHJpbmcoXCI1XCIpYC5cbiAgICAgICAgcmV0dXJuIGEgPT0gU3RyaW5nKGIpO1xuICAgICAgY2FzZSAnW29iamVjdCBOdW1iZXJdJzpcbiAgICAgICAgLy8gYE5hTmBzIGFyZSBlcXVpdmFsZW50LCBidXQgbm9uLXJlZmxleGl2ZS4gQW4gYGVnYWxgIGNvbXBhcmlzb24gaXMgcGVyZm9ybWVkIGZvclxuICAgICAgICAvLyBvdGhlciBudW1lcmljIHZhbHVlcy5cbiAgICAgICAgcmV0dXJuIGEgIT0gK2EgPyBiICE9ICtiIDogKGEgPT0gMCA/IDEgLyBhID09IDEgLyBiIDogYSA9PSArYik7XG4gICAgICBjYXNlICdbb2JqZWN0IERhdGVdJzpcbiAgICAgIGNhc2UgJ1tvYmplY3QgQm9vbGVhbl0nOlxuICAgICAgICAvLyBDb2VyY2UgZGF0ZXMgYW5kIGJvb2xlYW5zIHRvIG51bWVyaWMgcHJpbWl0aXZlIHZhbHVlcy4gRGF0ZXMgYXJlIGNvbXBhcmVkIGJ5IHRoZWlyXG4gICAgICAgIC8vIG1pbGxpc2Vjb25kIHJlcHJlc2VudGF0aW9ucy4gTm90ZSB0aGF0IGludmFsaWQgZGF0ZXMgd2l0aCBtaWxsaXNlY29uZCByZXByZXNlbnRhdGlvbnNcbiAgICAgICAgLy8gb2YgYE5hTmAgYXJlIG5vdCBlcXVpdmFsZW50LlxuICAgICAgICByZXR1cm4gK2EgPT0gK2I7XG4gICAgICAvLyBSZWdFeHBzIGFyZSBjb21wYXJlZCBieSB0aGVpciBzb3VyY2UgcGF0dGVybnMgYW5kIGZsYWdzLlxuICAgICAgY2FzZSAnW29iamVjdCBSZWdFeHBdJzpcbiAgICAgICAgcmV0dXJuIGEuc291cmNlID09IGIuc291cmNlICYmXG4gICAgICAgICAgICAgICBhLmdsb2JhbCA9PSBiLmdsb2JhbCAmJlxuICAgICAgICAgICAgICAgYS5tdWx0aWxpbmUgPT0gYi5tdWx0aWxpbmUgJiZcbiAgICAgICAgICAgICAgIGEuaWdub3JlQ2FzZSA9PSBiLmlnbm9yZUNhc2U7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgYSAhPSAnb2JqZWN0JyB8fCB0eXBlb2YgYiAhPSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuICAgIC8vIEFzc3VtZSBlcXVhbGl0eSBmb3IgY3ljbGljIHN0cnVjdHVyZXMuIFRoZSBhbGdvcml0aG0gZm9yIGRldGVjdGluZyBjeWNsaWNcbiAgICAvLyBzdHJ1Y3R1cmVzIGlzIGFkYXB0ZWQgZnJvbSBFUyA1LjEgc2VjdGlvbiAxNS4xMi4zLCBhYnN0cmFjdCBvcGVyYXRpb24gYEpPYC5cbiAgICB2YXIgbGVuZ3RoID0gYVN0YWNrLmxlbmd0aDtcbiAgICB3aGlsZSAobGVuZ3RoLS0pIHtcbiAgICAgIC8vIExpbmVhciBzZWFyY2guIFBlcmZvcm1hbmNlIGlzIGludmVyc2VseSBwcm9wb3J0aW9uYWwgdG8gdGhlIG51bWJlciBvZlxuICAgICAgLy8gdW5pcXVlIG5lc3RlZCBzdHJ1Y3R1cmVzLlxuICAgICAgaWYgKGFTdGFja1tsZW5ndGhdID09IGEpIHJldHVybiBiU3RhY2tbbGVuZ3RoXSA9PSBiO1xuICAgIH1cbiAgICAvLyBPYmplY3RzIHdpdGggZGlmZmVyZW50IGNvbnN0cnVjdG9ycyBhcmUgbm90IGVxdWl2YWxlbnQsIGJ1dCBgT2JqZWN0YHNcbiAgICAvLyBmcm9tIGRpZmZlcmVudCBmcmFtZXMgYXJlLlxuICAgIHZhciBhQ3RvciA9IGEuY29uc3RydWN0b3IsIGJDdG9yID0gYi5jb25zdHJ1Y3RvcjtcbiAgICBpZiAoYUN0b3IgIT09IGJDdG9yICYmICEoXy5pc0Z1bmN0aW9uKGFDdG9yKSAmJiAoYUN0b3IgaW5zdGFuY2VvZiBhQ3RvcikgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5pc0Z1bmN0aW9uKGJDdG9yKSAmJiAoYkN0b3IgaW5zdGFuY2VvZiBiQ3RvcikpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEFkZCB0aGUgZmlyc3Qgb2JqZWN0IHRvIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICBhU3RhY2sucHVzaChhKTtcbiAgICBiU3RhY2sucHVzaChiKTtcbiAgICB2YXIgc2l6ZSA9IDAsIHJlc3VsdCA9IHRydWU7XG4gICAgLy8gUmVjdXJzaXZlbHkgY29tcGFyZSBvYmplY3RzIGFuZCBhcnJheXMuXG4gICAgaWYgKGNsYXNzTmFtZSA9PSAnW29iamVjdCBBcnJheV0nKSB7XG4gICAgICAvLyBDb21wYXJlIGFycmF5IGxlbmd0aHMgdG8gZGV0ZXJtaW5lIGlmIGEgZGVlcCBjb21wYXJpc29uIGlzIG5lY2Vzc2FyeS5cbiAgICAgIHNpemUgPSBhLmxlbmd0aDtcbiAgICAgIHJlc3VsdCA9IHNpemUgPT0gYi5sZW5ndGg7XG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIC8vIERlZXAgY29tcGFyZSB0aGUgY29udGVudHMsIGlnbm9yaW5nIG5vbi1udW1lcmljIHByb3BlcnRpZXMuXG4gICAgICAgIHdoaWxlIChzaXplLS0pIHtcbiAgICAgICAgICBpZiAoIShyZXN1bHQgPSBlcShhW3NpemVdLCBiW3NpemVdLCBhU3RhY2ssIGJTdGFjaykpKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBEZWVwIGNvbXBhcmUgb2JqZWN0cy5cbiAgICAgIGZvciAodmFyIGtleSBpbiBhKSB7XG4gICAgICAgIGlmIChfLmhhcyhhLCBrZXkpKSB7XG4gICAgICAgICAgLy8gQ291bnQgdGhlIGV4cGVjdGVkIG51bWJlciBvZiBwcm9wZXJ0aWVzLlxuICAgICAgICAgIHNpemUrKztcbiAgICAgICAgICAvLyBEZWVwIGNvbXBhcmUgZWFjaCBtZW1iZXIuXG4gICAgICAgICAgaWYgKCEocmVzdWx0ID0gXy5oYXMoYiwga2V5KSAmJiBlcShhW2tleV0sIGJba2V5XSwgYVN0YWNrLCBiU3RhY2spKSkgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIEVuc3VyZSB0aGF0IGJvdGggb2JqZWN0cyBjb250YWluIHRoZSBzYW1lIG51bWJlciBvZiBwcm9wZXJ0aWVzLlxuICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICBmb3IgKGtleSBpbiBiKSB7XG4gICAgICAgICAgaWYgKF8uaGFzKGIsIGtleSkgJiYgIShzaXplLS0pKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgICByZXN1bHQgPSAhc2l6ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gUmVtb3ZlIHRoZSBmaXJzdCBvYmplY3QgZnJvbSB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgYVN0YWNrLnBvcCgpO1xuICAgIGJTdGFjay5wb3AoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFBlcmZvcm0gYSBkZWVwIGNvbXBhcmlzb24gdG8gY2hlY2sgaWYgdHdvIG9iamVjdHMgYXJlIGVxdWFsLlxuICBfLmlzRXF1YWwgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGVxKGEsIGIsIFtdLCBbXSk7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiBhcnJheSwgc3RyaW5nLCBvciBvYmplY3QgZW1wdHk/XG4gIC8vIEFuIFwiZW1wdHlcIiBvYmplY3QgaGFzIG5vIGVudW1lcmFibGUgb3duLXByb3BlcnRpZXMuXG4gIF8uaXNFbXB0eSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHRydWU7XG4gICAgaWYgKF8uaXNBcnJheShvYmopIHx8IF8uaXNTdHJpbmcob2JqKSkgcmV0dXJuIG9iai5sZW5ndGggPT09IDA7XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgaWYgKF8uaGFzKG9iaiwga2V5KSkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgYSBET00gZWxlbWVudD9cbiAgXy5pc0VsZW1lbnQgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gISEob2JqICYmIG9iai5ub2RlVHlwZSA9PT0gMSk7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhbiBhcnJheT9cbiAgLy8gRGVsZWdhdGVzIHRvIEVDTUE1J3MgbmF0aXZlIEFycmF5LmlzQXJyYXlcbiAgXy5pc0FycmF5ID0gbmF0aXZlSXNBcnJheSB8fCBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YXJpYWJsZSBhbiBvYmplY3Q/XG4gIF8uaXNPYmplY3QgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSBPYmplY3Qob2JqKTtcbiAgfTtcblxuICAvLyBBZGQgc29tZSBpc1R5cGUgbWV0aG9kczogaXNBcmd1bWVudHMsIGlzRnVuY3Rpb24sIGlzU3RyaW5nLCBpc051bWJlciwgaXNEYXRlLCBpc1JlZ0V4cC5cbiAgZWFjaChbJ0FyZ3VtZW50cycsICdGdW5jdGlvbicsICdTdHJpbmcnLCAnTnVtYmVyJywgJ0RhdGUnLCAnUmVnRXhwJ10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBfWydpcycgKyBuYW1lXSA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PSAnW29iamVjdCAnICsgbmFtZSArICddJztcbiAgICB9O1xuICB9KTtcblxuICAvLyBEZWZpbmUgYSBmYWxsYmFjayB2ZXJzaW9uIG9mIHRoZSBtZXRob2QgaW4gYnJvd3NlcnMgKGFoZW0sIElFKSwgd2hlcmVcbiAgLy8gdGhlcmUgaXNuJ3QgYW55IGluc3BlY3RhYmxlIFwiQXJndW1lbnRzXCIgdHlwZS5cbiAgaWYgKCFfLmlzQXJndW1lbnRzKGFyZ3VtZW50cykpIHtcbiAgICBfLmlzQXJndW1lbnRzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gISEob2JqICYmIF8uaGFzKG9iaiwgJ2NhbGxlZScpKTtcbiAgICB9O1xuICB9XG5cbiAgLy8gT3B0aW1pemUgYGlzRnVuY3Rpb25gIGlmIGFwcHJvcHJpYXRlLlxuICBpZiAodHlwZW9mICgvLi8pICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgXy5pc0Z1bmN0aW9uID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ2Z1bmN0aW9uJztcbiAgICB9O1xuICB9XG5cbiAgLy8gSXMgYSBnaXZlbiBvYmplY3QgYSBmaW5pdGUgbnVtYmVyP1xuICBfLmlzRmluaXRlID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIGlzRmluaXRlKG9iaikgJiYgIWlzTmFOKHBhcnNlRmxvYXQob2JqKSk7XG4gIH07XG5cbiAgLy8gSXMgdGhlIGdpdmVuIHZhbHVlIGBOYU5gPyAoTmFOIGlzIHRoZSBvbmx5IG51bWJlciB3aGljaCBkb2VzIG5vdCBlcXVhbCBpdHNlbGYpLlxuICBfLmlzTmFOID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIF8uaXNOdW1iZXIob2JqKSAmJiBvYmogIT0gK29iajtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGEgYm9vbGVhbj9cbiAgXy5pc0Jvb2xlYW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB0cnVlIHx8IG9iaiA9PT0gZmFsc2UgfHwgdG9TdHJpbmcuY2FsbChvYmopID09ICdbb2JqZWN0IEJvb2xlYW5dJztcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGVxdWFsIHRvIG51bGw/XG4gIF8uaXNOdWxsID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gbnVsbDtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhcmlhYmxlIHVuZGVmaW5lZD9cbiAgXy5pc1VuZGVmaW5lZCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IHZvaWQgMDtcbiAgfTtcblxuICAvLyBTaG9ydGN1dCBmdW5jdGlvbiBmb3IgY2hlY2tpbmcgaWYgYW4gb2JqZWN0IGhhcyBhIGdpdmVuIHByb3BlcnR5IGRpcmVjdGx5XG4gIC8vIG9uIGl0c2VsZiAoaW4gb3RoZXIgd29yZHMsIG5vdCBvbiBhIHByb3RvdHlwZSkuXG4gIF8uaGFzID0gZnVuY3Rpb24ob2JqLCBrZXkpIHtcbiAgICByZXR1cm4gaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSk7XG4gIH07XG5cbiAgLy8gVXRpbGl0eSBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBSdW4gVW5kZXJzY29yZS5qcyBpbiAqbm9Db25mbGljdCogbW9kZSwgcmV0dXJuaW5nIHRoZSBgX2AgdmFyaWFibGUgdG8gaXRzXG4gIC8vIHByZXZpb3VzIG93bmVyLiBSZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBVbmRlcnNjb3JlIG9iamVjdC5cbiAgXy5ub0NvbmZsaWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgcm9vdC5fID0gcHJldmlvdXNVbmRlcnNjb3JlO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8vIEtlZXAgdGhlIGlkZW50aXR5IGZ1bmN0aW9uIGFyb3VuZCBmb3IgZGVmYXVsdCBpdGVyYXRvcnMuXG4gIF8uaWRlbnRpdHkgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfTtcblxuICAvLyBSdW4gYSBmdW5jdGlvbiAqKm4qKiB0aW1lcy5cbiAgXy50aW1lcyA9IGZ1bmN0aW9uKG4sIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgdmFyIGFjY3VtID0gQXJyYXkoTWF0aC5tYXgoMCwgbikpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSBhY2N1bVtpXSA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgaSk7XG4gICAgcmV0dXJuIGFjY3VtO1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gbWluIGFuZCBtYXggKGluY2x1c2l2ZSkuXG4gIF8ucmFuZG9tID0gZnVuY3Rpb24obWluLCBtYXgpIHtcbiAgICBpZiAobWF4ID09IG51bGwpIHtcbiAgICAgIG1heCA9IG1pbjtcbiAgICAgIG1pbiA9IDA7XG4gICAgfVxuICAgIHJldHVybiBtaW4gKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpO1xuICB9O1xuXG4gIC8vIExpc3Qgb2YgSFRNTCBlbnRpdGllcyBmb3IgZXNjYXBpbmcuXG4gIHZhciBlbnRpdHlNYXAgPSB7XG4gICAgZXNjYXBlOiB7XG4gICAgICAnJic6ICcmYW1wOycsXG4gICAgICAnPCc6ICcmbHQ7JyxcbiAgICAgICc+JzogJyZndDsnLFxuICAgICAgJ1wiJzogJyZxdW90OycsXG4gICAgICBcIidcIjogJyYjeDI3OycsXG4gICAgICAnLyc6ICcmI3gyRjsnXG4gICAgfVxuICB9O1xuICBlbnRpdHlNYXAudW5lc2NhcGUgPSBfLmludmVydChlbnRpdHlNYXAuZXNjYXBlKTtcblxuICAvLyBSZWdleGVzIGNvbnRhaW5pbmcgdGhlIGtleXMgYW5kIHZhbHVlcyBsaXN0ZWQgaW1tZWRpYXRlbHkgYWJvdmUuXG4gIHZhciBlbnRpdHlSZWdleGVzID0ge1xuICAgIGVzY2FwZTogICBuZXcgUmVnRXhwKCdbJyArIF8ua2V5cyhlbnRpdHlNYXAuZXNjYXBlKS5qb2luKCcnKSArICddJywgJ2cnKSxcbiAgICB1bmVzY2FwZTogbmV3IFJlZ0V4cCgnKCcgKyBfLmtleXMoZW50aXR5TWFwLnVuZXNjYXBlKS5qb2luKCd8JykgKyAnKScsICdnJylcbiAgfTtcblxuICAvLyBGdW5jdGlvbnMgZm9yIGVzY2FwaW5nIGFuZCB1bmVzY2FwaW5nIHN0cmluZ3MgdG8vZnJvbSBIVE1MIGludGVycG9sYXRpb24uXG4gIF8uZWFjaChbJ2VzY2FwZScsICd1bmVzY2FwZSddLCBmdW5jdGlvbihtZXRob2QpIHtcbiAgICBfW21ldGhvZF0gPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAgIGlmIChzdHJpbmcgPT0gbnVsbCkgcmV0dXJuICcnO1xuICAgICAgcmV0dXJuICgnJyArIHN0cmluZykucmVwbGFjZShlbnRpdHlSZWdleGVzW21ldGhvZF0sIGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgICAgIHJldHVybiBlbnRpdHlNYXBbbWV0aG9kXVttYXRjaF07XG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuICAvLyBJZiB0aGUgdmFsdWUgb2YgdGhlIG5hbWVkIGBwcm9wZXJ0eWAgaXMgYSBmdW5jdGlvbiB0aGVuIGludm9rZSBpdCB3aXRoIHRoZVxuICAvLyBgb2JqZWN0YCBhcyBjb250ZXh0OyBvdGhlcndpc2UsIHJldHVybiBpdC5cbiAgXy5yZXN1bHQgPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7XG4gICAgaWYgKG9iamVjdCA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIHZhciB2YWx1ZSA9IG9iamVjdFtwcm9wZXJ0eV07XG4gICAgcmV0dXJuIF8uaXNGdW5jdGlvbih2YWx1ZSkgPyB2YWx1ZS5jYWxsKG9iamVjdCkgOiB2YWx1ZTtcbiAgfTtcblxuICAvLyBBZGQgeW91ciBvd24gY3VzdG9tIGZ1bmN0aW9ucyB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QuXG4gIF8ubWl4aW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICBlYWNoKF8uZnVuY3Rpb25zKG9iaiksIGZ1bmN0aW9uKG5hbWUpe1xuICAgICAgdmFyIGZ1bmMgPSBfW25hbWVdID0gb2JqW25hbWVdO1xuICAgICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbdGhpcy5fd3JhcHBlZF07XG4gICAgICAgIHB1c2guYXBwbHkoYXJncywgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdC5jYWxsKHRoaXMsIGZ1bmMuYXBwbHkoXywgYXJncykpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBHZW5lcmF0ZSBhIHVuaXF1ZSBpbnRlZ2VyIGlkICh1bmlxdWUgd2l0aGluIHRoZSBlbnRpcmUgY2xpZW50IHNlc3Npb24pLlxuICAvLyBVc2VmdWwgZm9yIHRlbXBvcmFyeSBET00gaWRzLlxuICB2YXIgaWRDb3VudGVyID0gMDtcbiAgXy51bmlxdWVJZCA9IGZ1bmN0aW9uKHByZWZpeCkge1xuICAgIHZhciBpZCA9ICsraWRDb3VudGVyICsgJyc7XG4gICAgcmV0dXJuIHByZWZpeCA/IHByZWZpeCArIGlkIDogaWQ7XG4gIH07XG5cbiAgLy8gQnkgZGVmYXVsdCwgVW5kZXJzY29yZSB1c2VzIEVSQi1zdHlsZSB0ZW1wbGF0ZSBkZWxpbWl0ZXJzLCBjaGFuZ2UgdGhlXG4gIC8vIGZvbGxvd2luZyB0ZW1wbGF0ZSBzZXR0aW5ncyB0byB1c2UgYWx0ZXJuYXRpdmUgZGVsaW1pdGVycy5cbiAgXy50ZW1wbGF0ZVNldHRpbmdzID0ge1xuICAgIGV2YWx1YXRlICAgIDogLzwlKFtcXHNcXFNdKz8pJT4vZyxcbiAgICBpbnRlcnBvbGF0ZSA6IC88JT0oW1xcc1xcU10rPyklPi9nLFxuICAgIGVzY2FwZSAgICAgIDogLzwlLShbXFxzXFxTXSs/KSU+L2dcbiAgfTtcblxuICAvLyBXaGVuIGN1c3RvbWl6aW5nIGB0ZW1wbGF0ZVNldHRpbmdzYCwgaWYgeW91IGRvbid0IHdhbnQgdG8gZGVmaW5lIGFuXG4gIC8vIGludGVycG9sYXRpb24sIGV2YWx1YXRpb24gb3IgZXNjYXBpbmcgcmVnZXgsIHdlIG5lZWQgb25lIHRoYXQgaXNcbiAgLy8gZ3VhcmFudGVlZCBub3QgdG8gbWF0Y2guXG4gIHZhciBub01hdGNoID0gLyguKV4vO1xuXG4gIC8vIENlcnRhaW4gY2hhcmFjdGVycyBuZWVkIHRvIGJlIGVzY2FwZWQgc28gdGhhdCB0aGV5IGNhbiBiZSBwdXQgaW50byBhXG4gIC8vIHN0cmluZyBsaXRlcmFsLlxuICB2YXIgZXNjYXBlcyA9IHtcbiAgICBcIidcIjogICAgICBcIidcIixcbiAgICAnXFxcXCc6ICAgICAnXFxcXCcsXG4gICAgJ1xccic6ICAgICAncicsXG4gICAgJ1xcbic6ICAgICAnbicsXG4gICAgJ1xcdCc6ICAgICAndCcsXG4gICAgJ1xcdTIwMjgnOiAndTIwMjgnLFxuICAgICdcXHUyMDI5JzogJ3UyMDI5J1xuICB9O1xuXG4gIHZhciBlc2NhcGVyID0gL1xcXFx8J3xcXHJ8XFxufFxcdHxcXHUyMDI4fFxcdTIwMjkvZztcblxuICAvLyBKYXZhU2NyaXB0IG1pY3JvLXRlbXBsYXRpbmcsIHNpbWlsYXIgdG8gSm9obiBSZXNpZydzIGltcGxlbWVudGF0aW9uLlxuICAvLyBVbmRlcnNjb3JlIHRlbXBsYXRpbmcgaGFuZGxlcyBhcmJpdHJhcnkgZGVsaW1pdGVycywgcHJlc2VydmVzIHdoaXRlc3BhY2UsXG4gIC8vIGFuZCBjb3JyZWN0bHkgZXNjYXBlcyBxdW90ZXMgd2l0aGluIGludGVycG9sYXRlZCBjb2RlLlxuICBfLnRlbXBsYXRlID0gZnVuY3Rpb24odGV4dCwgZGF0YSwgc2V0dGluZ3MpIHtcbiAgICB2YXIgcmVuZGVyO1xuICAgIHNldHRpbmdzID0gXy5kZWZhdWx0cyh7fSwgc2V0dGluZ3MsIF8udGVtcGxhdGVTZXR0aW5ncyk7XG5cbiAgICAvLyBDb21iaW5lIGRlbGltaXRlcnMgaW50byBvbmUgcmVndWxhciBleHByZXNzaW9uIHZpYSBhbHRlcm5hdGlvbi5cbiAgICB2YXIgbWF0Y2hlciA9IG5ldyBSZWdFeHAoW1xuICAgICAgKHNldHRpbmdzLmVzY2FwZSB8fCBub01hdGNoKS5zb3VyY2UsXG4gICAgICAoc2V0dGluZ3MuaW50ZXJwb2xhdGUgfHwgbm9NYXRjaCkuc291cmNlLFxuICAgICAgKHNldHRpbmdzLmV2YWx1YXRlIHx8IG5vTWF0Y2gpLnNvdXJjZVxuICAgIF0uam9pbignfCcpICsgJ3wkJywgJ2cnKTtcblxuICAgIC8vIENvbXBpbGUgdGhlIHRlbXBsYXRlIHNvdXJjZSwgZXNjYXBpbmcgc3RyaW5nIGxpdGVyYWxzIGFwcHJvcHJpYXRlbHkuXG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICB2YXIgc291cmNlID0gXCJfX3ArPSdcIjtcbiAgICB0ZXh0LnJlcGxhY2UobWF0Y2hlciwgZnVuY3Rpb24obWF0Y2gsIGVzY2FwZSwgaW50ZXJwb2xhdGUsIGV2YWx1YXRlLCBvZmZzZXQpIHtcbiAgICAgIHNvdXJjZSArPSB0ZXh0LnNsaWNlKGluZGV4LCBvZmZzZXQpXG4gICAgICAgIC5yZXBsYWNlKGVzY2FwZXIsIGZ1bmN0aW9uKG1hdGNoKSB7IHJldHVybiAnXFxcXCcgKyBlc2NhcGVzW21hdGNoXTsgfSk7XG5cbiAgICAgIGlmIChlc2NhcGUpIHtcbiAgICAgICAgc291cmNlICs9IFwiJytcXG4oKF9fdD0oXCIgKyBlc2NhcGUgKyBcIikpPT1udWxsPycnOl8uZXNjYXBlKF9fdCkpK1xcbidcIjtcbiAgICAgIH1cbiAgICAgIGlmIChpbnRlcnBvbGF0ZSkge1xuICAgICAgICBzb3VyY2UgKz0gXCInK1xcbigoX190PShcIiArIGludGVycG9sYXRlICsgXCIpKT09bnVsbD8nJzpfX3QpK1xcbidcIjtcbiAgICAgIH1cbiAgICAgIGlmIChldmFsdWF0ZSkge1xuICAgICAgICBzb3VyY2UgKz0gXCInO1xcblwiICsgZXZhbHVhdGUgKyBcIlxcbl9fcCs9J1wiO1xuICAgICAgfVxuICAgICAgaW5kZXggPSBvZmZzZXQgKyBtYXRjaC5sZW5ndGg7XG4gICAgICByZXR1cm4gbWF0Y2g7XG4gICAgfSk7XG4gICAgc291cmNlICs9IFwiJztcXG5cIjtcblxuICAgIC8vIElmIGEgdmFyaWFibGUgaXMgbm90IHNwZWNpZmllZCwgcGxhY2UgZGF0YSB2YWx1ZXMgaW4gbG9jYWwgc2NvcGUuXG4gICAgaWYgKCFzZXR0aW5ncy52YXJpYWJsZSkgc291cmNlID0gJ3dpdGgob2JqfHx7fSl7XFxuJyArIHNvdXJjZSArICd9XFxuJztcblxuICAgIHNvdXJjZSA9IFwidmFyIF9fdCxfX3A9JycsX19qPUFycmF5LnByb3RvdHlwZS5qb2luLFwiICtcbiAgICAgIFwicHJpbnQ9ZnVuY3Rpb24oKXtfX3ArPV9fai5jYWxsKGFyZ3VtZW50cywnJyk7fTtcXG5cIiArXG4gICAgICBzb3VyY2UgKyBcInJldHVybiBfX3A7XFxuXCI7XG5cbiAgICB0cnkge1xuICAgICAgcmVuZGVyID0gbmV3IEZ1bmN0aW9uKHNldHRpbmdzLnZhcmlhYmxlIHx8ICdvYmonLCAnXycsIHNvdXJjZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgZS5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cblxuICAgIGlmIChkYXRhKSByZXR1cm4gcmVuZGVyKGRhdGEsIF8pO1xuICAgIHZhciB0ZW1wbGF0ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHJldHVybiByZW5kZXIuY2FsbCh0aGlzLCBkYXRhLCBfKTtcbiAgICB9O1xuXG4gICAgLy8gUHJvdmlkZSB0aGUgY29tcGlsZWQgZnVuY3Rpb24gc291cmNlIGFzIGEgY29udmVuaWVuY2UgZm9yIHByZWNvbXBpbGF0aW9uLlxuICAgIHRlbXBsYXRlLnNvdXJjZSA9ICdmdW5jdGlvbignICsgKHNldHRpbmdzLnZhcmlhYmxlIHx8ICdvYmonKSArICcpe1xcbicgKyBzb3VyY2UgKyAnfSc7XG5cbiAgICByZXR1cm4gdGVtcGxhdGU7XG4gIH07XG5cbiAgLy8gQWRkIGEgXCJjaGFpblwiIGZ1bmN0aW9uLCB3aGljaCB3aWxsIGRlbGVnYXRlIHRvIHRoZSB3cmFwcGVyLlxuICBfLmNoYWluID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIF8ob2JqKS5jaGFpbigpO1xuICB9O1xuXG4gIC8vIE9PUFxuICAvLyAtLS0tLS0tLS0tLS0tLS1cbiAgLy8gSWYgVW5kZXJzY29yZSBpcyBjYWxsZWQgYXMgYSBmdW5jdGlvbiwgaXQgcmV0dXJucyBhIHdyYXBwZWQgb2JqZWN0IHRoYXRcbiAgLy8gY2FuIGJlIHVzZWQgT08tc3R5bGUuIFRoaXMgd3JhcHBlciBob2xkcyBhbHRlcmVkIHZlcnNpb25zIG9mIGFsbCB0aGVcbiAgLy8gdW5kZXJzY29yZSBmdW5jdGlvbnMuIFdyYXBwZWQgb2JqZWN0cyBtYXkgYmUgY2hhaW5lZC5cblxuICAvLyBIZWxwZXIgZnVuY3Rpb24gdG8gY29udGludWUgY2hhaW5pbmcgaW50ZXJtZWRpYXRlIHJlc3VsdHMuXG4gIHZhciByZXN1bHQgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gdGhpcy5fY2hhaW4gPyBfKG9iaikuY2hhaW4oKSA6IG9iajtcbiAgfTtcblxuICAvLyBBZGQgYWxsIG9mIHRoZSBVbmRlcnNjb3JlIGZ1bmN0aW9ucyB0byB0aGUgd3JhcHBlciBvYmplY3QuXG4gIF8ubWl4aW4oXyk7XG5cbiAgLy8gQWRkIGFsbCBtdXRhdG9yIEFycmF5IGZ1bmN0aW9ucyB0byB0aGUgd3JhcHBlci5cbiAgZWFjaChbJ3BvcCcsICdwdXNoJywgJ3JldmVyc2UnLCAnc2hpZnQnLCAnc29ydCcsICdzcGxpY2UnLCAndW5zaGlmdCddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIG1ldGhvZCA9IEFycmF5UHJvdG9bbmFtZV07XG4gICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBvYmogPSB0aGlzLl93cmFwcGVkO1xuICAgICAgbWV0aG9kLmFwcGx5KG9iaiwgYXJndW1lbnRzKTtcbiAgICAgIGlmICgobmFtZSA9PSAnc2hpZnQnIHx8IG5hbWUgPT0gJ3NwbGljZScpICYmIG9iai5sZW5ndGggPT09IDApIGRlbGV0ZSBvYmpbMF07XG4gICAgICByZXR1cm4gcmVzdWx0LmNhbGwodGhpcywgb2JqKTtcbiAgICB9O1xuICB9KTtcblxuICAvLyBBZGQgYWxsIGFjY2Vzc29yIEFycmF5IGZ1bmN0aW9ucyB0byB0aGUgd3JhcHBlci5cbiAgZWFjaChbJ2NvbmNhdCcsICdqb2luJywgJ3NsaWNlJ10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgbWV0aG9kID0gQXJyYXlQcm90b1tuYW1lXTtcbiAgICBfLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHJlc3VsdC5jYWxsKHRoaXMsIG1ldGhvZC5hcHBseSh0aGlzLl93cmFwcGVkLCBhcmd1bWVudHMpKTtcbiAgICB9O1xuICB9KTtcblxuICBfLmV4dGVuZChfLnByb3RvdHlwZSwge1xuXG4gICAgLy8gU3RhcnQgY2hhaW5pbmcgYSB3cmFwcGVkIFVuZGVyc2NvcmUgb2JqZWN0LlxuICAgIGNoYWluOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX2NoYWluID0gdHJ1ZTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvLyBFeHRyYWN0cyB0aGUgcmVzdWx0IGZyb20gYSB3cmFwcGVkIGFuZCBjaGFpbmVkIG9iamVjdC5cbiAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fd3JhcHBlZDtcbiAgICB9XG5cbiAgfSk7XG5cbn0pLmNhbGwodGhpcyk7XG4iXX0=
;