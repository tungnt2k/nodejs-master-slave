/* eslint-disable no-use-before-define */
/* eslint-disable no-bitwise */
// eslint-disable-next-line import/no-import-module-exports
import * as sha3 from 'js-sha3';

/**
 * Keccak256 hash
 * @param data The data
 */
const keccak256 = (data) => {
  return `0x${sha3.keccak_256(toByteArray(data))}`;
};
/**
 * Adding padding to string on the left
 * @param value The value
 * @param chars The chars
 */
const padLeft = (value, chars) => {
  const hasPrefix = /^0x/i.test(value) || typeof value === 'number';
  value = value.toString().replace(/^0x/i, '');
  const padding = chars - value.length + 1 >= 0 ? chars - value.length + 1 : 0;
  return (hasPrefix ? '0x' : '') + new Array(padding).join('0') + value;
};
/**
 * Convert bytes to hex
 * @param bytes The bytes
 */
const bytesToHex = (bytes) => {
  const hex = [];
  for (let i = 0; i < bytes.length; i += 1) {
    hex.push((bytes[i] >>> 4).toString(16));
    hex.push((bytes[i] & 0xf).toString(16));
  }
  return `0x${hex.join('').replace(/^0+/, '')}`;
};
/**
 * To byte array
 * @param value The value
 */
const toByteArray = (value) => {
  if (value == null) {
    throw new Error('cannot convert null value to array');
  }
  if (typeof value === 'string') {
    const match = value.match(/^(0x)?[0-9a-fA-F]*$/);
    if (!match) {
      throw new Error('invalid hexidecimal string');
    }
    if (match[1] !== '0x') {
      throw new Error('hex string must have 0x prefix');
    }
    value = value.substring(2);
    if (value.length % 2) {
      value = `0${value}`;
    }
    const result = [];
    for (let i = 0; i < value.length; i += 2) {
      result.push(parseInt(value.substr(i, 2), 16));
    }
    return new Uint8Array(result);
  }
  if (isByteArray(value)) {
    return new Uint8Array(value);
  }
  throw new Error('invalid arrayify value');
};

/**
 * Is byte array
 * @param value The value
 */
const isByteArray = (value) => {
  // eslint-disable-next-line radix
  if (!value || parseInt(String(value.length)) !== value.length || typeof value === 'string') {
    return false;
  }
  for (let i = 0; i < value.length; i += 1) {
    const v = value[i];
    // eslint-disable-next-line radix
    if (v < 0 || v >= 256 || parseInt(String(v)) !== v) {
      return false;
    }
  }
  return true;
};
/**
 * Add slice to array
 * @param array The array
 */
// const addSlice = (array) => {
//   if (array.slice !== undefined) {
//     return array;
//   }
//   array.slice = () => {
//     const args = Array.prototype.slice.call(arguments);
//     return addSlice(new Uint8Array(Array.prototype.slice.apply(array, args)));
//   };
//   return array;
// };

/**
 * Returns true if the bloom is a valid bloom
 * @param bloom The bloom
 */
const isBloom = (bloom) => {
  if (typeof bloom !== 'string') {
    return false;
  }
  if (!/^(0x)?[0-9a-f]{512}$/i.test(bloom)) {
    return false;
  }
  if (/^(0x)?[0-9a-f]{512}$/.test(bloom) || /^(0x)?[0-9A-F]{512}$/.test(bloom)) {
    return true;
  }
  return false;
};
/**
 * Returns true if the value is part of the given bloom
 * note: false positives are possible.
 * @param bloom encoded bloom
 * @param value The value
 */

const setInBloom = (bloom, value) => {
  if (typeof value === 'object' && value.constructor === Uint8Array) {
    value = bytesToHex(value);
  }
  const hash = keccak256(value).replace('0x', '');
  for (let i = 0; i < 12; i += 4) {
    // calculate bit position in bloom filter that must be active
    const bitpos = ((parseInt(hash.substr(i, 2), 16) << 8) + parseInt(hash.substr(i + 2, 2), 16)) & 2047;
    // test if bitpos in bloom is active
    const charPos = bloom.length - 1 - Math.floor(bitpos / 4);
    const codePoint = bloom.charCodeAt(charPos);
    let code = codePointToInt(codePoint);
    const offset = 1 << bitpos % 4;
    code |= offset;

    const a = bloom.split('');

    let newCodePoint = intToCodePoint(code);
    if (codePoint >= 65 && codePoint <= 70) {
      newCodePoint += 32;
    }
    a[charPos] = String.fromCharCode(newCodePoint);

    bloom = a.join('');
  }
  return bloom;
};

const isInBloom = (bloom, value) => {
  if (typeof value === 'object' && value.constructor === Uint8Array) {
    value = bytesToHex(value);
  }
  const hash = keccak256(value).replace('0x', '');
  for (let i = 0; i < 12; i += 4) {
    // calculate bit position in bloom filter that must be active
    const bitpos = ((parseInt(hash.substr(i, 2), 16) << 8) + parseInt(hash.substr(i + 2, 2), 16)) & 2047;
    // test if bitpos in bloom is active
    const code = codePointToInt(bloom.charCodeAt(bloom.length - 1 - Math.floor(bitpos / 4)));
    const offset = 1 << bitpos % 4;
    if ((code & offset) !== offset) {
      return false;
    }
  }
  return true;
};
/**
 * Code points to int
 * @param codePoint The code point
 */
const codePointToInt = (codePoint) => {
  if (codePoint >= 48 && codePoint <= 57) {
    /* ['0'..'9'] -> [0..9] */
    return codePoint - 48;
  }
  if (codePoint >= 65 && codePoint <= 70) {
    /* ['A'..'F'] -> [10..15] */
    return codePoint - 55;
  }
  if (codePoint >= 97 && codePoint <= 102) {
    /* ['a'..'f'] -> [10..15] */
    return codePoint - 87;
  }
  throw new Error('invalid bloom');
};

const intToCodePoint = (int) => {
  if (int >= 10 && int <= 15) {
    return 87 + int;
  }
  if (int >= 0 && int < 10) {
    return 48 + int;
  }
};

/**
 * Returns true if the ethereum users address is part of the given bloom.
 * note: false positives are possible.
 * @param bloom encoded bloom
 * @param address the address to test
 */
const isUserEthereumAddressInBloom = (bloom, ethereumAddress) => {
  if (!isBloom(bloom)) {
    throw new Error('Invalid bloom given');
  }
  if (!isAddress(ethereumAddress)) {
    throw new Error(`Invalid ethereum address given: "${ethereumAddress}"`);
  }
  // you have to pad the ethereum address to 32 bytes
  // else the bloom filter does not work
  // this is only if your matching the USERS
  // ethereum address. Contract address do not need this
  // hence why we have 2 methods
  // (0x is not in the 2nd parameter of padleft so 64 chars is fine)
  const address = padLeft(ethereumAddress, 64);
  return isInBloom(bloom, address);
};
/**
 * Returns true if the contract address is part of the given bloom.
 * note: false positives are possible.
 * @param bloom encoded bloom
 * @param contractAddress the contract address to test
 */
const isContractAddressInBloom = (bloom, contractAddress) => {
  if (!isBloom(bloom)) {
    throw new Error('Invalid bloom given');
  }
  if (!isAddress(contractAddress)) {
    throw new Error(`Invalid contract address given: "${contractAddress}"`);
  }
  return isInBloom(bloom, contractAddress);
};
/**
 * Returns true if the topic is part of the given bloom.
 * note: false positives are possible.
 * @param bloom encoded bloom
 * @param topic the topic encoded hex
 */
const isTopicInBloom = (bloom, topic) => {
  if (!isBloom(bloom)) {
    throw new Error('Invalid bloom given');
  }
  if (!isTopic(topic)) {
    throw new Error('Invalid topic');
  }
  return isInBloom(bloom, topic);
};

const setTopicInBloom = (bloom, topic) => {
  if (!isBloom(bloom)) {
    throw new Error('Invalid bloom given');
  }
  if (!isTopic(topic)) {
    throw new Error('Invalid topic');
  }
  return setInBloom(bloom, topic);
};

/**
 * Checks if its a valid topic
 * @param topic encoded hex topic
 */
const isTopic = (topic) => {
  if (typeof topic !== 'string') {
    return false;
  }
  if (!/^(0x)?[0-9a-f]{64}$/i.test(topic)) {
    return false;
  }
  if (/^(0x)?[0-9a-f]{64}$/.test(topic) || /^(0x)?[0-9A-F]{64}$/.test(topic)) {
    return true;
  }
  return false;
};

/**
 * Is valid address
 * @param address The address
 */
const isAddress = (address) => {
  if (typeof address !== 'string') {
    return false;
  }
  if (address.match(/^(0x)?[0-9a-fA-F]{40}$/)) {
    return true;
  }
  if (address.match(/^XE[0-9]{2}[0-9A-Za-z]{30,31}$/)) {
    return true;
  }
  return false;
};

export {
  intToCodePoint,
  setInBloom,
  setTopicInBloom,
  isBloom,
  isAddress,
  isByteArray,
  isContractAddressInBloom,
  isInBloom,
  isTopic,
  isUserEthereumAddressInBloom,
};
