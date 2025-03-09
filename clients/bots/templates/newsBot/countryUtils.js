/**
 * Country Codes Utility for NewsBot
 * 
 * Contains all country codes supported by the NewsData API and
 * utilities to manage rotation through countries for news fetching.
 */

// All supported country codes by NewsData API
const ALL_COUNTRY_CODES = [
  'af', 'al', 'dz', 'ad', 'ao', 'ar', 'am', 'au', 'at', 'az', 
  'bs', 'bh', 'bd', 'bb', 'by', 'be', 'bz', 'bj', 'bm', 'bt', 
  'bo', 'ba', 'bw', 'br', 'bn', 'bg', 'bf', 'bi', 'kh', 'cm', 
  'ca', 'cv', 'ky', 'cf', 'td', 'cl', 'cn', 'co', 'km', 'cg', 
  'ck', 'cr', 'hr', 'cu', 'cw', 'cy', 'cz', 'dk', 'dj', 'dm', 
  'do', 'cd', 'ec', 'eg', 'sv', 'gq', 'er', 'ee', 'sz', 'et', 
  'fj', 'fi', 'fr', 'pf', 'ga', 'gm', 'ge', 'de', 'gh', 'gi', 
  'gr', 'gd', 'gt', 'gn', 'gy', 'ht', 'hn', 'hk', 'hu', 'is', 
  'in', 'id', 'ir', 'iq', 'ie', 'il', 'it', 'ci', 'jm', 'jp', 
  'je', 'jo', 'kz', 'ke', 'ki', 'xk', 'kw', 'kg', 'la', 'lv', 
  'lb', 'ls', 'lr', 'ly', 'li', 'lt', 'lu', 'mo', 'mk', 'mg', 
  'mw', 'my', 'mv', 'ml', 'mt', 'mh', 'mr', 'mu', 'mx', 'fm', 
  'md', 'mc', 'mn', 'me', 'ma', 'mz', 'mm', 'na', 'nr', 'np', 
  'nl', 'nc', 'nz', 'ni', 'ne', 'ng', 'kp', 'no', 'om', 'pk', 
  'pw', 'ps', 'pa', 'pg', 'py', 'pe', 'ph', 'pl', 'pt', 'pr', 
  'qa', 'ro', 'ru', 'rw', 'lc', 'sx', 'ws', 'sm', 'st', 'sa', 
  'sn', 'rs', 'sc', 'sl', 'sg', 'sk', 'si', 'sb', 'so', 'za', 
  'kr', 'es', 'lk', 'sd', 'sr', 'se', 'ch', 'sy', 'tw', 'tj', 
  'tz', 'th', 'tl', 'tg', 'to', 'tt', 'tn', 'tr', 'tm', 'tv', 
  'ug', 'ua', 'ae', 'gb', 'us', 'uy', 'uz', 'vu', 'va', 've', 
  'vi', 'wo', 'ye', 'zm', 'zw'
];

// Map of country names to codes for reference
const COUNTRY_NAME_MAP = {
  'Afghanistan': 'af',
  'Albania': 'al',
  'Algeria': 'dz',
  'Andorra': 'ad',
  'Angola': 'ao',
  'Argentina': 'ar',
  'Armenia': 'am',
  'Australia': 'au',
  'Austria': 'at',
  'Azerbaijan': 'az',
  'Bahamas': 'bs',
  'Bahrain': 'bh',
  'Bangladesh': 'bd',
  'Barbados': 'bb',
  'Belarus': 'by',
  'Belgium': 'be',
  'Belize': 'bz',
  'Benin': 'bj',
  'Bermuda': 'bm',
  'Bhutan': 'bt',
  'Bolivia': 'bo',
  'Bosnia And Herzegovina': 'ba',
  'Botswana': 'bw',
  'Brazil': 'br',
  'Brunei': 'bn',
  'Bulgaria': 'bg',
  'Burkina fasco': 'bf',
  'Burundi': 'bi',
  'Cambodia': 'kh',
  'Cameroon': 'cm',
  'Canada': 'ca',
  'Cape Verde': 'cv',
  'Cayman Islands': 'ky',
  'Central African Republic': 'cf',
  'Chad': 'td',
  'Chile': 'cl',
  'China': 'cn',
  'Colombia': 'co',
  'Comoros': 'km',
  'Congo': 'cg',
  'Cook islands': 'ck',
  'Costa Rica': 'cr',
  'Croatia': 'hr',
  'Cuba': 'cu',
  'Curaçao': 'cw',
  'Cyprus': 'cy',
  'Czech republic': 'cz',
  'Denmark': 'dk',
  'Djibouti': 'dj',
  'Dominica': 'dm',
  'Dominican republic': 'do',
  'DR Congo': 'cd',
  'Ecuador': 'ec',
  'Egypt': 'eg',
  'El Salvador': 'sv',
  'Equatorial Guinea': 'gq',
  'Eritrea': 'er',
  'Estonia': 'ee',
  'Eswatini': 'sz',
  'Ethiopia': 'et',
  'Fiji': 'fj',
  'Finland': 'fi',
  'France': 'fr',
  'French polynesia': 'pf',
  'Gabon': 'ga',
  'Gambia': 'gm',
  'Georgia': 'ge',
  'Germany': 'de',
  'Ghana': 'gh',
  'Gibraltar': 'gi',
  'Greece': 'gr',
  'Grenada': 'gd',
  'Guatemala': 'gt',
  'Guinea': 'gn',
  'Guyana': 'gy',
  'Haiti': 'ht',
  'Honduras': 'hn',
  'Hong kong': 'hk',
  'Hungary': 'hu',
  'Iceland': 'is',
  'India': 'in',
  'Indonesia': 'id',
  'Iran': 'ir',
  'Iraq': 'iq',
  'Ireland': 'ie',
  'Israel': 'il',
  'Italy': 'it',
  'Ivory Coast': 'ci',
  'Jamaica': 'jm',
  'Japan': 'jp',
  'Jersey': 'je',
  'Jordan': 'jo',
  'Kazakhstan': 'kz',
  'Kenya': 'ke',
  'Kiribati': 'ki',
  'Kosovo': 'xk',
  'Kuwait': 'kw',
  'Kyrgyzstan': 'kg',
  'Laos': 'la',
  'Latvia': 'lv',
  'Lebanon': 'lb',
  'Lesotho': 'ls',
  'Liberia': 'lr',
  'Libya': 'ly',
  'Liechtenstein': 'li',
  'Lithuania': 'lt',
  'Luxembourg': 'lu',
  'Macau': 'mo',
  'Macedonia': 'mk',
  'Madagascar': 'mg',
  'Malawi': 'mw',
  'Malaysia': 'my',
  'Maldives': 'mv',
  'Mali': 'ml',
  'Malta': 'mt',
  'Marshall Islands': 'mh',
  'Mauritania': 'mr',
  'Mauritius': 'mu',
  'Mexico': 'mx',
  'Micronesia': 'fm',
  'Moldova': 'md',
  'Monaco': 'mc',
  'Mongolia': 'mn',
  'Montenegro': 'me',
  'Morocco': 'ma',
  'Mozambique': 'mz',
  'Myanmar': 'mm',
  'Namibia': 'na',
  'Nauru': 'nr',
  'Nepal': 'np',
  'Netherland': 'nl',
  'New caledonia': 'nc',
  'New zealand': 'nz',
  'Nicaragua': 'ni',
  'Niger': 'ne',
  'Nigeria': 'ng',
  'North korea': 'kp',
  'Norway': 'no',
  'Oman': 'om',
  'Pakistan': 'pk',
  'Palau': 'pw',
  'Palestine': 'ps',
  'Panama': 'pa',
  'Papua New Guinea': 'pg',
  'Paraguay': 'py',
  'Peru': 'pe',
  'Philippines': 'ph',
  'Poland': 'pl',
  'Portugal': 'pt',
  'Puerto rico': 'pr',
  'Qatar': 'qa',
  'Romania': 'ro',
  'Russia': 'ru',
  'Rwanda': 'rw',
  'Saint lucia': 'lc',
  'Saint martin(dutch)': 'sx',
  'Samoa': 'ws',
  'San Marino': 'sm',
  'Sao tome and principe': 'st',
  'Saudi arabia': 'sa',
  'Senegal': 'sn',
  'Serbia': 'rs',
  'Seychelles': 'sc',
  'Sierra Leone': 'sl',
  'Singapore': 'sg',
  'Slovakia': 'sk',
  'Slovenia': 'si',
  'Solomon Islands': 'sb',
  'Somalia': 'so',
  'South africa': 'za',
  'South korea': 'kr',
  'Spain': 'es',
  'Sri Lanka': 'lk',
  'Sudan': 'sd',
  'Suriname': 'sr',
  'Sweden': 'se',
  'Switzerland': 'ch',
  'Syria': 'sy',
  'Taiwan': 'tw',
  'Tajikistan': 'tj',
  'Tanzania': 'tz',
  'Thailand': 'th',
  'Timor-Leste': 'tl',
  'Togo': 'tg',
  'Tonga': 'to',
  'Trinidad and tobago': 'tt',
  'Tunisia': 'tn',
  'Turkey': 'tr',
  'Turkmenistan': 'tm',
  'Tuvalu': 'tv',
  'Uganda': 'ug',
  'Ukraine': 'ua',
  'United arab emirates': 'ae',
  'United kingdom': 'gb',
  'United states of america': 'us',
  'Uruguay': 'uy',
  'Uzbekistan': 'uz',
  'Vanuatu': 'vu',
  'Vatican': 'va',
  'Venezuela': 've',
  'Vietnam': 'vi',
  'Virgin Islands (British)': 'vg',
  'World': 'wo',
  'Yemen': 'ye',
  'Zambia': 'zm',
  'Zimbabwe': 'zw'
};

// Keep track of our current position in the country rotation
let currentCountryIndex = 0;

/**
 * Get the next batch of countries to use for news fetching
 * @param {number} batchSize - Number of countries to get (default: 5, max: 5 due to API limitations)
 * @returns {string} - Comma-separated string of country codes
 */
function getNextCountryBatch(batchSize = 5) {
  // Ensure batch size is within limits (NewsData API allows max 5 countries)
  const size = Math.min(batchSize, 5);
  
  // Get the next batch of countries
  const countryBatch = [];
  for (let i = 0; i < size; i++) {
    const index = (currentCountryIndex + i) % ALL_COUNTRY_CODES.length;
    countryBatch.push(ALL_COUNTRY_CODES[index]);
  }
  
  // Update the index for next time
  currentCountryIndex = (currentCountryIndex + size) % ALL_COUNTRY_CODES.length;
  
  return countryBatch.join(',');
}

/**
 * Reset the country rotation to start from the beginning
 */
function resetCountryRotation() {
  currentCountryIndex = 0;
}

/**
 * Get a country code by name
 * @param {string} countryName - Name of the country
 * @returns {string|null} - Country code or null if not found
 */
function getCountryCodeByName(countryName) {
  return COUNTRY_NAME_MAP[countryName] || null;
}

/**
 * Get total number of available countries
 * @returns {number} - Total number of countries
 */
function getTotalCountries() {
  return ALL_COUNTRY_CODES.length;
}

module.exports = {
  ALL_COUNTRY_CODES,
  COUNTRY_NAME_MAP,
  getNextCountryBatch,
  resetCountryRotation,
  getCountryCodeByName,
  getTotalCountries
}; 