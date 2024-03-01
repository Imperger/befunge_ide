const fs = require('fs');

const { defineConfig } = require('@vue/cli-service');

module.exports = defineConfig({
  transpileDependencies: true, 
  publicPath: process.env.NODE_ENV === 'production'
    ? '/befunge_ide/'
    : '/',
  configureWebpack: {
    module: {
        rules: [
            {
                test: /\.(vert|frag)$/,
                loader: 'ts-shader-loader'
            }
        ]
    }
},
devServer: {
  host: '0.0.0.0',
  allowedHosts: "all",
  server: {
    type: 'https',
    options: {
      key: fs.readFileSync('./certs/dev.key'),
      cert: fs.readFileSync('./certs/dev.cer')
    }
  }
}
});
