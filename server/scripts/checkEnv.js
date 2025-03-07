const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

console.log('Checking environment variables:');
console.log('----------------------------------------');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Defined' : 'MISSING!');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Defined' : 'MISSING!');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL ? 'Defined' : 'MISSING!');
console.log('----------------------------------------');

// Print masked version of MONGODB_URI for debugging
if (process.env.MONGODB_URI) {
  const uri = process.env.MONGODB_URI;
  const maskedUri = uri.replace(/:([^:@]+)@/, ':********@');
  console.log('Masked MONGODB_URI:', maskedUri);
} else {
  console.log('MONGODB_URI is not defined in the .env file');
}

console.log('\nEnvironment variables file located at:', path.resolve(__dirname, '../.env'));
console.log('Current working directory:', process.cwd()); 