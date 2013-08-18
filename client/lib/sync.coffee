# Synchronize pageStore with all other connected Clients


repository = require './repository.coffee'

module.exports = sync = {}

urlToPrefix = (url) ->
  prefix = ''
  hostComponents = url.split('.')
  for component in hostComponents
    if component != 'www'
      if component != 'http://www'
        if component != 'http://'
          prefix = "/#{component}" + prefix
  return prefix

sync.getPagesFromSitemap = (face, sitemap) ->
  facePrefix = urlToPrefix(face.host)
  for page in sitemap
    nameUri = facePrefix + '/page/' + page.slug + '.json/' + page.date
    name = new Name(nameUri)
    sync.fetchAllOnFace face, 'page', name
     

sync.fetchAllOnFace = (face, type, name) ->
  interest = new Interest(name)
  template = {}
  exclusions = []
  recursiveClosure = new ContentClosure(face, name, interest, (data) ->
    if data?
      console.log "got data ", data
      json = JSON.parse(data)
      if type == 'sitemap'
        getPagesFromSitemap(face, json)
        string = json.date + ''
        exclusions.push DataUtils.toNumbersFromString(string)
      else if type == 'page'
        console.log json
        repository.updatePage(json)
        for entry in json.excludes
          string = entry + ''
          exclusions.push DataUtils.toNumbersFromString(string)
      template.exclude = new Exclude(exclusions)
      console.log exclusions
      interest.exclude = template.exclude
      face.expressInterest(name, recursiveClosure, template)
    else
      console.log "interest timed out for ", type, name
  )
  face.expressInterest(name, recursiveClosure)

sync.getSitemapsOnFace = (face) ->
  prefix = urlToPrefix(face.host)
  sitemapUri = prefix + "/system/sitemap.json"
  console.log sitemapUri
  sitemapName = new Name(sitemapUri)
  sync.fetchAllOnFace(face, 'sitemap', sitemapName)

