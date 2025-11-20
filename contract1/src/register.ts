import 'dotenv/config';
import {
    Account,
    Args,
    Mas,
    SmartContract,
    JsonRpcProvider,
} from '@massalabs/massa-web3';

const CONTRACT_ADDR = 'AS1iRAcZ97umpfGvgSn4x8xsusZf9yd2UwNZmkwbMWUaB4XhEvUk';

const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet(account);
const contract = new SmartContract(provider, CONTRACT_ADDR);

const name = 'Alice';
const args = new Args().addString(name);

console.log(`Registering name: ${name}...`);
const storageFee = Mas.fromString('0.02');
await contract.call('register', args, { coins: storageFee });
console.log(`Successfully registered as ${name}!`);

