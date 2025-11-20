import 'dotenv/config';
import {
    Account,
    SmartContract,
    JsonRpcProvider,
    bytesToStr,
} from '@massalabs/massa-web3';

const CONTRACT_ADDR = 'AS1iRAcZ97umpfGvgSn4x8xsusZf9yd2UwNZmkwbMWUaB4XhEvUk';

const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet(account);
const contract = new SmartContract(provider, CONTRACT_ADDR);

const balanceResult = await contract.read('getBalance');
const balance = bytesToStr(balanceResult.value);
console.log(`Balance: ${balance} nanoMAS`);

if (parseInt(balance) > 0) {
    await contract.call('withdraw');
    console.log('Withdrawn!');
} else {
    console.log('No balance.');
}

