const { override, addPostcssPlugins } = require('customize-cra');

module.exports = override(
  addPostcssPlugins([
     require("postcss-px2rem")({ remUnit: 37.5 })
  ])
);
