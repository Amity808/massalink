import 'dotenv/config';
import {
    SmartContract,
    JsonRpcProvider,
    Args,
    bytesToStr,
} from '@massalabs/massa-web3';

const CONTRACT_ADDR = 'AS1iRAcZ97umpfGvgSn4x8xsusZf9yd2UwNZmkwbMWUaB4XhEvUk';

const provider = JsonRpcProvider.buildnet();
const contract = new SmartContract(provider, CONTRACT_ADDR);

const nameToCheck = 'Alice';
const args = new Args().addString(nameToCheck);

const result = await contract.read('isNameAvailable', args);
const isAvailable = bytesToStr(result.value);

if (isAvailable === 'true') {
    console.log(`✅ "${nameToCheck}" is available`);
} else {
    console.log(`❌ "${nameToCheck}" is taken`);
}

