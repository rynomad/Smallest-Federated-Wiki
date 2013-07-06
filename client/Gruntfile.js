module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-coffee');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-manifest');

  grunt.initConfig({
    browserify: {
      client: {
        src: ['client.coffee'],
        dest: 'client.js',
        options: {
          transform: ['coffeeify']
        }
      },
      testClient: {
        src: ['testclient.coffee', 'plugins/*/test.coffee'],
        dest: 'test/testclient.js',
        options: {
          transform: ['coffeeify'],
          debug: true
        }
      }
    },

    coffee: {
      plugins: {
        expand: true,
        src: ['plugins/**/*.coffee'],
        ext: '.js'
      } 
    },
    
    manifest: {
      generate: {
        options: {
          basePath: "/",
          cache: [
            'js/jquery.ie.cors.js',
            'js/jquery.ui.touch-punch.min.js',
            'js/jquery-1.6.2.min.js',
            'js/jquery-1.7.1.min.js',
            'js/jquery-1.9.1.min.js',
            'js/jquery-migrate-1.1.1.min.js',
            'js/jquery-ui-1.8.16.custom.css',
            'js/jquery-ui-1.8.16.custom.min.js',
            'js/jquery-ui-1.10.1.custom.min.css',
            'js/jquery-ui-1.10.1.custom.min.js',
            'js/modernizr.custom.63710.js',
            'js/sockjs-0.3.min.js',
            'js/underscore-min.js',
            'plugins/factory/factory.js',
            'plugins/pagefold/pagefold.js',
            'plugins/code/code.js',
            'style.css',
            'client.js'
          ],
          network: ["http://*", "https://*"],
          preferOnline: true,
          timestamp: true
        },
        src: [
          "style.css",
          "js/*.js",
          'plugins/**/*.js',
          "../client.js"
        ],
        dest: "manifest.appcache"
      }
    },
    
    watch: {
      all: {
        files: [
          '<%= browserify.testClient.src %>',
          '<%= browserify.client.src %>',
          '<%= coffee.plugins.src %>',
          'lib/**/*.coffee'
        ],
        tasks: ['browserify', 'coffee', 'manifest']
      }
    }
  });

  grunt.registerTask('build', ['browserify', 'coffee', 'manifest']);
  grunt.registerTask('default', ['build']);

};
