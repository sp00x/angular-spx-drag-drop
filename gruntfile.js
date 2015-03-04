module.exports = function (grunt)
{
  grunt.initConfig(
  {
    uglify:
    {
      default:
      {
        files:
        {
          'src/spx-drag-drop.min.js': 'src/spx-drag-drop.js'
        },
        options:
        {
          sourceMap: 'src/spx-drag-drop.min.map',
          sourceMappingURL: 'src/spx-drag-drop.min.map',
          preserveComments: 'some',
          compress:
          {
            global_defs:
            {
              "DEBUG": false
            },
            dead_code: true
          }
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('default', ['uglify']);
}