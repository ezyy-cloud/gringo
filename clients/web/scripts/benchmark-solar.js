// Benchmark script for comparing solar calculation performance
import { getSolarTimes, benchmarkSolarCalculations } from '../src/utils/solarUtils.js';

// Sample locations around the world for testing
const testLocations = [
  { name: 'New York', latitude: 40.7128, longitude: -74.0060 },
  { name: 'London', latitude: 51.5074, longitude: -0.1278 },
  { name: 'Tokyo', latitude: 35.6762, longitude: 139.6503 },
  { name: 'Sydney', latitude: -33.8688, longitude: 151.2093 },
  { name: 'Cape Town', latitude: -33.9249, longitude: 18.4241 },
  { name: 'Arctic Circle', latitude: 66.5, longitude: 20.0 },
  { name: 'Antarctic Circle', latitude: -66.5, longitude: 20.0 }
];

// Run benchmark for all locations
console.log('Running solar calculation benchmarks...');
console.log('=======================================');

// Get current date
const now = new Date();

// Run basic test to ensure calculations work correctly
console.log('Basic test results:');
console.log('------------------');
for (const location of testLocations) {
  try {
    const solarTimes = getSolarTimes(now, location.latitude, location.longitude);
    console.log(`${location.name}: Sunrise: ${solarTimes.sunrise.toLocaleTimeString()}, Sunset: ${solarTimes.sunset.toLocaleTimeString()}`);
  } catch (error) {
    console.error(`Error calculating solar times for ${location.name}:`, error);
  }
}

console.log('\nPerformance benchmark:');
console.log('---------------------');

// Run performance benchmark for each location
for (const location of testLocations) {
  try {
    const benchmark = benchmarkSolarCalculations(location.latitude, location.longitude);
    console.log(`${location.name}: ${benchmark.executionTime.toFixed(2)}ms total for 100 calculations (${benchmark.calculationsPerSecond.toFixed(2)} calcs/sec)`);
  } catch (error) {
    console.error(`Error benchmarking ${location.name}:`, error);
  }
}

console.log('\nBenchmark complete!'); 