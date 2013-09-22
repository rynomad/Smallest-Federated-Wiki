### Page Mirroring with IndexedDB ###
# For Offline mode, we mirror all pages in the browsers IndexedDB using IDBWrapper (https://github.com/jensarps/IDBWrapper)

revision = require './revision.coffee'
plugin = require './plugin.coffee'
module.exports = wiki.repo = repo = {}


pageToContentObject = (json) ->
  slug = wiki.asSlug(json.title)
  name = new Name(slug)
  signed = new SignedInfo()
  content = {}
  content.object= new ContentObject(name, signed, json, new Signature())
  content.object.sign()
  content.page = slug
  return content

repo.favicon = ''



#Define the page Object Store,  
pageStoreOpts = {
  dbVersion: 1,
  storeName: "page",
  autoIncrement: true,
  indexes: [
    {name: "name", unique: true}
  ]
}

statusOpts= {
  dbVersion: 1,
  storeName: "status",
  keypath: 'id',
  autoincrement: true,
  indexes: [
    { name: 'type', unique: false, multiEntry: false }
  ],
  onStoreReady: () ->
    onSuccess = (item) ->
      if item?
        repo.favicon = item.dataUrl
        console.log item
      else
        console.log "222favicon not found, generating..."
        plugin.get 'favicon', (favicon) ->
          favicon.create(status, repo)
    onError = () ->
      console.log "111favicon not found, generating..."
      plugin.get 'favicon', (favicon) ->
        favicon.create(status, repo)
    status.get(1, onSuccess, onError)
}
repo.getSitemap = (whenGotten) ->
  sitemap = new IDBStore({
    dbVersion: 1,
    storeName: "system/sitemap.json",
    keyPath: 'version',
    autoIncrement: false,
    onStoreReady: () ->
      onsitemaps = (sitemaps) ->
        console.log sitemaps[0]
        whenGotten(sitemaps[sitemaps.length-1])
      sitemap.getAll(onsitemaps)
  })

repo.updateSitemap = () ->
  fetchPages = (pages) ->
    for page in pages
      console.log page
      sitemap.list.push(page.name)
    
      sitemaps = new IDBStore({
        dbVersion: 1,
        storeName: "system/sitemap.json",
        keyPath: "version",
        autoIncrement: false,
        onStoreReady: () ->
          onItem = (data) ->
            sitemaps.remove(data.version)
          sitemaps.iterate(onItem,{
            order: 'DESC',
            onEnd: () ->
              sitemaps.put(sitemap)
              console.log "put sitemap"
          })
      })
    repository.getAll(fetchPages)
    console.log 'there'
  

wiki.repo.updatePageFromPeer = (json) ->
  if json?
    repository = new IDBStore(pageStoreOpts, () ->
      console.log json.page
      console.log repository
      onSuccess = () ->
        console.log "success!"
      onError = () ->
        console.log "already got page!"
      repository.put({name: json.page}, onSuccess, onError )
      page = new IDBStore({
        dbVersion: 1,
        storeName: "page/#{json.page}",
        keyPath: 'version',
        autoIncrement: false,
        onStoreReady: () ->
          json.version = json.journal[json.journal.length - 1].date
          for version in json.excludes
            page.remove (version)
          console.log "putting", json
          onSuccess = () ->
            console.log "successfully put ", json
            wiki.emitTwins($("##{wiki.asSlug(json.title)}"))
            if $(".#{wiki.asSlug(json.title)}").hasClass("ghost")
              console.log "updated ghost page"
              wiki.buildPage(json, null, $(".#{wiki.asSlug(json.title)}"))
              $(".#{wiki.asSlug(json.title)}").removeClass("ghost")
          page.put json, onSuccess
          
      })
    )


repo.sendUpdateNotifier = (json) ->
  for face in interfaces.active
    prefix = wiki.urlToPrefix(face.host)
    uri = prefix + "/page/update/" + json.page + '/' + json.version
    name = new Name(uri)
    template = {}
    template.childSelector = 1
    interest = new Interest(name)
    interest.childSelector = 1
    closure = new ContentClosure(face, name, interest, wiki.repo.updatePageFromPeer)
    face.expressInterest(name, closure, template)

wiki.repo.updatePage = (json) ->
  if json?
    repository = new IDBStore(pageStoreOpts, () ->
      console.log json.page
      console.log repository
      onSuccess = () ->
        console.log "success!"
      onError = () ->
        console.log "already got page!"
      repository.put({name: json.page}, onSuccess, onError )
      page = new IDBStore({
        dbVersion: 1,
        storeName: "page/#{json.page}",
        keyPath: 'version',
        autoIncrement: false,
        onStoreReady: () ->
          json.version = json.journal[json.journal.length - 1].date
          for version in json.excludes
            page.remove (version)
          console.log "updating ", json.title
          onSuccess = () ->
            wiki.emitTwins($("##{wiki.asSlug(json.title)}"))
            if $(".#{wiki.asSlug(json.title)}").hasClass("ghost")
              console.log "updated ghost page"
              wiki.buildPage(json, null, $(".#{wiki.asSlug(json.title)}"))
              $(".#{wiki.asSlug(json.title)}").removeClass("ghost")
            if navigator.onLine == true
              console.log "online: successfully updated ", json.title, ", sending update notifier."
              repo.sendUpdateNotifier(json)
            else
              console.log "offline: successfully updated ", json.title, " locally."
          page.put json, onSuccess
          
      })
    )


repo.getTwins = (slug, callback) ->
  twins = new IDBStore ({
    dbVersion: 1,
    storeName: "page/#{slug}.json",
    keyPath: 'version',
    autoIncrement: false,
    onStoreReady: () ->
      console.log twins
      twins.getAll(callback)
      console.log 'got here'
  })

repo.getPage = (pageInformation, whenGotten, whenNotGotten) ->
  page = new IDBStore({
    dbVersion: 1,
    storeName: "page/#{pageInformation.slug}.json",
    keyPath: 'version',
    autoIncrement: false,
    onStoreReady: () ->
      name = "/localhost/page/#{pageInformation.slug}.json"
      if pageInformation.version?
        console.log 'requesting specific version', pageInformation
        page.get(pageInformation.version, (page) ->
          console.log page
          whenGotten(page)
        )
      else
        found = false
        onItem1 = (content, cursor, transaction) ->
          console.log content
          if content != null
            if content.favicon == repo.favicon
              if found == false
                found = true
                whenGotten(content)
        onItem2 = (content, cursor, transaction) ->
          if content != null
            if found == false
              found = true
              whenGotten(content)
        onCheckEnd1 = () ->
          if found == false
            console.log 'found: ', found
            page.iterate(onItem2, {
              order: 'DESC',
              onEnd: onCheckEnd2
            })
        onCheckEnd2 = () ->
          if found == false
            console.log 'Didnt Find Page!'
            whenNotGotten() if whenNotGotten?
        page.iterate(onItem1, {
          order: 'DESC',
          onEnd: onCheckEnd1()
        })
  })


status = new IDBStore(statusOpts)
repository = new IDBStore(pageStoreOpts, () ->
  ###
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
  ###
)
# Take a page JSON object and convert it to an entry with string uri and NDN contentObject
# TODO: segmentation and timestamping

