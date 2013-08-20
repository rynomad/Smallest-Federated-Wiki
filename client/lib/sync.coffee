# Synchronize pageStore with all other connected Clients

require './interfaces.coffee'
repository = require './repository.coffee'



wiki.urlToPrefix = (url) ->
  prefix = ''
  hostComponents = url.split('.')
  for component in hostComponents
    if component != 'www'
      if component != 'http://www'
        if component != 'http://'
          prefix = "/#{component}" + prefix
  return prefix

getPagesFromSitemap = (face, sitemap) ->
  facePrefix = urlToPrefix(face.host)
  for page in sitemap.list
    nameUri = facePrefix + '/page/' + page
    name = new Name(nameUri)
    fetchAllOnFace face, 'page', name
    console.log name
     

fetchAllOnFace = (face, type, name) ->
  interest = new Interest(name)
  template = {}
  exclusions = []
  recursiveCallback = (data) ->
    if data?
      console.log "got data ", data
      json = JSON.parse(data)
      if type == 'sitemap'
        console.log json
        getPagesFromSitemap(face, json)
        string = json.version + ''
        console.log string
        exclusions.push DataUtils.toNumbersFromString(string)
      else if type == 'page'
        console.log 'gggggggggggggggggggggggooooooooooooooooooooooooot pppppppppppppppppppppp', json
        repository.updatePage(json)
        for entry in json.excludes
          string = entry + ''
          exclusions.push DataUtils.toNumbersFromString(string)
      template.exclude = new Exclude(exclusions)
      console.log exclusions
      interest.exclude = template.exclude
      recursiveClosure = new ContentClosure(face, name, interest, recursiveCallback)
      face.expressInterest(name, recursiveClosure, template)
    else
      console.log "interest timed out for ", type, name
      if type == 'sitemap'
        recursiveClosure = new ContentClosure(face, name, interest, recursiveCallback)
        face.expressInterest(name, recursiveClosure, template)
  
  recursiveClosure = new ContentClosure(face, name, interest, recursiveCallback)
  face.expressInterest(name, recursiveClosure)

module.exports = sync = () ->
  for face in interfaces.active
    prefix = wiki.urlToPrefix(face.host)
    sitemapUri = prefix + "/system/sitemap.json"
    console.log sitemapUri
    sitemapName = new Name(sitemapUri)
    fetchAllOnFace(face, 'sitemap', sitemapName)
    
interfaces.registerFace('localhost')

