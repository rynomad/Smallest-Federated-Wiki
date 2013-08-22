createSynopsis = require './synopsis.coffee'

wiki = { createSynopsis }

wiki.log = (things...) ->
  console.log things... if console?.log?

wiki.asSlug = (name) ->
  name.replace(/\s/g, '-').replace(/[^A-Za-z0-9-]/g, '').toLowerCase()


wiki.useLocalStorage = ->
  $(".login").length > 0

wiki.resolutionContext = []

wiki.resolveFrom = (addition, callback) ->
  wiki.resolutionContext.push addition
  try
    callback()
  finally
    wiki.resolutionContext.pop()

wiki.getData = (vis) ->
  if vis
    idx = $('.item').index(vis)
    who = $(".item:lt(#{idx})").filter('.chart,.data,.calculator').last()
    if who? then who.data('item').data else {}
  else
    who = $('.chart,.data,.calculator').last()
    if who? then who.data('item').data else {}

wiki.getDataNodes = (vis) ->
  if vis
    idx = $('.item').index(vis)
    who = $(".item:lt(#{idx})").filter('.chart,.data,.calculator').toArray().reverse()
    $(who)
  else
    who = $('.chart,.data,.calculator').toArray().reverse()
    $(who)

wiki.createPage = (name, loc, version) ->
  site = loc if loc and loc isnt 'view'
  console.log version
  $page = $ """
    <div class="page" id="#{name}">
      <div class="twins"> <p> </p> </div>
      <div class="header">
        <h1> <img class="favicon" src="#{ if site then "//#{site}" else "" }/favicon.png" height="32px"> #{name} </h1>
      </div>
    </div>
  """
  $page.data('version', version) if version
  $page.find('.page').attr('data-site', site) if site
  console.log $page.find('.page').data('version')
  $page

wiki.getItem = (element) ->
  $(element).data("item") or $(element).data('staticItem') if $(element).length > 0

wiki.resolveLinks = (string) ->
  renderInternalLink = (match, name) ->
    # spaces become 'slugs', non-alpha-num get removed
    slug = wiki.asSlug name
    if interfaces != 'server'
      for face in interfaces.active
        pageURI = face.prefixURI + '/page/' + slug + '.json'
        ccnName = new Name(pageURI)
        interest = new Interest(ccnName)
        interest.childSelector = 1
        template = {}
        template.childSelector = interest.childSelector
        closure = new ContentClosure(face, ccnName, interest, wiki.repo.updatePage)
        face.expressInterest(ccnName, closure, template)  
    
    "<a class=\"internal\" href=\"/#{slug}.html\" data-page-name=\"#{slug}\" title=\"#{wiki.resolutionContext.join(' => ')}\">#{name}</a>"
  string
    .replace(/\[\[([^\]]+)\]\]/gi, renderInternalLink)
    .replace(/\[(http.*?) (.*?)\]/gi, """<a class="external" target="_blank" href="$1" title="$1" rel="nofollow">$2 <img src="/images/external-link-ltr-icon.png"></a>""")

module.exports = wiki

