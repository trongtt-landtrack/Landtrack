const fs = require('fs');
const sizeOf = require('image-size');
const dimensions = sizeOf('public/logo.png');
console.log(dimensions.width, dimensions.height);
