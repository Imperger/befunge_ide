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
}
});
