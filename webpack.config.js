const path = require('path');

module.exports = {
    mode: 'development',
    entry: {
        index: './src/example.ts',
    },
    devtool: 'inline-source-map', // Change this in production to 'source-map'
    devServer: {
        static: './dist',
    },
    module: {
        rules: [
          {
            test: /\.ts$/,
            include: [path.resolve(__dirname, 'src')],
            use: 'ts-loader',
          }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    }
}