const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: './src/app.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/[name].[contenthash].js',
    clean: true,
  },
  resolve: { extensions: ['.ts', '.js'] },
  module: {
    rules: [
      { test: /\.ts$/, exclude: /node_modules/, use: 'ts-loader' },
      {
        test: /\.s[ac]ss$/i,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'sass-loader',
            options: { sassOptions: { quietDeps: true } },
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './index.html' }),
    new MiniCssExtractPlugin({ filename: 'css/[name].[contenthash].css' }),
  ],
  devServer: {
    static: { directory: path.join(__dirname, 'dist') },
    port: 9000,
    hot: true,
    open: true,
  },
};
