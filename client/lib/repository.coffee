### Page Mirroring with IndexedDB ###
# For Offline mode, we mirror all pages in the browsers IndexedDB using IDBWrapper (https://github.com/jensarps/IDBWrapper)

revision = require './revision.coffee'
plugin = require('./plugin.coffee')
module.exports = repo = {}


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
  onStoreReady: () ->
    ###
    repo.ready = true
    $.get('/system/sitemap.json', (sitemap) -> 
        status.get(1, (favicon) ->
          for entry in sitemap
            $.get("/#{entry.slug}.json", (json) ->
              json.favicon = favicon.dataUrl
              content = json
              content.page = wiki.asSlug(json.title) + '.json'
              repo.update(json)
            )
        )
    )       
    ###
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
        #console.log "favicon not found, generating..."
        plugin.get 'favicon', (favicon) ->
          favicon.create(status, repo)
    onError = () ->
      #console.log "favicon not found, generating..."
      plugin.get 'favicon', (favicon) ->
        favicon.create(status, repo)
    status.get(1, onSuccess, onError)
}

repo.update = (json) ->
  repository = new IDBStore(pageStoreOpts, () ->
    console.log json.page
    console.log repository
    repository.put({name: json.page})
    page = new IDBStore({
      dbVersion: 1,
      storeName: "page/#{json.page}",
      keyPath: 'version',
      autoIncrement: false,
      onStoreReady: () ->
        json.version = json.journal[json.journal.length - 1].date
        for version in json.excludes
          page.remove (version)
        page.put json
    })
  )

repo.getTwin = (slug, version, whenGotten) ->

#Check to see if a page is in the repository, and perform the appropriate callback
repo.check = (pageInformation, whenGotten, whenNotGotten) ->
  console.log pageInformation
  page = new IDBStore({
    dbVersion: 1,
    storeName: "page/#{pageInformation.slug}.json",
    keyPath: 'version',
    autoIncrement: false,
    onStoreReady: () ->
      pageDisplayed = false
      onItem = (page, cursor, transaction) ->
        if pageDisplayed == false
          page = revision.create pageInformation.rev, page if pageInformation.rev
          whenGotten(page, 'local')
          pageDisplayed = true
        #else
        # pushToTwins
      if pageInformation.version?
        console.log 'requesting specific version'
        page.get(pageInformation.version, (page) ->
          whenGotten(page, 'local')
        )
      else
        page.iterate(onItem, {
          order: 'DESC',
          onEnd: () ->
            console.log "page not found in Repository"
            for face in interfaces.active
              console.log face.prefixURI
              name = new Name( face.prefixURI + '/page/' + pageInformation.slug + '.json')
              interest = new Interest(name)
              template = {}
              exclusions = []
            
              getClosure = new ContentClosure(face, name, interest, (data) ->
                if data?
                  console.log data
                  if pageDisplayed == false
                    whenGotten(JSON.parse(data), 'local') 
                    pageDisplayed = true
                  json = JSON.parse(data)
                  json.version = json.journal[json.journal.length - 1].date
                  repo.update json
                  recursiveClosure = new ContentClosure(face, name, interest, (data) ->
                    if data?
                      json = JSON.parse(data)
                      repo.update json
                      console.log 'got another version', json
                      for entry in json.excludes
                        string = entry + ''
                        exclusions.push DataUtils.toNumbersFromString(string)
                      template.exclude = new Exclude(exclusions)
                      console.log exclusions
                      interest.exclude = template.exclude
                      face.expressInterest(name, recursiveClosure, template)
                  )
                  face.expressInterest(name, recursiveClosure)
                else
                  whenNotGotten() if pageDisplayed == false
              )
              face.expressInterest(name, getClosure)
        })
  })

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

repo.getPage = (slug, callback) ->
  page = new IDBStore({
      dbVersion: 1,
      storeName: "page/#{slug}",
      keyPath: 'version',
      autoIncrement: false,
      onStoreReady: () ->
        pages = []
        onItem = (content, cursor, transaction) ->
          if content.page == slug
            console.log content
            found = true
            page = content
            pages.push(page)
        onCheckEnd = () ->
            done = true
            callback pages
        page.iterate(onItem, {
          order: 'DESC',
          onEnd: onCheckEnd        
        })
  })
  
  
status = new IDBStore(statusOpts)
repository = new IDBStore(pageStoreOpts)


# Take a page JSON object and convert it to an entry with string uri and NDN contentObject
# TODO: segmentation and timestamping

