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
    },
    
    manifest: {
      generate: {
        options: {
          network: ['http://*', 'https://*'],
          fallback: ['/manifest.appcache'],
          exclude: ['js/jquery.min.js'],
          preferOnline: true,
          verbose: true,
          timestamp: true
        },
        src: [
          'js/*.min.js',
          'js/*.js',
          'client.js',
          'plugins/**/*.js',
          'plugins/*.js',
          '*.css'
        ],
        dest: 'manifest.appcache'
      }
    }
  });

  grunt.registerTask('build', ['browserify', 'coffee', 'manifest']);
  grunt.registerTask('default', ['build']);

};
