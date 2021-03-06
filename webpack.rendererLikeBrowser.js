const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const AngularCompilerPlugin = require('@ngtools/webpack').AngularCompilerPlugin;

const common = {
    module: {
        rules: [
            // {
            //     test: /\.ts$/,
            //     enforce: 'pre',
            //     loader: 'tslint-loader',
            // },
            {
                test: /(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/,
                loader: '@ngtools/webpack',
            },
            {
                test: /\.(jpe?g|png|gif|svg)$/i,
                exclude: /.*(fontawesome-webfont)\.svg/,
                use: [{
                    loader: 'file-loader',
                    options: {
                        name: '[name].[ext]',
                        outputPath: 'images/',
                    },
                }],
            },
        ],
    },
    plugins: [
        // new CleanWebpackPlugin([
        //     path.resolve(__dirname, 'build-web/*'),
        // ]),
        // new CopyWebpackPlugin([
        //     './src/package.json',
        //     { from: './src/images', to: 'images' },
        //     { from: './src/locales', to: 'locales' },
        // ]),
    ],
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        alias: {
            'electron'                                                     : path.resolve(__dirname, 'src/app/browser/mock-electron'),
            'jslib/electron/services/electronRendererMessaging.service'    : path.resolve(__dirname, 'src/app/browser/browserMessaging.service'),
            'jslib/electron/services/electronPlatformUtils.service'        : path.resolve(__dirname, 'src/app/browser/browserPlatformUtils.service'),
            'jslib/electron/services/electronRendererSecureStorage.service': path.resolve(__dirname, 'src/app/browser/browserStorage.service'),
            'jslib/electron/services/electronStorage.service'              : path.resolve(__dirname, 'src/app/browser/browserStorage.service'),
            'jslib/electron/services/electronLog.service'                  : path.resolve(__dirname, 'src/app/browser/consoleLog.service'),
            'jslib/abstractions/platformUtils.service'                     : path.resolve(__dirname, 'src/app/browser/platformUtils.service.abstraction'),
            'jslib/src/abstractions/platformUtils.service'                 : path.resolve(__dirname, 'src/app/browser/platformUtils.service.abstraction'),
            'browser/functionForTarget._showDialog'                        : path.resolve(__dirname, 'src/app/browser/functionForTarget._showDialog.browser'),
            '../services/nativeMessaging.service'                          : path.resolve(__dirname, 'src/app/browser/mock-nativeMessagingService'),
            '../services/i18n.service'                                     : path.resolve(__dirname, 'src/app/browser/i18n.service'),
            jslib: path.join(__dirname, 'jslib/src'),
        },
        symlinks: false,
        modules: [path.resolve('node_modules')],
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'build'),
    },
};

const renderer = {
    mode: 'production',
    devtool: false,
    target: 'electron-renderer',
    node: {
        __dirname: false,
    },
    entry: {
        'app/main': './src/app/main.ts',
    },
    optimization: {
        minimize: false,
        splitChunks: {
            cacheGroups: {
                commons: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'app/vendor',
                    chunks: (chunk) => {
                        return chunk.name === 'app/main';
                    },
                },
            },
        },
    },
    module: {
        rules: [
            {
                test: /\.(html)$/,
                loader: 'html-loader',
            },
            {
                test: /.(ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
                exclude: /loading.svg/,
                use: [{
                    loader: 'file-loader',
                    options: {
                        name: '[name].[ext]',
                        outputPath: 'fonts/',
                    },
                }],
            },
            {
                test: /\.scss$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            publicPath: '../',
                        },
                    },
                    'css-loader',
                    'sass-loader',
                ],
            },
            // Hide System.import warnings. ref: https://github.com/angular/angular/issues/21560
            {
                test: /[\/\\]@angular[\/\\].+\.js$/,
                parser: { system: true },
            },
        ],
    },
    plugins: [
        new AngularCompilerPlugin({
            tsConfigPath: './tsconfig-browser.json',
            entryModule: 'src/app/app.module#AppModule',
            sourceMap: true,
        }),
        // ref: https://github.com/angular/angular/issues/20357
        new webpack.ContextReplacementPlugin(/\@angular(\\|\/)core(\\|\/)fesm5/,
            path.resolve(__dirname, './src')),
        new HtmlWebpackPlugin({
            template: './src/index.html',
            filename: 'index.html',
            chunks: ['app/vendor', 'app/main'],
        }),
        new webpack.SourceMapDevToolPlugin({
            include: ['app/main.js'],
        }),
        new MiniCssExtractPlugin({
            filename: '[name].[hash].css',
            chunkFilename: '[id].[hash].css',
        }),
    ],
};

module.exports = merge(common, renderer);
