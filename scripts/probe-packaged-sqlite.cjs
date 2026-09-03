const nativeModulePath = process.argv[2];

if (!nativeModulePath) {
  throw new Error("Native module path argument is required.");
}

require(nativeModulePath);
console.log(`Loaded packaged native module: ${nativeModulePath}`);
